import { Router, Request, Response, NextFunction } from 'express';
import { rosterController } from '../controllers/rosterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRosterSchema, updateRosterSchema } from '../validators/rosterValidators.js';

export const rosterRouter = Router();

rosterRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) =>
  rosterController.list(req, res, next)
);
rosterRouter.get('/:id', authenticate, (req: Request, res: Response, next: NextFunction) =>
  rosterController.getById(req, res, next)
);

rosterRouter.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createRosterSchema),
  (req: Request, res: Response, next: NextFunction) => rosterController.create(req, res, next)
);

rosterRouter.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateRosterSchema),
  (req: Request, res: Response, next: NextFunction) => rosterController.update(req, res, next)
);

rosterRouter.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => rosterController.delete(req, res, next)
);
