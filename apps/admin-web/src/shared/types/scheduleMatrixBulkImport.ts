export interface IScheduleMatrixBulkAssignmentInput {
  department: string;
  batches: string[];
}

export interface IScheduleMatrixBulkPeriodInput {
  startDate: string;
  endDate: string;
  assignments: Record<string, string[]> | IScheduleMatrixBulkAssignmentInput[];
}

export interface IScheduleMatrixBulkTrackInput {
  name: string;
  periods: IScheduleMatrixBulkPeriodInput[];
}

export interface IScheduleMatrixBulkPayload {
  planName?: string;
  versionNotes?: string;
  tracks: IScheduleMatrixBulkTrackInput[];
}

export interface IScheduleMatrixBulkAssignmentPreview {
  departmentInput: string;
  resolvedDepartmentName?: string;
  resolvedDepartmentAbbr?: string;
  departmentColor?: string;
  departmentId?: string;
  batchInputs: string[];
  resolvedBatchCodes: string[];
  resolvedBatchIds: string[];
  unresolvedBatches: string[];
  status: 'valid' | 'warning' | 'error';
  message?: string;
}

export interface IScheduleMatrixBulkPeriodPreview {
  startDate: string;
  endDate: string;
  status: 'valid' | 'warning' | 'error';
  message?: string;
  assignments: IScheduleMatrixBulkAssignmentPreview[];
}

export interface IScheduleMatrixBulkTrackPreview {
  name: string;
  status: 'valid' | 'warning' | 'error';
  message?: string;
  periods: IScheduleMatrixBulkPeriodPreview[];
}

export interface IScheduleMatrixBulkPreviewResponse {
  isValid: boolean;
  targetVersionId?: string;
  planName?: string;
  versionNotes?: string;
  summary: {
    totalTracks: number;
    totalPeriods: number;
    totalAssignments: number;
    totalWarnings: number;
    totalErrors: number;
  };
  errors: string[];
  warnings: string[];
  tracks: IScheduleMatrixBulkTrackPreview[];
}

export interface IScheduleMatrixBulkExecutionResponse {
  success: boolean;
  message: string;
  versionId: string;
  planId: string;
  summary: {
    tracksCreated: number;
    periodsCreated: number;
    assignmentsCreated: number;
  };
}
