import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.get('/public-key', (req, res) => notificationController.getPublicKey(req, res));
notificationRouter.post('/subscribe', authenticate, (req, res, next) => notificationController.subscribe(req, res, next));
notificationRouter.post('/unsubscribe', authenticate, (req, res, next) => notificationController.unsubscribe(req, res, next));
