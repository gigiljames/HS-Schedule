import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/userRepository.js';
import { AuthSessionModel } from '../models/AuthSession.js';
import { InstitutionMembershipModel } from '../models/InstitutionMembership.js';
import { comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { IAuthTokens, IUser } from '../shared/index.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthService {
  /**
   * Admin username/password authentication
   */
  async adminLogin(username: string, password: string, clientMeta?: { userAgent?: string; ip?: string }): Promise<IAuthTokens> {
    const user = await userRepository.findByUsername(username);
    if (!user || user.role !== 'admin' || user.status !== 'active') {
      throw new Error('Invalid administrator credentials');
    }

    if (!user.passwordHash) {
      throw new Error('Administrator account password is not configured');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid administrator credentials');
    }

    return this.generateTokensForUser(user, clientMeta);
  }

  /**
   * House Surgeon Google ID Token verification via google-auth-library
   */
  async hsGoogleLogin(idToken: string, clientMeta?: { userAgent?: string; ip?: string }): Promise<IAuthTokens> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google token payload');
    }

    const googleSubjectId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const displayName = payload.name || payload.email.split('@')[0];

    // Find or create HS account
    let user = await userRepository.findByGoogleSubjectId(googleSubjectId);
    if (!user) {
      user = await userRepository.findByEmail(email);
      if (user) {
        // Link Google Subject ID
        user.googleSubjectId = googleSubjectId;
        await user.save();
      } else {
        user = await userRepository.createUser({
          role: 'hs',
          email,
          displayName,
          googleSubjectId,
          status: 'active'
        });
      }
    }

    if (user.status === 'blocked' || user.status === 'suspended') {
      throw new Error('Your account has been blocked by the administrator.');
    }

    return this.generateTokensForUser(user, clientMeta);
  }

  async updateUserStatus(userId: string, status: 'active' | 'blocked'): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    user.status = status;
    await user.save();

    // If blocked, immediately revoke any existing active refresh sessions
    if (status === 'blocked') {
      await AuthSessionModel.updateMany({ userId: user._id }, { $set: { isRevoked: true } });
    }

    return this.toUserDto(user);
  }

  async listHsUsers(query: { search?: string; page?: number; pageSize?: number }) {
    const { items, total } = await userRepository.listHsUsers(query);
    const userIds = items.map((u) => u._id);
    const memberships = await InstitutionMembershipModel.find({ userId: { $in: userIds } })
      .populate('institutionId', 'name')
      .populate('defaultScheduleRecordId', 'name');

    const membershipMap = new Map<string, any>();
    for (const m of memberships) {
      membershipMap.set(m.userId.toString(), m);
    }

    const resultItems = items.map((u) => {
      const m = membershipMap.get(u._id.toString());
      return {
        id: u._id.toString(),
        userId: u._id.toString(),
        displayName: u.displayName,
        email: u.email,
        status: u.status,
        accountStatus: u.status,
        institutionName: m?.institutionId?.name || 'Not Enrolled',
        institutionId: m?.institutionId?._id?.toString() || null,
        defaultProfile: m?.defaultScheduleRecordId?.name || 'Not Selected',
        membershipStatus: m?.status || 'none',
        createdAt: u.createdAt
      };
    });

    return { items: resultItems, total };
  }

  toUserDto(user: any): IUser {
    return {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      status: user.status,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt
    };
  }

  /**
   * Refreshes access token and rotates refresh session
   */
  async refreshSession(refreshToken: string, clientMeta?: { userAgent?: string; ip?: string }): Promise<IAuthTokens> {
    const payload = verifyRefreshToken(refreshToken);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await AuthSessionModel.findOne({ refreshTokenHash, isRevoked: false });
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh session');
    }

    // Revoke old session (Rotation)
    session.isRevoked = true;
    await session.save();

    const user = await userRepository.findById(payload.userId);
    if (!user || user.status !== 'active') {
      throw new Error('User account not found or suspended');
    }

    return this.generateTokensForUser(user, clientMeta);
  }

  /**
   * Logs out user by revoking refresh token session
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await AuthSessionModel.updateOne({ refreshTokenHash }, { $set: { isRevoked: true } });
    } catch {
      // Ignore token decode errors on logout
    }
  }

  private async generateTokensForUser(user: any, clientMeta?: { userAgent?: string; ip?: string }): Promise<IAuthTokens> {
    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Save refresh session in DB (upsert avoids duplicate key collisions)
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await AuthSessionModel.findOneAndUpdate(
      { refreshTokenHash },
      {
        userId: user._id,
        refreshTokenHash,
        userAgent: clientMeta?.userAgent,
        ipAddress: clientMeta?.ip,
        isRevoked: false,
        expiresAt
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const userDto: IUser = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
      user: userDto
    };
  }
}

export const authService = new AuthService();
