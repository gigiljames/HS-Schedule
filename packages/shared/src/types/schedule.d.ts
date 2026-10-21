import { IDepartment, ISchedulePeriod, IScheduleAssignment, IBatchNode } from './models';
export interface IMatrixCell {
    periodId: string;
    departmentId: string;
    batchNodes: IBatchNode[];
    assignmentIds: string[];
}
export interface ITrackMatrixData {
    trackId: string;
    trackName: string;
    order: number;
    periods: ISchedulePeriod[];
    departments: IDepartment[];
    /** Map of `${departmentId}_${periodId}` -> batchNodes assigned */
    assignments: Record<string, IBatchNode[]>;
}
export interface IFullMatrixResponse {
    versionId: string;
    versionNumber: number;
    status: string;
    tracks: ITrackMatrixData[];
}
export interface IResolvedPosting {
    trackId: string;
    trackName: string;
    departmentId: string;
    departmentName: string;
    departmentAbbreviation: string;
    departmentColor: string;
    startDate: string;
    endDate: string;
    matchedBatchNodeId: string;
    matchedBatchCode: string;
    isOverride: boolean;
}
export interface IPersonalSchedule {
    rosterRecordId: string;
    rosterRecordName: string;
    institutionName: string;
    scheduleVersionNumber: number;
    currentPostings: IResolvedPosting[];
    nextUpcomingPosting?: IResolvedPosting;
    agenda: IResolvedPosting[];
    lastSyncedAt: string;
}
export interface IDirectoryEntry {
    rosterRecordId: string;
    rosterRecordName: string;
    directBatchCodes: string[];
    activePostings: Array<{
        departmentId?: string;
        trackName: string;
        departmentName: string;
        departmentAbbreviation: string;
        departmentColor: string;
        startDate: string;
        endDate: string;
    }>;
}
export interface IOfflineScheduleSnapshot {
    version: string;
    scheduleVersionId: string;
    institutionId: string;
    institutionName: string;
    institutionShortName: string;
    departments: IDepartment[];
    batches: IBatchNode[];
    rosterRecords: Array<{
        id: string;
        name: string;
        batchNodeIds: string[];
    }>;
    tracks: Array<{
        id: string;
        name: string;
        order: number;
        inheritParentAssignments: boolean;
        periods: ISchedulePeriod[];
        assignments: IScheduleAssignment[];
    }>;
    syncedAt: string;
}
export interface ITrackMatrixData {
    trackId: string;
    trackName: string;
    order: number;
    periods: ISchedulePeriod[];
    departments: IDepartment[];
    assignments: Record<string, Array<{
        id: string;
        code: string;
        name: string;
        depth: number;
    }>>;
}
export interface IFullMatrixResponse {
    versionId: string;
    versionNumber: number;
    status: string;
    departments?: IDepartment[];
    tracks: ITrackMatrixData[];
}
//# sourceMappingURL=schedule.d.ts.map