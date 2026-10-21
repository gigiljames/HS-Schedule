import { Router } from 'express';
import { batchController } from '../controllers/batchController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBatchSchema, updateBatchSchema } from '../validators/batchValidators.js';

export const batchRouter = Router();

batchRouter.get('/tree', authenticate, (req, res, next) => batchController.getTree(req, res, next));
batchRouter.get('/all', authenticate, (req, res, next) => batchController.listAll(req, res, next));

batchRouter.post('/', authenticate, requireRole('admin'), validate(createBatchSchema), (req, res, next) =>
  batchController.create(req, res, next)
);

batchRouter.put('/:id', authenticate, requireRole('admin'), validate(updateBatchSchema), (req, res, next) =>
  batchController.update(req, res, next)
);

batchRouter.delete('/:id', authenticate, requireRole('admin'), (req, res, next) =>
  batchController.delete(req, res, next)
);
