import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  adminLoginSchema,
  hsGoogleLoginSchema,
  refreshTokenSchema,
  updateProfileSchema
} from '../validators/authValidators.js';

export const authRouter = Router();

authRouter.post('/admin/login', authLimiter, validate(adminLoginSchema), (req: Request, res: Response, next: NextFunction) =>
  authController.adminLogin(req, res, next)
);
authRouter.post('/hs/google', authLimiter, validate(hsGoogleLoginSchema), (req: Request, res: Response, next: NextFunction) =>
  authController.hsGoogleLogin(req, res, next)
);
authRouter.post('/refresh', validate(refreshTokenSchema), (req: Request, res: Response, next: NextFunction) =>
  authController.refresh(req, res, next)
);
authRouter.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) =>
  authController.me(req, res, next)
);
authRouter.put('/profile', authenticate, validate(updateProfileSchema), (req: Request, res: Response, next: NextFunction) =>
  authController.updateProfile(req, res, next)
);
authRouter.get('/users', authenticate, requireRole('admin'), (req: Request, res: Response, next: NextFunction) =>
  authController.listHsUsers(req, res, next)
);
authRouter.put('/users/:userId/status', authenticate, requireRole('admin'), (req: Request, res: Response, next: NextFunction) =>
  authController.updateUserStatus(req, res, next)
);
authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) =>
  authController.logout(req, res, next)
);
