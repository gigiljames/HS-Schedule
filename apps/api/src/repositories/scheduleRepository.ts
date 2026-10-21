import { SchedulePlanModel, ISchedulePlanDocument } from '../models/SchedulePlan.js';
import { ScheduleVersionModel, IScheduleVersionDocument } from '../models/ScheduleVersion.js';
import { RotationTrackModel, IRotationTrackDocument } from '../models/RotationTrack.js';
import { SchedulePeriodModel, ISchedulePeriodDocument } from '../models/SchedulePeriod.js';
import { ScheduleAssignmentModel, IScheduleAssignmentDocument } from '../models/ScheduleAssignment.js';
import { Types } from 'mongoose';
import { doRangesOverlap } from '../shared/index.js';

export class ScheduleRepository {
  // Plans
  async findPlanById(id: string): Promise<ISchedulePlanDocument | null> {
    return SchedulePlanModel.findById(id);
  }

  async createPlan(data: Partial<ISchedulePlanDocument>): Promise<ISchedulePlanDocument> {
    return SchedulePlanModel.create(data);
  }

  async listPlansByInstitution(institutionId: string): Promise<ISchedulePlanDocument[]> {
    return SchedulePlanModel.find({ institutionId, isActive: true }).sort({ createdAt: -1 });
  }

  async deletePlan(planId: string): Promise<void> {
    const versions = await ScheduleVersionModel.find({ planId }).select('_id');
    const versionIds = versions.map((v) => v._id);

    await Promise.all([
      SchedulePlanModel.findByIdAndDelete(planId),
      ScheduleVersionModel.deleteMany({ planId }),
      RotationTrackModel.deleteMany({ scheduleVersionId: { $in: versionIds } }),
      SchedulePeriodModel.deleteMany({ scheduleVersionId: { $in: versionIds } }),
      ScheduleAssignmentModel.deleteMany({ scheduleVersionId: { $in: versionIds } })
    ]);
  }

  // Versions
  async findVersionById(id: string): Promise<IScheduleVersionDocument | null> {
    return ScheduleVersionModel.findById(id);
  }

  async findPublishedVersion(institutionId: string): Promise<IScheduleVersionDocument | null> {
    return ScheduleVersionModel.findOne({ institutionId, status: 'published' }).sort({ versionNumber: -1 });
  }

  async getNextVersionNumber(planId: string): Promise<number> {
    const latest = await ScheduleVersionModel.findOne({ planId }).sort({ versionNumber: -1 });
    return latest ? latest.versionNumber + 1 : 1;
  }

  async createVersion(data: Partial<IScheduleVersionDocument>): Promise<IScheduleVersionDocument> {
    return ScheduleVersionModel.create(data);
  }

