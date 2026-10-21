import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { departmentRepository } from '../repositories/departmentRepository.js';
import { batchRepository } from '../repositories/batchRepository.js';
import { rosterRepository } from '../repositories/rosterRepository.js';
import { institutionRepository } from '../repositories/institutionRepository.js';
import { notificationService } from './notificationService.js';
import {
  ISchedulePlan,
  IScheduleVersion,
  IRotationTrack,
  ISchedulePeriod,
  IFullMatrixResponse,
  ITrackMatrixData,
  IOfflineScheduleSnapshot,
  IResolvedPosting,
  resolvePostingsForDate,
  resolveAgenda,
  compareDates,
  doRangesOverlap,
  isValidDateString
} from '../shared/index.js';

export class ScheduleService {
  // Plans & Versions
  async createPlan(data: { institutionId: string; name: string; description?: string }): Promise<ISchedulePlan> {
    const plan = await scheduleRepository.createPlan({
      institutionId: data.institutionId as any,
      name: data.name.trim(),
      description: data.description?.trim(),
      isActive: true
    });

    // Create initial draft version and default "Main Rotation" track
    const version = await scheduleRepository.createVersion({
      planId: plan._id,
      institutionId: data.institutionId as any,
      versionNumber: 1,
      status: 'draft',
      notes: 'Initial schedule version'
    });

    await scheduleRepository.createTrack({
      scheduleVersionId: version._id,
      name: 'Main Rotation',
      order: 0,
      inheritParentAssignments: true
    });

    return this.toPlanDto(plan);
  }

  async listPlans(institutionId: string): Promise<ISchedulePlan[]> {
    const plans = await scheduleRepository.listPlansByInstitution(institutionId);
    return plans.map(this.toPlanDto);
  }

  async deletePlan(planId: string): Promise<void> {
    await scheduleRepository.deletePlan(planId);
  }

  async createNewVersion(planId: string, notes?: string): Promise<IScheduleVersion> {
    const plan = await scheduleRepository.findPlanById(planId);
    if (!plan) throw new Error('Schedule plan not found');

    const nextNumber = await scheduleRepository.getNextVersionNumber(planId);
    const version = await scheduleRepository.createVersion({
      planId: plan._id,
      institutionId: plan.institutionId,
      versionNumber: nextNumber,
      status: 'draft',
      notes: notes || `Version ${nextNumber}`
    });

    // Clone tracks from latest version if any exist
    const versions = await scheduleRepository.listVersionsByPlan(planId);
    const prevVersion = versions.find((v) => v._id.toString() !== version._id.toString());
    if (prevVersion) {
      const prevTracks = await scheduleRepository.findTracksByVersion(prevVersion._id.toString());
      for (const t of prevTracks) {
        await scheduleRepository.createTrack({
          scheduleVersionId: version._id,
          name: t.name,
          order: t.order,
          inheritParentAssignments: t.inheritParentAssignments
        });
      }
    } else {
      await scheduleRepository.createTrack({
        scheduleVersionId: version._id,
        name: 'Main Rotation',
        order: 0,
        inheritParentAssignments: true
      });
    }

    return this.toVersionDto(version);
  }

  async listVersions(planId: string): Promise<IScheduleVersion[]> {
    const versions = await scheduleRepository.listVersionsByPlan(planId);
    return versions.map(this.toVersionDto);
  }

