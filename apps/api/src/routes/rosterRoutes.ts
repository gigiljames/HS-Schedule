import { Router } from 'express';
import { rosterController } from '../controllers/rosterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRosterSchema, updateRosterSchema } from '../validators/rosterValidators.js';

export const rosterRouter = Router();

rosterRouter.get('/', authenticate, (req, res, next) => rosterController.list(req, res, next));
rosterRouter.get('/:id', authenticate, (req, res, next) => rosterController.getById(req, res, next));

rosterRouter.post('/', authenticate, requireRole('admin'), validate(createRosterSchema), (req, res, next) =>
  rosterController.create(req, res, next)
);

rosterRouter.put('/:id', authenticate, requireRole('admin'), validate(updateRosterSchema), (req, res, next) =>
  rosterController.update(req, res, next)
);

rosterRouter.delete('/:id', authenticate, requireRole('admin'), (req, res, next) =>
  rosterController.delete(req, res, next)
);