  async updateVersion(id: string, update: Partial<IScheduleVersionDocument>): Promise<IScheduleVersionDocument | null> {
    return ScheduleVersionModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async listVersionsByPlan(planId: string): Promise<IScheduleVersionDocument[]> {
    return ScheduleVersionModel.find({ planId }).sort({ versionNumber: -1 });
  }

  // Tracks
  async findTracksByVersion(versionId: string): Promise<IRotationTrackDocument[]> {
    return RotationTrackModel.find({ scheduleVersionId: versionId }).sort({ order: 1 });
  }

  async createTrack(data: Partial<IRotationTrackDocument>): Promise<IRotationTrackDocument> {
    return RotationTrackModel.create(data);
  }

  async deleteTrack(id: string): Promise<void> {
    await Promise.all([
      RotationTrackModel.findByIdAndDelete(id),
      SchedulePeriodModel.deleteMany({ rotationTrackId: id }),
      ScheduleAssignmentModel.deleteMany({ rotationTrackId: id })
    ]);
  }

  // Periods
  async findPeriodsByVersion(versionId: string): Promise<ISchedulePeriodDocument[]> {
    return SchedulePeriodModel.find({ scheduleVersionId: versionId }).sort({ startDate: 1, order: 1 });
  }

  async findPeriodsByTrack(trackId: string): Promise<ISchedulePeriodDocument[]> {
    return SchedulePeriodModel.find({ rotationTrackId: trackId }).sort({ startDate: 1 });
  }

  async createPeriod(data: Partial<ISchedulePeriodDocument>): Promise<ISchedulePeriodDocument> {
    return SchedulePeriodModel.create(data);
  }

  async updatePeriod(id: string, update: Partial<ISchedulePeriodDocument>): Promise<ISchedulePeriodDocument | null> {
    return SchedulePeriodModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async deletePeriod(id: string): Promise<void> {
    await Promise.all([
      SchedulePeriodModel.findByIdAndDelete(id),
      ScheduleAssignmentModel.deleteMany({ periodId: id })
    ]);
  }

  // Normalized Assignments
  async findAssignmentsByVersion(versionId: string): Promise<IScheduleAssignmentDocument[]> {
    return ScheduleAssignmentModel.find({ scheduleVersionId: versionId });
  }

  async findAssignmentsByPeriod(periodId: string): Promise<IScheduleAssignmentDocument[]> {
    return ScheduleAssignmentModel.find({ periodId });
  }

  async findExistingAssignmentForBatch(
    versionId: string,
    trackId: string,
    periodId: string,
    batchNodeId: string
  ): Promise<IScheduleAssignmentDocument | null> {
    return ScheduleAssignmentModel.findOne({
      scheduleVersionId: versionId,
      rotationTrackId: trackId,
      periodId,
      batchNodeId
    });
  }

  async createAssignment(data: {
    scheduleVersionId: Types.ObjectId | string;
    rotationTrackId: Types.ObjectId | string;
    periodId: Types.ObjectId | string;
    departmentId: Types.ObjectId | string;
    batchNodeId: Types.ObjectId | string;
  }): Promise<IScheduleAssignmentDocument> {
    return ScheduleAssignmentModel.create(data);
  }

  async removeAssignment(
    versionId: string,
    periodId: string,
    departmentId: string,
    batchNodeId: string
  ): Promise<void> {
    await ScheduleAssignmentModel.deleteOne({
      scheduleVersionId: versionId,
      periodId,
      departmentId,
      batchNodeId
    });
  }

  async setCellAssignments(
    versionId: string,
    trackId: string,
    periodId: string,
    departmentId: string,
    batchNodeIds: string[]
  ): Promise<void> {
    // Remove existing assignments for this specific department cell
    await ScheduleAssignmentModel.deleteMany({
      scheduleVersionId: versionId,
      periodId,
      departmentId
    });

    if (batchNodeIds.length === 0) return;

    // Get the current period to inspect dates
    const currentPeriod = await SchedulePeriodModel.findById(periodId);
    if (!currentPeriod) throw new Error('Period not found');

    // Find all periods in this rotation track that overlap with the current period
    const trackPeriods = await SchedulePeriodModel.find({ rotationTrackId: trackId });
    const overlappingPeriodIds = trackPeriods
      .filter((p) => doRangesOverlap(currentPeriod.startDate, currentPeriod.endDate, p.startDate, p.endDate))
      .map((p) => p._id);

    // Check if any of these batches are already assigned in an overlapping period in this track
    const conflicts = await ScheduleAssignmentModel.find({
      scheduleVersionId: versionId,
      rotationTrackId: trackId,
      periodId: { $in: overlappingPeriodIds },
      batchNodeId: { $in: batchNodeIds }
    })
      .populate('departmentId', 'name')
      .populate('periodId', 'startDate endDate');

    if (conflicts.length > 0) {
      const conflictNames = conflicts
        .map((c) => {
          const dept = (c.departmentId as any)?.name || 'Unknown department';
          const p = c.periodId as any;
          const range = p?.startDate && p?.endDate ? ` (${p.startDate} to ${p.endDate})` : '';
          return `${dept}${range}`;
        })
        .join(', ');
      throw new Error(
        `Batch duplicate constraint violation: One or more batches are already assigned during an overlapping time period in: ${conflictNames}`
      );
    }

    // Insert normalized documents
    const docs = batchNodeIds.map((batchNodeId) => ({
      scheduleVersionId: versionId,
      rotationTrackId: trackId,
      periodId,
      departmentId,
      batchNodeId
    }));

    await ScheduleAssignmentModel.insertMany(docs);
  }

  async countInstitutionsWithPublishedSchedule(): Promise<number> {
    const published = await ScheduleVersionModel.distinct('institutionId', { status: 'published' });
    return published.length;
  }
}

export const scheduleRepository = new ScheduleRepository();