  async getVersion(versionId: string): Promise<IScheduleVersion> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Schedule version not found');
    return this.toVersionDto(version);
  }

  // Tracks & Periods
  async createTrack(versionId: string, name: string): Promise<IRotationTrack> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Version not found');
    if (version.status !== 'draft') throw new Error('Cannot add tracks to a non-draft version');

    const tracks = await scheduleRepository.findTracksByVersion(versionId);
    const track = await scheduleRepository.createTrack({
      scheduleVersionId: version._id,
      name: name.trim(),
      order: tracks.length,
      inheritParentAssignments: true
    });

    return this.toTrackDto(track);
  }

  async deleteTrack(trackId: string): Promise<void> {
    await scheduleRepository.deleteTrack(trackId);
  }

  async createPeriod(versionId: string, trackId: string, startDate: string, endDate: string): Promise<ISchedulePeriod> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Version not found');
    if (version.status !== 'draft') throw new Error('Cannot edit periods on a non-draft version');

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      throw new Error('Dates must be valid YYYY-MM-DD strings');
    }

    if (compareDates(startDate, endDate) > 0) {
      throw new Error('Period start date must not be after end date');
    }

    // Check for exact duplicate periods WITHIN THE SAME TRACK
    const existing = await scheduleRepository.findPeriodsByTrack(trackId);
    for (const p of existing) {
      if (p.startDate === startDate && p.endDate === endDate) {
        throw new Error('A period with the exact same date range already exists in this track');
      }
    }

    const period = await scheduleRepository.createPeriod({
      scheduleVersionId: version._id,
      rotationTrackId: trackId as any,
      startDate,
      endDate,
      order: existing.length
    });

    return this.toPeriodDto(period);
  }

  async deletePeriod(periodId: string): Promise<void> {
    await scheduleRepository.deletePeriod(periodId);
  }

  // Matrix Retrieval: Departments as Rows, Date Ranges as Columns
  async getMatrix(versionId: string): Promise<IFullMatrixResponse> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Schedule version not found');

    const [tracks, periods, assignments, departments, batches] = await Promise.all([
      scheduleRepository.findTracksByVersion(versionId),
      scheduleRepository.findPeriodsByVersion(versionId),
      scheduleRepository.findAssignmentsByVersion(versionId),
      departmentRepository.getAllActiveByInstitution(version.institutionId.toString()),
      batchRepository.getAllByInstitution(version.institutionId.toString())
    ]);

    const batchMap = new Map<string, any>(batches.map((b) => [b._id.toString(), b]));

    const trackMatrixList: ITrackMatrixData[] = [];

    for (const track of tracks) {
      const trackId = track._id.toString();
      const trackPeriods = periods
        .filter((p) => p.rotationTrackId.toString() === trackId)
        .sort((a, b) => compareDates(a.startDate, b.startDate))
        .map(this.toPeriodDto);

      const trackAssignments = assignments.filter((a) => a.rotationTrackId.toString() === trackId);

      // Map key: `${departmentId}_${periodId}` -> batchNodes[]
      const assignmentMap: Record<string, any[]> = {};

      for (const a of trackAssignments) {
        const key = `${a.departmentId.toString()}_${a.periodId.toString()}`;
        if (!assignmentMap[key]) {
          assignmentMap[key] = [];
        }
        const b = batchMap.get(a.batchNodeId.toString());
        if (b) {
          assignmentMap[key].push({
            id: b._id.toString(),
            code: b.code,
            name: b.name,
            depth: b.depth
          });
        }
      }

      trackMatrixList.push({
        trackId,
        trackName: track.name,
        order: track.order,
        periods: trackPeriods,
        departments: departments.map((d) => ({
          id: d._id.toString(),
          institutionId: d.institutionId.toString(),
          name: d.name,
          abbreviation: d.abbreviation,
          aliases: d.aliases || [],
          color: d.color,
          isActive: d.isActive,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString()
        })),
        assignments: assignmentMap
      });
    }

    return {
      versionId: version._id.toString(),
      versionNumber: version.versionNumber,
      status: version.status,
      tracks: trackMatrixList
    };
  }

  // Update a single matrix cell
  async updateMatrixCell(data: {
    versionId: string;
    trackId: string;
    periodId: string;
    departmentId: string;
    batchNodeIds: string[];
  }): Promise<void> {
    const version = await scheduleRepository.findVersionById(data.versionId);
    if (!version) throw new Error('Version not found');
    if (version.status !== 'draft') throw new Error('Cannot edit assignments on a non-draft version');

    await scheduleRepository.setCellAssignments(
      data.versionId,
      data.trackId,
      data.periodId,
      data.departmentId,
      data.batchNodeIds
    );
  }

  // Preview resolved schedule for a roster record
  async previewResolvedSchedule(versionId: string, rosterRecordId: string, fromDate?: string): Promise<IResolvedPosting[]> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Version not found');

    const record = await rosterRepository.findById(rosterRecordId);
    if (!record) throw new Error('Roster record not found');

    const [tracks, periods, assignments, departments, batches] = await Promise.all([
      scheduleRepository.findTracksByVersion(versionId),
      scheduleRepository.findPeriodsByVersion(versionId),
      scheduleRepository.findAssignmentsByVersion(versionId),
      departmentRepository.getAllActiveByInstitution(version.institutionId.toString()),
      batchRepository.getAllByInstitution(version.institutionId.toString())
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

    const rosterBatchIds = (record.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString()));

    const targetFromDate = fromDate || '2000-01-01';
    return resolveAgenda(
      {
        rosterBatchNodeIds: rosterBatchIds,
        batchMap,
        tracks: tracks.map(this.toTrackDto),
        periods: periods.map(this.toPeriodDto),
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
      },
      targetFromDate
    );
  }

  // Publish Schedule Version
  async publishVersion(versionId: string): Promise<IScheduleVersion> {
    const version = await scheduleRepository.findVersionById(versionId);
    if (!version) throw new Error('Version not found');
    if (version.status !== 'draft') throw new Error('Only draft versions can be published');

    // Validate that schedule has at least one track and one period
    const periods = await scheduleRepository.findPeriodsByVersion(versionId);
    if (periods.length === 0) {
      throw new Error('Cannot publish an empty schedule with no periods defined');
    }

    // Turn any existing published version back into 'draft' so it remains editable and reusable
    const currentPublished = await scheduleRepository.findPublishedVersion(version.institutionId.toString());
    if (currentPublished && currentPublished._id.toString() !== versionId) {
      await scheduleRepository.updateVersion(currentPublished._id.toString(), { status: 'draft' });
      // Cancel obsolete future notification events from old version
      await notificationService.cancelEventsForVersion(currentPublished._id.toString());
    }

    const updated = await scheduleRepository.updateVersion(versionId, {
      status: 'published',
      publishedAt: new Date()
    });

    // Generate new Web Push notification events for all registered active members with a default profile
    await notificationService.generateEventsForPublishedSchedule(version.institutionId.toString(), versionId);

    return this.toVersionDto(updated!);
  }

  // Build offline snapshot for Cache API
  async getPublishedSnapshot(institutionId: string): Promise<IOfflineScheduleSnapshot | null> {
    const version = await scheduleRepository.findPublishedVersion(institutionId);
    if (!version) return null;

    const institution = await institutionRepository.findById(institutionId);
    if (!institution) return null;

    const [departments, batches, rosterRecords, tracks, periods, assignments] = await Promise.all([
      departmentRepository.getAllActiveByInstitution(institutionId),
      batchRepository.getAllByInstitution(institutionId),
      rosterRepository.getAllActiveByInstitution(institutionId),
      scheduleRepository.findTracksByVersion(version._id.toString()),
      scheduleRepository.findPeriodsByVersion(version._id.toString()),
      scheduleRepository.findAssignmentsByVersion(version._id.toString())
    ]);

    const trackList = tracks.map((t) => {
      const trackId = t._id.toString();
      return {
        id: trackId,
        name: t.name,
        order: t.order,
        inheritParentAssignments: t.inheritParentAssignments,
        periods: periods.filter((p) => p.rotationTrackId.toString() === trackId).map(this.toPeriodDto),
        assignments: assignments.filter((a) => a.rotationTrackId.toString() === trackId).map((a) => ({
          id: a._id.toString(),
          scheduleVersionId: a.scheduleVersionId.toString(),
          rotationTrackId: a.rotationTrackId.toString(),
          periodId: a.periodId.toString(),
          departmentId: a.departmentId.toString(),
          batchNodeId: a.batchNodeId.toString(),
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString()
        }))
      };
    });

    return {
      version: `v${version.versionNumber}`,
      scheduleVersionId: version._id.toString(),
      institutionId,
      institutionName: institution.name,
      institutionShortName: institution.shortName,
      departments: departments.map((d) => ({
        id: d._id.toString(),
        institutionId: d.institutionId.toString(),
        name: d.name,
        abbreviation: d.abbreviation,
        aliases: d.aliases || [],
        color: d.color,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString()
      })),
      batches: batches.map((b) => ({
        id: b._id.toString(),
        institutionId: b.institutionId.toString(),
        code: b.code,
        name: b.name,
        parentBatchId: b.parentBatchId ? b.parentBatchId.toString() : null,
        ancestorIds: (b.ancestorIds || []).map((a: any) => a.toString()),
        depth: b.depth,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString()
      })),
      rosterRecords: rosterRecords.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        batchNodeIds: (r.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString()))
      })),
      tracks: trackList,
      syncedAt: new Date().toISOString()
    };
  }

  private toPlanDto(doc: any): ISchedulePlan {
    return {
      id: doc._id.toString(),
      institutionId: doc.institutionId.toString(),
      name: doc.name,
      description: doc.description,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  private toVersionDto(doc: any): IScheduleVersion {
    return {
      id: doc._id.toString(),
      planId: doc.planId.toString(),
      institutionId: doc.institutionId.toString(),
      versionNumber: doc.versionNumber,
      status: doc.status,
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : undefined,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  private toTrackDto(doc: any): IRotationTrack {
    return {
      id: doc._id.toString(),
      scheduleVersionId: doc.scheduleVersionId.toString(),
      name: doc.name,
      order: doc.order,
      inheritParentAssignments: doc.inheritParentAssignments,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  private toPeriodDto(doc: any): ISchedulePeriod {
    return {
      id: doc._id.toString(),
      scheduleVersionId: doc.scheduleVersionId.toString(),
      rotationTrackId: doc.rotationTrackId.toString(),
      startDate: doc.startDate,
      endDate: doc.endDate,
      order: doc.order,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

export const scheduleService = new ScheduleService();
