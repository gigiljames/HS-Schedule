import { Request, Response, NextFunction } from 'express';
import { batchService } from '../services/batchService.js';

export class BatchController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await batchService.createBatch(req.body);
      res.status(201).json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = req.query.institutionId as string;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId query param required' });
        return;
      }
      const tree = await batchService.getBatchTree(institutionId);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = req.query.institutionId as string;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId query param required' });
        return;
      }
      const batches = await batchService.getAllBatches(institutionId);
      res.json({ success: true, data: batches });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await batchService.updateBatch(req.params.id as string, req.body);
      res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await batchService.deleteBatch(req.params.id as string);
      res.json({ success: true, message: 'Batch deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const batchController = new BatchController();
