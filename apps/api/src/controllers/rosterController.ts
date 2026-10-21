import { Request, Response, NextFunction } from 'express';
import { rosterService } from '../services/rosterService.js';

export class RosterController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await rosterService.createRosterRecord(req.body);
      res.status(201).json({
        success: true,
        data: result.record,
        message: result.warning
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = req.query.institutionId as string;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId query param required' });
        return;
      }

      const search = req.query.search as string | undefined;
      const batchNodeId = req.query.batchNodeId as string | undefined;
      const all = req.query.all === 'true';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25;

      const result = await rosterService.listRosterRecords(institutionId, { search, batchNodeId, page, pageSize, all });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await rosterService.getRosterRecord(req.params.id as string);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await rosterService.updateRosterRecord(req.params.id as string, req.body);
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await rosterService.deleteRosterRecord(req.params.id as string);
      res.json({ success: true, message: 'House surgeon removed from roster successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const rosterController = new RosterController();
