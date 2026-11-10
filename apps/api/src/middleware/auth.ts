import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UserModel } from '../models/User.js';
import { IJwtPayload, UserRole } from '../shared/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);

    // Atomically update lastActiveAt in MongoDB and select user status
    const userDoc = await UserModel.findByIdAndUpdate(
      payload.userId,
      { $set: { lastActiveAt: new Date() } },
      { new: true }
    ).select('status');

    if (!userDoc) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (userDoc.status === 'blocked' || userDoc.status === 'suspended') {
      res.status(403).json({ success: false, message: 'Your account has been blocked by the administrator.' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}
