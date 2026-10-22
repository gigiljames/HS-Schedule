import { Router, Request, Response, NextFunction } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.get('/public-key', (req: Request, res: Response) =>
  notificationController.getPublicKey(req, res)
);
notificationRouter.post(
  '/subscribe',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => notificationController.subscribe(req, res, next)
);
notificationRouter.post(
  '/unsubscribe',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => notificationController.unsubscribe(req, res, next)
);
