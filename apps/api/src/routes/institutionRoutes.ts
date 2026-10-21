import { Router } from 'express';
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
institutionRouter.post('/join', authenticate, requireRole('hs'), validate(joinInstitutionSchema), (req, res, next) =>
  institutionController.joinByCode(req, res, next)
);

institutionRouter.get('/my-membership', authenticate, requireRole('hs'), (req, res, next) =>
  institutionController.getMyMembership(req, res, next)
);

institutionRouter.post(
  '/:institutionId/default-schedule',
  authenticate,
  requireRole('hs'),
  validate(setDefaultScheduleRecordSchema),
  (req, res, next) => institutionController.setDefaultSchedule(req, res, next)
);

institutionRouter.put(
  '/:institutionId/notification-preferences',
  authenticate,
  requireRole('hs'),
  validate(updateNotificationPreferencesSchema),
  (req, res, next) => institutionController.updateNotificationPreferences(req, res, next)
);

institutionRouter.post('/:institutionId/leave', authenticate, requireRole('hs'), (req, res, next) =>
  institutionController.leaveInstitution(req, res, next)
);

// Admin endpoints
institutionRouter.post('/', authenticate, requireRole('admin'), validate(createInstitutionSchema), (req, res, next) =>
  institutionController.create(req, res, next)
);

institutionRouter.get('/stats', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.getStats(req, res, next)
);

institutionRouter.get('/', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.list(req, res, next)
);

institutionRouter.get('/:id', authenticate, requireRole('admin', 'hs'), (req, res, next) =>
  institutionController.getById(req, res, next)
);

institutionRouter.put('/:id', authenticate, requireRole('admin'), validate(updateInstitutionSchema), (req, res, next) =>
  institutionController.update(req, res, next)
);

institutionRouter.post('/:id/rotate-code', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.rotateAccessCode(req, res, next)
);

institutionRouter.post('/:id/revoke-code', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.revokeAccessCode(req, res, next)
);

institutionRouter.put('/:id/toggle-joining', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.toggleAllowNewJoinees(req, res, next)
);

institutionRouter.get('/:id/members', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.listMembers(req, res, next)
);

institutionRouter.delete('/:id/members/:membershipId', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.removeMember(req, res, next)
);

// Bulk Import Routes
institutionRouter.post('/:id/bulk-import/preview', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.previewBulkImport(req, res, next)
);

institutionRouter.post('/:id/bulk-import/confirm', authenticate, requireRole('admin'), (req, res, next) =>
  institutionController.executeBulkImport(req, res, next)
);
