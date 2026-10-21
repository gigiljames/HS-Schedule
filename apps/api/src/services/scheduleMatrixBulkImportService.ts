import { Types } from 'mongoose';
import { InstitutionModel } from '../models/Institution.js';
import { DepartmentModel, IDepartmentDocument } from '../models/Department.js';
import { BatchNodeModel, IBatchNodeDocument } from '../models/BatchNode.js';
import { SchedulePlanModel } from '../models/SchedulePlan.js';
import { ScheduleVersionModel } from '../models/ScheduleVersion.js';
import { RotationTrackModel } from '../models/RotationTrack.js';
import { SchedulePeriodModel } from '../models/SchedulePeriod.js';
import { ScheduleAssignmentModel } from '../models/ScheduleAssignment.js';
import { isValidDateString, compareDates } from '../shared/index.js';
import {
  IScheduleMatrixBulkPayload,
  IScheduleMatrixBulkPreviewResponse,
  IScheduleMatrixBulkExecutionResponse,
  IScheduleMatrixBulkTrackPreview,
  IScheduleMatrixBulkPeriodPreview,
  IScheduleMatrixBulkAssignmentPreview
} from '../shared/index.js';

export class ScheduleMatrixBulkImportService {
  /**
   * Validates and generates a preview of the schedule matrix without modifying the database.
   */
  async validateAndPreview(
    institutionId: string,
    payload: IScheduleMatrixBulkPayload,
    targetVersionId?: string
  ): Promise<IScheduleMatrixBulkPreviewResponse> {
    if (!Types.ObjectId.isValid(institutionId)) {
      throw new Error('Invalid institution ID format');
    }

    const institution = await InstitutionModel.findById(institutionId);
    if (!institution || !institution.isActive) {
      throw new Error('Target institution not found or inactive');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // If targetVersionId is specified, check that it exists and is in draft mode
    if (targetVersionId) {
      if (!Types.ObjectId.isValid(targetVersionId)) {
        throw new Error('Invalid version ID format');
      }
      const version = await ScheduleVersionModel.findById(targetVersionId);
      if (!version) {
        throw new Error('Target schedule version not found');
      }
      if (version.status !== 'draft') {
        errors.push(`Target schedule version v${version.versionNumber} is '${version.status}' and locked. Cannot import into a non-draft version.`);
      }
    }

    const rawTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
    if (rawTracks.length === 0) {
      errors.push('No rotation tracks provided in JSON. At least one track is required.');
    }

    // Load existing departments and batches for this institution
    const [existingDepts, existingBatches] = await Promise.all([
      DepartmentModel.find({ institutionId }),
      BatchNodeModel.find({ institutionId })
    ]);

    const deptByAbbr = new Map<string, IDepartmentDocument>();
    const deptByName = new Map<string, IDepartmentDocument>();
    for (const d of existingDepts) {
      deptByAbbr.set(d.abbreviation.toUpperCase().trim(), d);
      deptByName.set(d.name.toLowerCase().trim(), d);
    }

    const batchByCode = new Map<string, IBatchNodeDocument>();
    const batchByName = new Map<string, IBatchNodeDocument>();
    for (const b of existingBatches) {
      batchByCode.set(b.code.toUpperCase().trim(), b);
      batchByName.set(b.name.toLowerCase().trim(), b);
    }

    const trackPreviews: IScheduleMatrixBulkTrackPreview[] = [];
    const seenTrackNames = new Set<string>();

    let totalPeriodsCount = 0;
    let totalAssignmentsCount = 0;

    for (let tIdx = 0; tIdx < rawTracks.length; tIdx++) {
      const rawTrack = rawTracks[tIdx];
      const trackName = rawTrack?.name?.trim() || `Track ${tIdx + 1}`;
      const trackLower = trackName.toLowerCase();

      let trackStatus: 'valid' | 'warning' | 'error' = 'valid';
      let trackMessage: string | undefined;

      if (!rawTrack?.name?.trim()) {
        trackStatus = 'warning';
        trackMessage = `Track name missing; defaulted to "${trackName}"`;
        warnings.push(`Track ${tIdx + 1}: Name missing, defaulted to "${trackName}"`);
      } else if (seenTrackNames.has(trackLower)) {
        trackStatus = 'error';
        trackMessage = `Duplicate track name "${trackName}" in import payload`;
        errors.push(`Duplicate track name "${trackName}" in import payload`);
      }
      seenTrackNames.add(trackLower);

      const periodPreviews: IScheduleMatrixBulkPeriodPreview[] = [];
      const seenPeriods = new Set<string>();

      const rawPeriods = Array.isArray(rawTrack?.periods) ? rawTrack.periods : [];
      if (rawPeriods.length === 0) {
        trackStatus = trackStatus === 'error' ? 'error' : 'warning';
        warnings.push(`Track "${trackName}" has no date range periods defined.`);
      }

      for (let pIdx = 0; pIdx < rawPeriods.length; pIdx++) {
        const rawPeriod = rawPeriods[pIdx];
        const startDate = rawPeriod?.startDate?.trim() || '';
        const endDate = rawPeriod?.endDate?.trim() || '';

        let periodStatus: 'valid' | 'warning' | 'error' = 'valid';
        let periodMessage: string | undefined;

        if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
          periodStatus = 'error';
          periodMessage = `Invalid date format for period (${startDate} to ${endDate}). Dates must be YYYY-MM-DD.`;
          errors.push(`Track "${trackName}", Period ${pIdx + 1}: Dates must be valid YYYY-MM-DD strings.`);
        } else if (compareDates(startDate, endDate) > 0) {
          periodStatus = 'error';
          periodMessage = `Start date (${startDate}) is after end date (${endDate}).`;
          errors.push(`Track "${trackName}", Period ${pIdx + 1}: Start date (${startDate}) is after end date (${endDate}).`);
        } else {
          const periodKey = `${startDate}_${endDate}`;
          if (seenPeriods.has(periodKey)) {
            periodStatus = 'error';
            periodMessage = `Duplicate date range (${startDate} to ${endDate}) within track "${trackName}".`;
            errors.push(`Track "${trackName}": Duplicate period (${startDate} to ${endDate}).`);
          }
          seenPeriods.add(periodKey);
        }

        // Process assignments in this period
        const assignmentPreviews: IScheduleMatrixBulkAssignmentPreview[] = [];
        const assignedBatchIdsInPeriod = new Map<string, string>(); // batchId -> departmentName

        // Parse assignments either as dictionary { "MED": ["A1", "A2"] } or array [ { department: "MED", batches: ["A1"] } ]
        const normalizedAssignments: Array<{ department: string; batches: string[] }> = [];

        if (rawPeriod?.assignments && typeof rawPeriod.assignments === 'object') {
          if (Array.isArray(rawPeriod.assignments)) {
            for (const item of rawPeriod.assignments) {
              if (item && item.department) {
                const bList = Array.isArray(item.batches)
                  ? item.batches.map(String)
                  : typeof item.batches === 'string'
                  ? [item.batches]
                  : [];
                normalizedAssignments.push({ department: String(item.department).trim(), batches: bList });
              }
            }
          } else {
            for (const [deptKey, bVal] of Object.entries(rawPeriod.assignments)) {
              const bList = Array.isArray(bVal)
                ? bVal.map(String)
                : typeof bVal === 'string'
                ? [bVal]
                : [];
              normalizedAssignments.push({ department: deptKey.trim(), batches: bList });
            }
          }
        }

        for (const rawAssign of normalizedAssignments) {
          const deptKey = rawAssign.department;
          const resolvedDept =
            deptByAbbr.get(deptKey.toUpperCase()) ||
            deptByName.get(deptKey.toLowerCase());

          const resolvedBatchCodes: string[] = [];
          const resolvedBatchIds: string[] = [];
          const unresolvedBatches: string[] = [];

          let assignStatus: 'valid' | 'warning' | 'error' = 'valid';
          let assignMessage: string | undefined;

          if (!resolvedDept) {
            assignStatus = 'error';
            assignMessage = `Department "${deptKey}" does not exist in this institution.`;
            errors.push(`Track "${trackName}", Period (${startDate} - ${endDate}): Department "${deptKey}" not found.`);
          }

          for (const rawB of rawAssign.batches) {
            const bClean = String(rawB).trim();
            const resolvedBatch =
              batchByCode.get(bClean.toUpperCase()) ||
              batchByName.get(bClean.toLowerCase());

            if (resolvedBatch) {
              const batchIdStr = resolvedBatch.id || resolvedBatch._id.toString();
              resolvedBatchCodes.push(resolvedBatch.code);
              resolvedBatchIds.push(batchIdStr);

              // Check conflict: batch cannot be assigned to two departments in the same period and track
              if (assignedBatchIdsInPeriod.has(batchIdStr)) {
                const prevDept = assignedBatchIdsInPeriod.get(batchIdStr);
                assignStatus = 'error';
                const conflictMsg = `Conflict: Batch "${resolvedBatch.code}" is assigned to both "${prevDept}" and "${resolvedDept?.name || deptKey}" in the same period (${startDate} to ${endDate}).`;
                errors.push(conflictMsg);
              } else {
                assignedBatchIdsInPeriod.set(batchIdStr, resolvedDept?.name || deptKey);
              }
            } else {
              unresolvedBatches.push(bClean);
              if (assignStatus !== 'error') assignStatus = 'warning';
              warnings.push(`Track "${trackName}", Period (${startDate} - ${endDate}): Batch "${bClean}" not found.`);
            }
          }

          if (unresolvedBatches.length > 0 && !assignMessage) {
            assignMessage = `${unresolvedBatches.length} batch(es) not found: ${unresolvedBatches.join(', ')}`;
          }

          totalAssignmentsCount += resolvedBatchIds.length;

          assignmentPreviews.push({
            departmentInput: deptKey,
            resolvedDepartmentName: resolvedDept?.name,
            resolvedDepartmentAbbr: resolvedDept?.abbreviation,
            departmentColor: resolvedDept?.color,
            departmentId: resolvedDept?.id || resolvedDept?._id.toString(),
            batchInputs: rawAssign.batches,
            resolvedBatchCodes,
            resolvedBatchIds,
            unresolvedBatches,
            status: assignStatus,
            message: assignMessage
          });

          if (assignStatus === 'error') periodStatus = 'error';
          else if (assignStatus === 'warning' && periodStatus !== 'error') periodStatus = 'warning';
        }

        totalPeriodsCount++;

        periodPreviews.push({
          startDate,
          endDate,
          status: periodStatus,
          message: periodMessage,
          assignments: assignmentPreviews
        });

        if (periodStatus === 'error') trackStatus = 'error';
        else if (periodStatus === 'warning' && trackStatus !== 'error') trackStatus = 'warning';
      }

      trackPreviews.push({
        name: trackName,
        status: trackStatus,
        message: trackMessage,
        periods: periodPreviews
      });
    }

    return {
      isValid: errors.length === 0,
      targetVersionId,
      planName: payload.planName,
      versionNotes: payload.versionNotes,
      summary: {
        totalTracks: trackPreviews.length,
        totalPeriods: totalPeriodsCount,
        totalAssignments: totalAssignmentsCount,
        totalWarnings: warnings.length,
        totalErrors: errors.length
      },
      errors,
      warnings,
      tracks: trackPreviews
    };
  }

