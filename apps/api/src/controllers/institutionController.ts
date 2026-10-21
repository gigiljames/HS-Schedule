import { Request, Response, NextFunction } from 'express';
import { institutionService } from '../services/institutionService.js';
import { institutionRepository } from '../repositories/institutionRepository.js';
import { bulkImportService } from '../services/bulkImportService.js';

export class InstitutionController {
  // Admin endpoints
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await institutionService.createInstitution(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

      const result = await institutionService.listInstitutions({ search, page, pageSize });
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institution = await institutionService.getInstitutionById(req.params.id as string);
      res.json({
        success: true,
        data: institution
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institution = await institutionService.updateInstitution(req.params.id as string, req.body);
      res.json({
        success: true,
        data: institution
      });
    } catch (err) {
      next(err);
    }
  }

  async rotateAccessCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await institutionService.rotateAccessCode(req.params.id as string);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeAccessCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await institutionService.revokeAccessCode(req.params.id as string);
      res.json({
        success: true,
        message: 'Institution access code revoked successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await institutionService.getGlobalStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;
      const search = req.query.search as string | undefined;
      const result = await institutionRepository.listMembershipsByInstitution(req.params.id as string, { page, pageSize, search });
      const items = result.items.map((m: any) => ({
        id: m._id.toString(),
        userId: m.userId ? {
          id: (m.userId._id || m.userId).toString(),
          displayName: m.userId.displayName || 'Unknown',
          email: m.userId.email || 'N/A',
          status: m.userId.status || 'active'
        } : null,
        institutionId: m.institutionId.toString(),
        status: m.status,
        defaultScheduleRecordId: m.defaultScheduleRecordId ? {
          id: (m.defaultScheduleRecordId._id || m.defaultScheduleRecordId).toString(),
          name: m.defaultScheduleRecordId.name
        } : null,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }));
      res.json({
        success: true,
        data: {
          items,
          total: result.total
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await institutionService.removeMember(req.params.id as string, req.params.membershipId as string);
      res.json({
        success: true,
        message: 'House surgeon account removed from institution successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleAllowNewJoinees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { allowNewJoinees } = req.body;
      const institution = await institutionService.toggleAllowNewJoinees(req.params.id as string, Boolean(allowNewJoinees));
      res.json({
        success: true,
        data: institution
      });
    } catch (err) {
      next(err);
    }
  }

  // HS endpoints
  async joinByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { accessCode } = req.body;
      const result = await institutionService.joinByAccessCode(userId, accessCode);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await institutionService.getActiveMembership(userId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const institutionId = req.params.institutionId as string;
      const { rosterRecordId } = req.body;
      const membership = await institutionService.setDefaultScheduleProfile(userId, institutionId, rosterRecordId);
      res.json({
        success: true,
        data: membership
      });
    } catch (err) {
      next(err);
    }
  }

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const institutionId = req.params.institutionId as string;
      const membership = await institutionService.updateNotificationPreferences(userId, institutionId, req.body);
      res.json({
        success: true,
        data: membership
      });
    } catch (err) {
      next(err);
    }
  }

  async leaveInstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const institutionId = req.params.institutionId as string;
      await institutionService.leaveInstitution(userId, institutionId);
      res.json({
        success: true,
        message: 'You have left the institution'
      });
    } catch (err) {
      next(err);
    }
  }

  // Bulk Import endpoints
  async previewBulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = (req.params.id || req.params.institutionId) as string;
      const preview = await bulkImportService.validateAndPreview(institutionId, req.body);
      res.json({
        success: true,
        data: preview
      });
    } catch (err) {
      next(err);
    }
  }

  async executeBulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = (req.params.id || req.params.institutionId) as string;
      const result = await bulkImportService.executeImport(institutionId, req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export const institutionController = new InstitutionController();
