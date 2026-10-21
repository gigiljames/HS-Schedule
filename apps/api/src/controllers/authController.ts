import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';

export class AuthController {
  async adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;
      const clientMeta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };
      const result = await authService.adminLogin(username, password, clientMeta);

      // Set refresh token as HttpOnly cookie
      if (result.refreshToken) {
        res.cookie('adminRefreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async hsGoogleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body;
      const clientMeta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };
      const result = await authService.hsGoogleLogin(idToken, clientMeta);

      if (result.refreshToken) {
        res.cookie('hsRefreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.hsRefreshToken ||
        req.cookies?.adminRefreshToken ||
        req.cookies?.refreshToken ||
        req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token missing' });
        return;
      }

      const clientMeta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };
      const result = await authService.refreshSession(refreshToken, clientMeta);

      if (result.refreshToken) {
        const cookieName = result.user.role === 'admin' ? 'adminRefreshToken' : 'hsRefreshToken';
        res.cookie(cookieName, result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthenticated' });
        return;
      }
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user._id.toString(),
          role: user.role,
          email: user.email,
          displayName: user.displayName,
          username: user.username,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthenticated' });
        return;
      }
      const { displayName } = req.body;
      const user = await userRepository.updateUser(req.user.userId, { displayName: displayName.trim() });
      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      if (!['active', 'blocked'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be active or blocked' });
        return;
      }
      const updatedUser = await authService.updateUserStatus(req.params.userId as string, status);
      res.json({ success: true, data: updatedUser });
    } catch (err) {
      next(err);
    }
  }

  async listHsUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;
      const search = req.query.search as string | undefined;
      const result = await authService.listHsUsers({ page, pageSize, search });
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.hsRefreshToken ||
        req.cookies?.adminRefreshToken ||
        req.cookies?.refreshToken ||
        req.body?.refreshToken;
      await authService.logout(refreshToken);
      res.clearCookie('hsRefreshToken', { path: '/' });
      res.clearCookie('adminRefreshToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
