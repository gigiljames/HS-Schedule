import { Request, Response, NextFunction } from 'express';
import { scheduleService } from '../services/scheduleService.js';
import { scheduleMatrixBulkImportService } from '../services/scheduleMatrixBulkImportService.js';

export class ScheduleController {
  // Plans
  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await scheduleService.createPlan(req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = req.query.institutionId as string;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId query param required' });
        return;
      }
      const plans = await scheduleService.listPlans(institutionId);
      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await scheduleService.deletePlan(req.params.planId as string);
      res.json({ success: true, message: 'Schedule plan and all associated versions deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Versions
  async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const version = await scheduleService.createNewVersion(req.params.planId as string, req.body.notes);
      res.status(201).json({ success: true, data: version });
    } catch (err) {
      next(err);
    }
  }

  async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versions = await scheduleService.listVersions(req.params.planId as string);
      res.json({ success: true, data: versions });
    } catch (err) {
      next(err);
    }
  }

  async getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const version = await scheduleService.getVersion(req.params.versionId as string);
      res.json({ success: true, data: version });
    } catch (err) {
      next(err);
    }
  }

  // Tracks
  async createTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const track = await scheduleService.createTrack(req.params.versionId as string, req.body.name);
      res.status(201).json({ success: true, data: track });
    } catch (err) {
      next(err);
    }
  }

  async deleteTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await scheduleService.deleteTrack(req.params.trackId as string);
      res.json({ success: true, message: 'Track deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Periods
  async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trackId, startDate, endDate } = req.body;
      const period = await scheduleService.createPeriod(req.params.versionId as string, trackId, startDate, endDate);
      res.status(201).json({ success: true, data: period });
    } catch (err) {
      next(err);
    }
  }

  async deletePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await scheduleService.deletePeriod(req.params.periodId as string);
      res.json({ success: true, message: 'Period deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Matrix
  async getMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matrix = await scheduleService.getMatrix(req.params.versionId as string);
      res.json({ success: true, data: matrix });
    } catch (err) {
      next(err);
    }
  }

  async updateMatrixCell(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trackId, periodId, departmentId, batchNodeIds } = req.body;
      await scheduleService.updateMatrixCell({
        versionId: req.params.versionId as string,
        trackId,
        periodId,
        departmentId,
        batchNodeIds
      });
      res.json({ success: true, message: 'Cell assignments updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Preview & Publish
  async previewResolved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rosterRecordId = req.query.rosterRecordId as string;
      const fromDate = req.query.fromDate as string | undefined;
      const resolved = await scheduleService.previewResolvedSchedule(req.params.versionId as string, rosterRecordId, fromDate);
      res.json({ success: true, data: resolved });
    } catch (err) {
      next(err);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const published = await scheduleService.publishVersion(req.params.versionId as string);
      res.json({ success: true, data: published, message: 'Schedule published successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Schedule Matrix Bulk Import
  async bulkImportPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = req.params.versionId as string;
      const institutionId = req.body.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId is required in request body' });
        return;
      }
      const preview = await scheduleMatrixBulkImportService.validateAndPreview(
        institutionId,
        req.body,
        versionId
      );
      res.json({ success: true, data: preview });
    } catch (err) {
      next(err);
    }
  }

  async bulkImportApply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = req.params.versionId as string;
      const institutionId = req.body.institutionId;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId is required in request body' });
        return;
      }
      const result = await scheduleMatrixBulkImportService.apply(
        institutionId,
        req.body,
        versionId
      );
      res.json({ success: true, data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  }
}

export const scheduleController = new ScheduleController();
