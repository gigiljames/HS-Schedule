import { Router } from 'express';
import { scheduleController } from '../controllers/scheduleController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPlanSchema,
  createVersionSchema,
  createTrackSchema,
  createPeriodSchema,
  updateCellSchema,
  previewScheduleSchema
} from '../validators/scheduleValidators.js';

export const scheduleRouter = Router();

// Plans
scheduleRouter.get('/plans', authenticate, (req, res, next) => scheduleController.listPlans(req, res, next));
scheduleRouter.post('/plans', authenticate, requireRole('admin'), validate(createPlanSchema), (req, res, next) =>
  scheduleController.createPlan(req, res, next)
);
scheduleRouter.delete('/plans/:planId', authenticate, requireRole('admin'), (req, res, next) =>
  scheduleController.deletePlan(req, res, next)
);

// Versions
scheduleRouter.get('/plans/:planId/versions', authenticate, (req, res, next) =>
  scheduleController.listVersions(req, res, next)
);
scheduleRouter.post(
  '/plans/:planId/versions',
  authenticate,
  requireRole('admin'),
  validate(createVersionSchema),
  (req, res, next) => scheduleController.createVersion(req, res, next)
);
scheduleRouter.get('/versions/:versionId', authenticate, (req, res, next) =>
  scheduleController.getVersion(req, res, next)
);

// Tracks
scheduleRouter.post(
  '/versions/:versionId/tracks',
  authenticate,
  requireRole('admin'),
  validate(createTrackSchema),
  (req, res, next) => scheduleController.createTrack(req, res, next)
);
scheduleRouter.delete('/tracks/:trackId', authenticate, requireRole('admin'), (req, res, next) =>
  scheduleController.deleteTrack(req, res, next)
);

// Periods
scheduleRouter.post(
  '/versions/:versionId/periods',
  authenticate,
  requireRole('admin'),
  validate(createPeriodSchema),
  (req, res, next) => scheduleController.createPeriod(req, res, next)
);
scheduleRouter.delete('/periods/:periodId', authenticate, requireRole('admin'), (req, res, next) =>
  scheduleController.deletePeriod(req, res, next)
);

// Matrix
scheduleRouter.get('/versions/:versionId/matrix', authenticate, (req, res, next) =>
  scheduleController.getMatrix(req, res, next)
);
scheduleRouter.put(
  '/versions/:versionId/cell',
  authenticate,
  requireRole('admin'),
  validate(updateCellSchema),
  (req, res, next) => scheduleController.updateMatrixCell(req, res, next)
);

// Preview & Publish
scheduleRouter.get(
  '/versions/:versionId/preview',
  authenticate,
  validate(previewScheduleSchema),
  (req, res, next) => scheduleController.previewResolved(req, res, next)
);
scheduleRouter.post('/versions/:versionId/publish', authenticate, requireRole('admin'), (req, res, next) =>
  scheduleController.publish(req, res, next)
);

// Schedule Matrix Bulk Import (into an existing version or brand new plan)
scheduleRouter.post(
  '/versions/:versionId/bulk-import/preview',
  authenticate,
  requireRole('admin'),
  (req, res, next) => scheduleController.bulkImportPreview(req, res, next)
);
scheduleRouter.post(
  '/versions/:versionId/bulk-import/apply',
  authenticate,
  requireRole('admin'),
  (req, res, next) => scheduleController.bulkImportApply(req, res, next)
);

scheduleRouter.post(
  '/bulk-import/preview',
  authenticate,
  requireRole('admin'),
  (req, res, next) => scheduleController.bulkImportPreview(req, res, next)
);
scheduleRouter.post(
  '/bulk-import/apply',
  authenticate,
  requireRole('admin'),
  (req, res, next) => scheduleController.bulkImportApply(req, res, next)
);