  /**
   * Applies the validated schedule matrix and commits changes to MongoDB.
   */
  async apply(
    institutionId: string,
    payload: IScheduleMatrixBulkPayload,
    targetVersionId?: string
  ): Promise<IScheduleMatrixBulkExecutionResponse> {
    // 1. Validate first
    const preview = await this.validateAndPreview(institutionId, payload, targetVersionId);
    if (!preview.isValid) {
      throw new Error(`Cannot import schedule matrix due to ${preview.errors.length} validation errors: ${preview.errors.slice(0, 3).join('; ')}`);
    }

    let planId: Types.ObjectId | string;
    let versionId: Types.ObjectId | string;

    // 2. Resolve or create Plan & Version
    if (targetVersionId) {
      const version = await ScheduleVersionModel.findById(targetVersionId);
      if (!version) throw new Error('Target schedule version not found');
      if (version.status !== 'draft') {
        throw new Error(`Target schedule version is '${version.status}' and locked. Cannot overwrite.`);
      }
      planId = version.planId;
      versionId = version._id;

      // Clean up previous draft assignments, periods, and tracks in this version for a clean import
      await Promise.all([
        ScheduleAssignmentModel.deleteMany({ scheduleVersionId: versionId }),
        SchedulePeriodModel.deleteMany({ scheduleVersionId: versionId }),
        RotationTrackModel.deleteMany({ scheduleVersionId: versionId })
      ]);
    } else {
      const planName = payload.planName?.trim() || `Schedule Plan (${new Date().toLocaleDateString()})`;
      const plan = await SchedulePlanModel.create({
        institutionId,
        name: planName,
        description: 'Imported via Schedule Matrix Bulk Import'
      });
      planId = plan._id;

      const version = await ScheduleVersionModel.create({
        planId: plan._id,
        institutionId,
        versionNumber: 1,
        status: 'draft',
        notes: payload.versionNotes?.trim() || 'Imported Version 1'
      });
      versionId = version._id;
    }

    let tracksCreated = 0;
    let periodsCreated = 0;
    let assignmentsCreated = 0;

    // 3. Persist Tracks, Periods, and Assignments
    for (let tIdx = 0; tIdx < preview.tracks.length; tIdx++) {
      const trackPreview = preview.tracks[tIdx];

      const trackDoc = await RotationTrackModel.create({
        scheduleVersionId: versionId,
        name: trackPreview.name,
        order: tIdx,
        inheritParentAssignments: true
      });
      tracksCreated++;

      for (let pIdx = 0; pIdx < trackPreview.periods.length; pIdx++) {
        const periodPreview = trackPreview.periods[pIdx];

        const periodDoc = await SchedulePeriodModel.create({
          scheduleVersionId: versionId,
          rotationTrackId: trackDoc._id,
          startDate: periodPreview.startDate,
          endDate: periodPreview.endDate,
          order: pIdx
        });
        periodsCreated++;

        const assignmentDocs: any[] = [];
        for (const assignPreview of periodPreview.assignments) {
          if (!assignPreview.departmentId) continue;

          for (const batchId of assignPreview.resolvedBatchIds) {
            assignmentDocs.push({
              scheduleVersionId: versionId,
              rotationTrackId: trackDoc._id,
              periodId: periodDoc._id,
              departmentId: assignPreview.departmentId,
              batchNodeId: batchId
            });
          }
        }

        if (assignmentDocs.length > 0) {
          await ScheduleAssignmentModel.insertMany(assignmentDocs);
          assignmentsCreated += assignmentDocs.length;
        }
      }
    }

    return {
      success: true,
      message: `Schedule matrix imported successfully with ${tracksCreated} track(s), ${periodsCreated} period(s), and ${assignmentsCreated} batch assignment(s).`,
      versionId: versionId.toString(),
      planId: planId.toString(),
      summary: {
        tracksCreated,
        periodsCreated,
        assignmentsCreated
      }
    };
  }
}

export const scheduleMatrixBulkImportService = new ScheduleMatrixBulkImportService();
