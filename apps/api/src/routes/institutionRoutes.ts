import { Router, Request, Response, NextFunction } from 'express';
import { institutionController } from '../controllers/institutionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  joinInstitutionSchema,
  setDefaultScheduleRecordSchema,
  updateNotificationPreferencesSchema
} from '../validators/institutionValidators.js';

export const institutionRouter = Router();

// HS endpoints
institutionRouter.post(
  '/join',
  authenticate,
  requireRole('hs'),
  validate(joinInstitutionSchema),
  (req: Request, res: Response, next: NextFunction) => institutionController.joinByCode(req, res, next)
);

institutionRouter.get(
  '/my-membership',
  authenticate,
  requireRole('hs'),
  (req: Request, res: Response, next: NextFunction) => institutionController.getMyMembership(req, res, next)
);

institutionRouter.post(
  '/:institutionId/default-schedule',
  authenticate,
  requireRole('hs'),
  validate(setDefaultScheduleRecordSchema),
  (req: Request, res: Response, next: NextFunction) => institutionController.setDefaultSchedule(req, res, next)
);

institutionRouter.put(
  '/:institutionId/notification-preferences',
  authenticate,
  requireRole('hs'),
  validate(updateNotificationPreferencesSchema),
  (req: Request, res: Response, next: NextFunction) => institutionController.updateNotificationPreferences(req, res, next)
);

institutionRouter.post(
  '/:institutionId/leave',
  authenticate,
  requireRole('hs'),
  (req: Request, res: Response, next: NextFunction) => institutionController.leaveInstitution(req, res, next)
);

// Admin endpoints
institutionRouter.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createInstitutionSchema),
  (req: Request, res: Response, next: NextFunction) => institutionController.create(req, res, next)
);

institutionRouter.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.getStats(req, res, next)
);

institutionRouter.get(
  '/',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.list(req, res, next)
);

institutionRouter.get(
  '/:id',
  authenticate,
  requireRole('admin', 'hs'),
  (req: Request, res: Response, next: NextFunction) => institutionController.getById(req, res, next)
);

institutionRouter.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateInstitutionSchema),
  (req: Request, res: Response, next: NextFunction) => institutionController.update(req, res, next)
);

institutionRouter.post(
  '/:id/rotate-code',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.rotateAccessCode(req, res, next)
);

institutionRouter.post(
  '/:id/revoke-code',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.revokeAccessCode(req, res, next)
);

institutionRouter.put(
  '/:id/toggle-joining',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.toggleAllowNewJoinees(req, res, next)
);

institutionRouter.get(
  '/:id/members',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.listMembers(req, res, next)
);

institutionRouter.delete(
  '/:id/members/:membershipId',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.removeMember(req, res, next)
);

// Bulk Import Routes
institutionRouter.post(
  '/:id/bulk-import/preview',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.previewBulkImport(req, res, next)
);

institutionRouter.post(
  '/:id/bulk-import/confirm',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => institutionController.executeBulkImport(req, res, next)
);
