import { Request, Response, NextFunction } from 'express';
import { institutionRepository } from '../repositories/institutionRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { rosterRepository } from '../repositories/rosterRepository.js';
import { departmentRepository } from '../repositories/departmentRepository.js';
import { batchRepository } from '../repositories/batchRepository.js';
import { scheduleService } from '../services/scheduleService.js';
import {
  getTodayInKolkata,
  resolvePostingsForDate,
  resolveAgenda,
  compareDates,
  IDirectoryEntry,
  IPersonalSchedule,
} from '../shared/index.js';

export class HsScheduleController {
  // Personal schedule for Home screen
  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const membership = await institutionRepository.findActiveMembershipByUser(userId);

      if (!membership || !membership.institutionId) {
        res.status(403).json({ success: false, message: 'No active institution membership found' });
        return;
      }

      const institutionId = (membership.institutionId as any)._id?.toString() || membership.institutionId.toString();
      const institutionName = (membership.institutionId as any).name || 'Your Medical College';

      if (!membership.defaultScheduleRecordId) {
        res.json({
          success: true,
          data: {
            needsProfileSelection: true,
            institutionId,
            institutionName
          }
        });
        return;
      }

      const published = await scheduleRepository.findPublishedVersion(institutionId);
      if (!published) {
        res.json({
          success: true,
          data: {
            hasPublishedSchedule: false,
            institutionName,
            message: 'No published schedule is currently available for your college.'
          }
        });
        return;
      }

      const rosterRecord = await rosterRepository.findById(membership.defaultScheduleRecordId.toString());
      if (!rosterRecord) {
        res.json({
          success: true,
          data: {
            needsProfileSelection: true,
            institutionId,
            institutionName
          }
        });
        return;
      }

      const [tracks, periods, assignments, departments, batches] = await Promise.all([
        scheduleRepository.findTracksByVersion(published._id.toString()),
        scheduleRepository.findPeriodsByVersion(published._id.toString()),
        scheduleRepository.findAssignmentsByVersion(published._id.toString()),
        departmentRepository.getAllActiveByInstitution(institutionId),
        batchRepository.getAllByInstitution(institutionId)
      ]);

      const batchMap = new Map<string, any>(batches.map((b) => [b._id.toString(), {
        id: b._id.toString(),
        code: b.code,
        name: b.name,
        depth: b.depth,
        ancestorIds: (b.ancestorIds || []).map((a: any) => a.toString())
      }]));

      const departmentMap = new Map<string, any>(departments.map((d) => [d._id.toString(), {
        id: d._id.toString(),
        name: d.name,
        abbreviation: d.abbreviation,
        color: d.color
      }]));

