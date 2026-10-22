import { Router, Request, Response, NextFunction } from 'express';
import { departmentController } from '../controllers/departmentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/departmentValidators.js';

export const departmentRouter = Router();

departmentRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) =>
  departmentController.list(req, res, next)
);

departmentRouter.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createDepartmentSchema),
  (req: Request, res: Response, next: NextFunction) => departmentController.create(req, res, next)
);

departmentRouter.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateDepartmentSchema),
  (req: Request, res: Response, next: NextFunction) => departmentController.update(req, res, next)
);

departmentRouter.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => departmentController.archive(req, res, next)
);
