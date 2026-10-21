export interface IBulkImportDepartmentInput {
    name: string;
    abbreviation: string;
    aliases?: string[];
    color?: string;
}
export interface IBulkImportBatchInput {
    name: string;
    code?: string;
    parent?: string | null;
    children?: string[];
}
export interface IBulkImportStudentInput {
    name: string;
    batches: string[];
}
export interface IBulkImportPayload {
    departments?: IBulkImportDepartmentInput[];
    batches?: IBulkImportBatchInput[];
    students?: IBulkImportStudentInput[];
}
export type BulkImportAction = 'create' | 'update' | 'skip' | 'error';
export type BulkImportItemStatus = 'valid' | 'warning' | 'error';
export interface IBulkImportDepartmentPreview {
    name: string;
    abbreviation: string;
    action: BulkImportAction;
    status: BulkImportItemStatus;
    color?: string;
    existingId?: string;
    message?: string;
}
export interface IBulkImportBatchPreview {
    name: string;
    code: string;
    parent: string | null;
    children: string[];
    computedDepth: number;
    action: BulkImportAction;
    status: BulkImportItemStatus;
    existingId?: string;
    message?: string;
}
export interface IBulkImportStudentPreview {
    name: string;
    batches: string[];
    resolvedBatchCodes: string[];
    action: BulkImportAction;
    status: BulkImportItemStatus;
    existingId?: string;
    message?: string;
}
export interface IBulkImportPreviewResponse {
    isValid: boolean;
    summary: {
        departments: {
            create: number;
            update: number;
            skip: number;
            error: number;
        };
        batches: {
            create: number;
            update: number;
            skip: number;
            error: number;
        };
        students: {
            create: number;
            update: number;
            skip: number;
            error: number;
        };
        totalErrors: number;
        totalWarnings: number;
    };
    errors: string[];
    warnings: string[];
    departments: IBulkImportDepartmentPreview[];
    batches: IBulkImportBatchPreview[];
    students: IBulkImportStudentPreview[];
}
export interface IBulkImportExecutionResponse {
    success: boolean;
    message: string;
    summary: {
        departmentsCreated: number;
        departmentsUpdated: number;
        departmentsSkipped: number;
        batchesCreated: number;
        batchesUpdated: number;
        batchesSkipped: number;
        studentsCreated: number;
        studentsUpdated: number;
        studentsSkipped: number;
    };
}
//# sourceMappingURL=bulkImport.d.ts.map