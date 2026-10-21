import { Router } from 'express';
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

authRouter.post('/admin/login', authLimiter, validate(adminLoginSchema), (req, res, next) => authController.adminLogin(req, res, next));
authRouter.post('/hs/google', authLimiter, validate(hsGoogleLoginSchema), (req, res, next) => authController.hsGoogleLogin(req, res, next));
authRouter.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refresh(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
authRouter.put('/profile', authenticate, validate(updateProfileSchema), (req, res, next) => authController.updateProfile(req, res, next));
authRouter.get('/users', authenticate, requireRole('admin'), (req, res, next) =>
  authController.listHsUsers(req, res, next)
);
authRouter.put('/users/:userId/status', authenticate, requireRole('admin'), (req, res, next) =>
  authController.updateUserStatus(req, res, next)
);
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
