import { Router, Request, Response, NextFunction } from 'express';
import { batchController } from '../controllers/batchController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBatchSchema, updateBatchSchema } from '../validators/batchValidators.js';

export const batchRouter = Router();

batchRouter.get('/tree', authenticate, (req: Request, res: Response, next: NextFunction) =>
  batchController.getTree(req, res, next)
);
batchRouter.get('/all', authenticate, (req: Request, res: Response, next: NextFunction) =>
  batchController.listAll(req, res, next)
);

batchRouter.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createBatchSchema),
  (req: Request, res: Response, next: NextFunction) => batchController.create(req, res, next)
);

batchRouter.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateBatchSchema),
  (req: Request, res: Response, next: NextFunction) => batchController.update(req, res, next)
);

batchRouter.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => batchController.delete(req, res, next)
);