      const rosterBatchIds = (rosterRecord.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString()));

      const resolverInput = {
        rosterBatchNodeIds: rosterBatchIds,
        batchMap,
        tracks: tracks.map((t) => ({
          id: t._id.toString(),
          scheduleVersionId: t.scheduleVersionId.toString(),
          name: t.name,
          order: t.order,
          inheritParentAssignments: t.inheritParentAssignments,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString()
        })),
        periods: periods.map((p) => ({
          id: p._id.toString(),
          scheduleVersionId: p.scheduleVersionId.toString(),
          rotationTrackId: p.rotationTrackId.toString(),
          startDate: p.startDate,
          endDate: p.endDate,
          order: p.order,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        })),
        assignments: assignments.map((a) => ({
          id: a._id.toString(),
          scheduleVersionId: a.scheduleVersionId.toString(),
          rotationTrackId: a.rotationTrackId.toString(),
          periodId: a.periodId.toString(),
          departmentId: a.departmentId.toString(),
          batchNodeId: a.batchNodeId.toString(),
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString()
        })),
        departmentMap
      };

      const today = getTodayInKolkata();
      const currentPostings = resolvePostingsForDate(resolverInput, today);
      const fullAgenda = resolveAgenda(resolverInput, today);

      // Find next upcoming posting starting after today
      const nextUpcomingPosting = fullAgenda.find((p) => compareDates(p.startDate, today) > 0);

      const personalSchedule: IPersonalSchedule = {
        rosterRecordId: rosterRecord._id.toString(),
        rosterRecordName: rosterRecord.name,
        institutionName,
        scheduleVersionNumber: published.versionNumber,
        currentPostings,
        nextUpcomingPosting,
        agenda: fullAgenda,
        lastSyncedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: personalSchedule
      });
    } catch (err) {
      next(err);
    }
  }

  // Directory Search (by Name or by Department + Date)
  async searchDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const membership = await institutionRepository.findActiveMembershipByUser(userId);
      if (!membership || !membership.institutionId) {
        res.status(403).json({ success: false, message: 'Active college membership required' });
        return;
      }

      const institutionId = (membership.institutionId as any)._id?.toString() || membership.institutionId.toString();
      const targetDate = (req.query.date as string) || getTodayInKolkata();
      const nameQuery = (req.query.name as string | undefined)?.trim();
      const departmentId = req.query.departmentId as string | undefined;

      const published = await scheduleRepository.findPublishedVersion(institutionId);
      if (!published) {
        res.json({ success: true, data: [] });
        return;
      }

      const [allRoster, tracks, periods, assignments, departments, batches] = await Promise.all([
        rosterRepository.getAllActiveByInstitution(institutionId),
        scheduleRepository.findTracksByVersion(published._id.toString()),
        scheduleRepository.findPeriodsByVersion(published._id.toString()),
        scheduleRepository.findAssignmentsByVersion(published._id.toString()),
        departmentRepository.getAllActiveByInstitution(institutionId),
        batchRepository.getAllByInstitution(institutionId)
      ]);

      const batchMap = new Map<string, any>(batches.map((b) => [b._id.toString(), {
        id: b._id.toString(),
        code: b.code,
        name: b.name,
        depth: b.depth,
        ancestorIds: (b.ancestorIds || []).map((a: any) => a.toString())
      }]));

      const departmentMap = new Map<string, any>(departments.map((d) => [d._id.toString(), {
        id: d._id.toString(),
        name: d.name,
        abbreviation: d.abbreviation,
        color: d.color
      }]));

      const baseResolverInput = {
        batchMap,
        tracks: tracks.map((t) => ({
          id: t._id.toString(),
          scheduleVersionId: t.scheduleVersionId.toString(),
          name: t.name,
          order: t.order,
          inheritParentAssignments: t.inheritParentAssignments,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString()
        })),
        periods: periods.map((p) => ({
          id: p._id.toString(),
          scheduleVersionId: p.scheduleVersionId.toString(),
          rotationTrackId: p.rotationTrackId.toString(),
          startDate: p.startDate,
          endDate: p.endDate,
          order: p.order,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        })),
        assignments: assignments.map((a) => ({
          id: a._id.toString(),
          scheduleVersionId: a.scheduleVersionId.toString(),
          rotationTrackId: a.rotationTrackId.toString(),
          periodId: a.periodId.toString(),
          departmentId: a.departmentId.toString(),
          batchNodeId: a.batchNodeId.toString(),
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString()
        })),
        departmentMap
      };

      // Filter by name query if present
      let filteredRoster = allRoster;
      if (nameQuery) {
        const lower = nameQuery.toLowerCase();
        filteredRoster = allRoster.filter((r) => r.name.toLowerCase().includes(lower));
      }

      const results: IDirectoryEntry[] = [];

      for (const record of filteredRoster) {
        const rosterBatchIds = (record.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString()));
        const postings = resolvePostingsForDate({ ...baseResolverInput, rosterBatchNodeIds: rosterBatchIds }, targetDate);

        // If department filter is active, check match
        if (departmentId && !postings.some((p) => p.departmentId === departmentId)) {
          continue;
        }

        const directCodes = rosterBatchIds
          .map((id) => batchMap.get(id)?.code)
          .filter(Boolean) as string[];

        results.push({
          rosterRecordId: record._id.toString(),
          rosterRecordName: record.name,
          directBatchCodes: directCodes,
          activePostings: postings.map((p) => ({
            departmentId: p.departmentId,
            trackName: p.trackName,
            departmentName: p.departmentName,
            departmentAbbreviation: p.departmentAbbreviation,
            departmentColor: p.departmentColor,
            startDate: p.startDate,
            endDate: p.endDate
          }))
        });
      }

      res.json({
        success: true,
        data: results,
        departments: departments.map((d) => ({
          id: d._id.toString(),
          name: d.name,
          abbreviation: d.abbreviation,
          color: d.color
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // Offline Snapshot endpoint for Cache API
  async getSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const membership = await institutionRepository.findActiveMembershipByUser(userId);
      if (!membership || !membership.institutionId) {
        res.status(403).json({ success: false, message: 'Active college membership required' });
        return;
      }

      const institutionId = (membership.institutionId as any)._id?.toString() || membership.institutionId.toString();
      const snapshot = await scheduleService.getPublishedSnapshot(institutionId);

      if (!snapshot) {
        res.status(404).json({ success: false, message: 'No published schedule snapshot available' });
        return;
      }

      res.json({
        success: true,
        data: snapshot
      });
    } catch (err) {
      next(err);
    }
  }
}

export const hsScheduleController = new HsScheduleController();
