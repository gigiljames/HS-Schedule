import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService.js';
import { vapidPublicKey } from '../config/vapid.js';
import { institutionRepository } from '../repositories/institutionRepository.js';

export class NotificationController {
  async getPublicKey(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        vapidPublicKey
      }
    });
  }

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const membership = await institutionRepository.findActiveMembershipByUser(userId);
      if (!membership) {
        res.status(403).json({ success: false, message: 'Active membership required' });
        return;
      }

      const institutionId = (membership.institutionId as any)._id?.toString() || membership.institutionId.toString();
      const { endpoint, keys } = req.body;
      const userAgent = req.headers['user-agent'];

      await notificationService.registerSubscription(userId, institutionId, {
        endpoint,
        keys,
        userAgent
      });

      res.status(201).json({
        success: true,
        message: 'Push subscription registered successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { endpoint } = req.body;
      await notificationService.unregisterSubscription(endpoint);
      res.json({
        success: true,
        message: 'Push subscription removed successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
