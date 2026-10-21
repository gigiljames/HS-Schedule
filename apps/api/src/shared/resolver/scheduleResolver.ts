import { IBatchNode, IDepartment, IRotationTrack, IScheduleAssignment, ISchedulePeriod } from '../types/models.js';
import { IResolvedPosting } from '../types/schedule.js';
import { isDateInRange } from '../utils/date.js';

export interface IResolverInput {
  rosterBatchNodeIds: string[];
  batchMap: Map<string, IBatchNode>;
  tracks: IRotationTrack[];
  periods: ISchedulePeriod[];
  assignments: IScheduleAssignment[];
  departmentMap: Map<string, IDepartment>;
}

/**
 * Resolves a house surgeon's active department postings on a given date (YYYY-MM-DD).
 * Follows Hierarchical Track-Scoped Inheritance:
 * - Descendant assignments override ancestor assignments within the same track and period.
 * - Assignments on separate rotation tracks coexist.
 */
export function resolvePostingsForDate(
  input: IResolverInput,
  targetDate: string
): IResolvedPosting[] {
  const { rosterBatchNodeIds, batchMap, tracks, periods, assignments, departmentMap } = input;
  const resolved: IResolvedPosting[] = [];

  // Group periods by trackId
  const periodsByTrack = new Map<string, ISchedulePeriod[]>();
  for (const p of periods) {
    if (!periodsByTrack.has(p.rotationTrackId)) {
      periodsByTrack.set(p.rotationTrackId, []);
    }
    periodsByTrack.get(p.rotationTrackId)!.push(p);
  }

  // Group assignments by periodId
  const assignmentsByPeriod = new Map<string, IScheduleAssignment[]>();
  for (const a of assignments) {
    if (!assignmentsByPeriod.has(a.periodId)) {
      assignmentsByPeriod.set(a.periodId, []);
    }
    assignmentsByPeriod.get(a.periodId)!.push(a);
  }

  // Pre-expand roster record's eligible batch hierarchy with depth
  // Map of batchNodeId -> { depth, isDirect }
  const eligibleBatchMap = new Map<string, { depth: number; isDirect: boolean }>();
  for (const directId of rosterBatchNodeIds) {
    const directNode = batchMap.get(directId);
    if (!directNode) continue;
    eligibleBatchMap.set(directId, { depth: directNode.depth, isDirect: true });

    // Include ancestors
    if (directNode.ancestorIds && directNode.ancestorIds.length > 0) {
      for (const ancId of directNode.ancestorIds) {
        const ancNode = batchMap.get(ancId);
        if (ancNode) {
          const existing = eligibleBatchMap.get(ancId);
          if (!existing || ancNode.depth > existing.depth) {
            eligibleBatchMap.set(ancId, { depth: ancNode.depth, isDirect: false });
          }
        }
      }
    }
  }

  for (const track of tracks) {
    const trackPeriods = periodsByTrack.get(track.id) || [];
    // Find period covering the target date
    const activePeriod = trackPeriods.find((p) => isDateInRange(targetDate, p.startDate, p.endDate));
    if (!activePeriod) continue;

    const periodAssignments = assignmentsByPeriod.get(activePeriod.id) || [];

    // Filter assignments that match the user's batches (direct or ancestor)
    let bestAssignment: IScheduleAssignment | null = null;
    let bestDepth = -1;
    let bestBatchNode: IBatchNode | null = null;
    let isOverride = false;

    for (const assignment of periodAssignments) {
      const match = eligibleBatchMap.get(assignment.batchNodeId);
      if (!match) continue;

      const node = batchMap.get(assignment.batchNodeId);
      if (!node) continue;

      // Track inheritance rule: if inheritParentAssignments is true, more specific (higher depth) wins
      if (match.depth > bestDepth) {
        bestAssignment = assignment;
        bestDepth = match.depth;
        bestBatchNode = node;
        // If bestDepth > 0 and assigned node depth is greater than root ancestor, it's an override
        isOverride = match.depth > 0;
      }
    }

    if (bestAssignment && bestBatchNode) {
      const dept = departmentMap.get(bestAssignment.departmentId);
      if (dept) {
        resolved.push({
          trackId: track.id,
          trackName: track.name,
          departmentId: dept.id,
          departmentName: dept.name,
          departmentAbbreviation: dept.abbreviation,
          departmentColor: dept.color,
          startDate: activePeriod.startDate,
          endDate: activePeriod.endDate,
          matchedBatchNodeId: bestBatchNode.id,
          matchedBatchCode: bestBatchNode.code,
          isOverride
        });
      }
    }
  }

  return resolved;
}

