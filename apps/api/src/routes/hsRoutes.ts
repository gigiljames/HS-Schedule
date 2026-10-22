import { Router, Request, Response, NextFunction } from 'express';
import { hsScheduleController } from '../controllers/hsScheduleController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const hsRouter = Router();

hsRouter.get(
  '/my-schedule',
  authenticate,
  requireRole('hs'),
  (req: Request, res: Response, next: NextFunction) => hsScheduleController.getMySchedule(req, res, next)
);

hsRouter.get(
  '/directory',
  authenticate,
  requireRole('hs'),
  (req: Request, res: Response, next: NextFunction) => hsScheduleController.searchDirectory(req, res, next)
);

hsRouter.get(
  '/snapshot',
  authenticate,
  requireRole('hs'),
  (req: Request, res: Response, next: NextFunction) => hsScheduleController.getSnapshot(req, res, next)
);
