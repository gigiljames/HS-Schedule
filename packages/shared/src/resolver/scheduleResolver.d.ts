import { IBatchNode, IDepartment, IRotationTrack, IScheduleAssignment, ISchedulePeriod } from '../types/models';
import { IResolvedPosting } from '../types/schedule';
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
export declare function resolvePostingsForDate(input: IResolverInput, targetDate: string): IResolvedPosting[];
/**
 * Resolves the full agenda of upcoming postings for a house surgeon.
 */
export declare function resolveAgenda(input: IResolverInput, fromDate: string): IResolvedPosting[];
//# sourceMappingURL=scheduleResolver.d.ts.map