/**
 * Resolves the full agenda of upcoming postings for a house surgeon.
 */
export function resolveAgenda(
  input: IResolverInput,
  fromDate: string
): IResolvedPosting[] {
  const { rosterBatchNodeIds, batchMap, tracks, periods, assignments, departmentMap } = input;
  const agenda: IResolvedPosting[] = [];

  const periodsByTrack = new Map<string, ISchedulePeriod[]>();
  for (const p of periods) {
    if (!periodsByTrack.has(p.rotationTrackId)) {
      periodsByTrack.set(p.rotationTrackId, []);
    }
    periodsByTrack.get(p.rotationTrackId)!.push(p);
  }

  const assignmentsByPeriod = new Map<string, IScheduleAssignment[]>();
  for (const a of assignments) {
    if (!assignmentsByPeriod.has(a.periodId)) {
      assignmentsByPeriod.set(a.periodId, []);
    }
    assignmentsByPeriod.get(a.periodId)!.push(a);
  }

  const eligibleBatchMap = new Map<string, { depth: number; isDirect: boolean }>();
  for (const directId of rosterBatchNodeIds) {
    const directNode = batchMap.get(directId);
    if (!directNode) continue;
    eligibleBatchMap.set(directId, { depth: directNode.depth, isDirect: true });

    if (directNode.ancestorIds) {
      for (const ancId of directNode.ancestorIds) {
        const ancNode = batchMap.get(ancId);
        if (ancNode) {
          const existing = eligibleBatchMap.get(ancId);
          if (!existing || ancNode.depth > existing.depth) {
            eligibleBatchMap.set(ancId, { depth: ancNode.depth, isDirect: false });
          }
        }
      }
    }
  }

  for (const track of tracks) {
    const trackPeriods = (periodsByTrack.get(track.id) || []).filter(
      (p) => p.endDate.localeCompare(fromDate) >= 0
    );

    for (const period of trackPeriods) {
      const periodAssignments = assignmentsByPeriod.get(period.id) || [];
      let bestAssignment: IScheduleAssignment | null = null;
      let bestDepth = -1;
      let bestBatchNode: IBatchNode | null = null;
      let isOverride = false;

      for (const assignment of periodAssignments) {
        const match = eligibleBatchMap.get(assignment.batchNodeId);
        if (!match) continue;

        const node = batchMap.get(assignment.batchNodeId);
        if (!node) continue;

        if (match.depth > bestDepth) {
          bestAssignment = assignment;
          bestDepth = match.depth;
          bestBatchNode = node;
          isOverride = match.depth > 0;
        }
      }

      if (bestAssignment && bestBatchNode) {
        const dept = departmentMap.get(bestAssignment.departmentId);
        if (dept) {
          agenda.push({
            trackId: track.id,
            trackName: track.name,
            departmentId: dept.id,
            departmentName: dept.name,
            departmentAbbreviation: dept.abbreviation,
            departmentColor: dept.color,
            startDate: period.startDate,
            endDate: period.endDate,
            matchedBatchNodeId: bestBatchNode.id,
            matchedBatchCode: bestBatchNode.code,
            isOverride
          });
        }
      }
    }
  }

  // Sort agenda chronologically by startDate
  agenda.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return agenda;
}
