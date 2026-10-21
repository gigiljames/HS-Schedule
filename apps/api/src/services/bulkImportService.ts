import mongoose, { Types } from 'mongoose';
import { DepartmentModel, IDepartmentDocument } from '../models/Department.js';
import { BatchNodeModel, IBatchNodeDocument } from '../models/BatchNode.js';
import { HouseSurgeonRecordModel, IHouseSurgeonRecordDocument } from '../models/HouseSurgeonRecord.js';
import { InstitutionModel } from '../models/Institution.js';
import { PREDEFINED_PALETTE } from './departmentService.js';
import {
  IBulkImportPayload,
  IBulkImportPreviewResponse,
  IBulkImportExecutionResponse,
  IBulkImportDepartmentPreview,
  IBulkImportBatchPreview,
  IBulkImportStudentPreview
} from '../shared/index.js';

export class BulkImportService {
  /**
   * Parses, validates, and generates a draft preview of the proposed import.
   * NEVER mutates the database.
   */
  async validateAndPreview(
    institutionId: string,
    payload: IBulkImportPayload
  ): Promise<IBulkImportPreviewResponse> {
    if (!Types.ObjectId.isValid(institutionId)) {
      throw new Error('Invalid institution ID format');
    }

    const institution = await InstitutionModel.findById(institutionId);
    if (!institution || !institution.isActive) {
      throw new Error('Target institution not found or inactive');
    }

    const rawDepartments = Array.isArray(payload?.departments) ? payload.departments : [];
    const rawBatches = Array.isArray(payload?.batches) ? payload.batches : [];
    const rawStudents = Array.isArray(payload?.students) ? payload.students : [];

    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch existing records for this institution
    const [existingDepts, existingBatches, existingRoster] = await Promise.all([
      DepartmentModel.find({ institutionId }),
      BatchNodeModel.find({ institutionId }),
      HouseSurgeonRecordModel.find({ institutionId })
    ]);

    // Lookup caches
    const existingDeptByName = new Map<string, IDepartmentDocument>();
    const existingDeptByAbbr = new Map<string, IDepartmentDocument>();
    for (const d of existingDepts) {
      existingDeptByName.set(d.name.toLowerCase().trim(), d);
      existingDeptByAbbr.set(d.abbreviation.toUpperCase().trim(), d);
    }

    const existingBatchByCode = new Map<string, IBatchNodeDocument>();
    const existingBatchByName = new Map<string, IBatchNodeDocument>();
    for (const b of existingBatches) {
      existingBatchByCode.set(b.code.toUpperCase().trim(), b);
      existingBatchByName.set(b.name.toLowerCase().trim(), b);
    }

    const existingRosterByName = new Map<string, IHouseSurgeonRecordDocument>();
    for (const r of existingRoster) {
      existingRosterByName.set(r.name.toLowerCase().trim(), r);
    }

    // ==========================================
    // 1. VALIDATE DEPARTMENTS
    // ==========================================
    const deptPreviews: IBulkImportDepartmentPreview[] = [];
    const inputDeptNames = new Set<string>();
    const inputDeptAbbrs = new Set<string>();

    let paletteIndex = existingDepts.length;

    for (let i = 0; i < rawDepartments.length; i++) {
      const item = rawDepartments[i];
      const name = item?.name?.trim() || '';
      const abbreviation = item?.abbreviation?.trim().toUpperCase() || '';
      const color = item?.color?.trim() || PREDEFINED_PALETTE[paletteIndex % PREDEFINED_PALETTE.length];

      if (!name) {
        errors.push(`Department #${i + 1}: Name is required`);
        deptPreviews.push({
          name: name || `(Unnamed #${i + 1})`,
          abbreviation,
          action: 'error',
          status: 'error',
          message: 'Department name is missing'
        });
        continue;
      }

      if (!abbreviation) {
        errors.push(`Department "${name}": Abbreviation is required`);
        deptPreviews.push({
          name,
          abbreviation: '(Missing)',
          action: 'error',
          status: 'error',
          message: 'Department abbreviation is missing'
        });
        continue;
      }

      const lowerName = name.toLowerCase();
      if (inputDeptNames.has(lowerName)) {
        errors.push(`Duplicate department name "${name}" in JSON input`);
        deptPreviews.push({
          name,
          abbreviation,
          action: 'error',
          status: 'error',
          message: 'Duplicate entry in imported JSON'
        });
        continue;
      }
      inputDeptNames.add(lowerName);

      if (inputDeptAbbrs.has(abbreviation)) {
        warnings.push(`Duplicate department abbreviation "${abbreviation}" in JSON input`);
      }
      inputDeptAbbrs.add(abbreviation);

      // Check DB match
      const existingMatch = existingDeptByName.get(lowerName);
      if (existingMatch) {
        if (existingMatch.abbreviation !== abbreviation) {
          deptPreviews.push({
            name,
            abbreviation,
            action: 'update',
            status: 'warning',
            color: existingMatch.color,
            existingId: existingMatch._id.toString(),
            message: `Will update abbreviation from "${existingMatch.abbreviation}" to "${abbreviation}"`
          });
        } else {
          deptPreviews.push({
            name,
            abbreviation,
            action: 'skip',
            status: 'valid',
            color: existingMatch.color,
            existingId: existingMatch._id.toString(),
            message: 'Department already exists with same details'
          });
        }
      } else {
        // New department
        paletteIndex++;
        deptPreviews.push({
          name,
          abbreviation,
          action: 'create',
          status: 'valid',
          color,
          message: 'New department will be created'
        });
      }
    }

    // ==========================================
    // 2. VALIDATE BATCHES & HIERARCHY
    // ==========================================
    const batchPreviews: IBulkImportBatchPreview[] = [];
    const inputBatchCodes = new Set<string>();
    const batchParentMap = new Map<string, string | null>(); // code -> parentCode
    const batchItemMap = new Map<string, typeof rawBatches[0]>();

    for (let i = 0; i < rawBatches.length; i++) {
      const item = rawBatches[i];
      const name = item?.name?.trim() || '';
      const code = (item?.code?.trim() || name).toUpperCase();
      const parent = item?.parent ? item.parent.trim() : null;
      const children = Array.isArray(item?.children)
        ? item.children.map((c) => String(c).trim()).filter(Boolean)
        : [];

      if (!name && !code) {
        errors.push(`Batch #${i + 1}: Name or code is required`);
        batchPreviews.push({
          name: `(Unnamed #${i + 1})`,
          code: `(Uncoded #${i + 1})`,
          parent,
          children,
          computedDepth: 0,
          action: 'error',
          status: 'error',
          message: 'Batch name or code is missing'
        });
        continue;
      }

      if (inputBatchCodes.has(code)) {
        errors.push(`Duplicate batch code "${code}" in JSON input`);
        batchPreviews.push({
          name,
          code,
          parent,
          children,
          computedDepth: 0,
          action: 'error',
          status: 'error',
          message: `Batch code "${code}" is defined multiple times in import`
        });
        continue;
      }

      inputBatchCodes.add(code);
      batchParentMap.set(code, parent ? parent.toUpperCase() : null);
      batchItemMap.set(code, item);
    }

    // Cycle detection & depth computation
    const depthMap = new Map<string, number>();

    const computeDepth = (code: string, visited: Set<string>): number => {
      if (visited.has(code)) {
        errors.push(`Cyclic batch parent dependency detected involving batch "${code}"`);
        return -1;
      }

      if (depthMap.has(code)) {
        return depthMap.get(code)!;
      }

      const parentCode = batchParentMap.get(code);
      if (!parentCode) {
        depthMap.set(code, 0);
        return 0;
      }

      // Check if parent is an existing DB batch
      const existingParent = existingBatchByCode.get(parentCode) || existingBatchByName.get(parentCode.toLowerCase());
      if (existingParent) {
        const d = (existingParent.depth ?? 0) + 1;
        depthMap.set(code, d);
        return d;
      }

      // Check if parent is in import input
      if (batchParentMap.has(parentCode)) {
        visited.add(code);
        const parentDepth = computeDepth(parentCode, visited);
        visited.delete(code);
        if (parentDepth === -1) return -1;
        const d = parentDepth + 1;
        depthMap.set(code, d);
        return d;
      }

      errors.push(`Batch "${code}" references parent "${parentCode}" which does not exist in import or institution`);
      return -1;
    };

    for (const code of inputBatchCodes) {
      computeDepth(code, new Set<string>());
    }

    // Build batch previews
    for (const code of inputBatchCodes) {
      const item = batchItemMap.get(code)!;
      const name = item.name?.trim() || code;
      const parent = item.parent ? item.parent.trim() : null;
      const children = Array.isArray(item.children)
        ? item.children.map((c) => String(c).trim()).filter(Boolean)
        : [];
      const computedDepth = depthMap.get(code) ?? 0;

      const existingBatch = existingBatchByCode.get(code) || existingBatchByName.get(name.toLowerCase());

      if (computedDepth === -1) {
        batchPreviews.push({
          name,
          code,
          parent,
          children,
          computedDepth: 0,
          action: 'error',
          status: 'error',
          message: 'Invalid parent reference or cyclic dependency'
        });
      } else if (existingBatch) {
        const existingParentId = existingBatch.parentBatchId?.toString();
        batchPreviews.push({
          name,
          code,
          parent,
          children,
          computedDepth: existingBatch.depth,
          action: 'skip',
          status: 'valid',
          existingId: existingBatch._id.toString(),
          message: `Batch "${code}" already exists in institution`
        });
      } else {
        batchPreviews.push({
          name,
          code,
          parent,
          children,
          computedDepth,
          action: 'create',
          status: 'valid',
          message: `New batch will be created at depth ${computedDepth}`
        });
      }
    }

    // ==========================================
    // 3. VALIDATE STUDENTS
    // ==========================================
    const studentPreviews: IBulkImportStudentPreview[] = [];
    const seenStudentNames = new Set<string>();

    for (let i = 0; i < rawStudents.length; i++) {
      const item = rawStudents[i];
      const name = item?.name?.trim() || '';
      const batches = Array.isArray(item?.batches)
        ? item.batches.map((b) => String(b).trim()).filter(Boolean)
        : [];

      if (!name) {
        errors.push(`Student #${i + 1}: Name is required`);
        studentPreviews.push({
          name: `(Unnamed Student #${i + 1})`,
          batches,
          resolvedBatchCodes: [],
          action: 'error',
          status: 'error',
          message: 'Student name is missing'
        });
        continue;
      }

      const lowerStudent = name.toLowerCase();
      if (seenStudentNames.has(lowerStudent)) {
        warnings.push(`Student "${name}" is listed multiple times in JSON input`);
      }
      seenStudentNames.add(lowerStudent);

      if (batches.length === 0) {
        errors.push(`Student "${name}": Must be assigned to at least one batch`);
        studentPreviews.push({
          name,
          batches: [],
          resolvedBatchCodes: [],
          action: 'error',
          status: 'error',
          message: 'No batches specified for student'
        });
        continue;
      }

      // Resolve each batch
      const resolvedBatchCodes: string[] = [];
      const unresolvedBatches: string[] = [];

      for (const bRef of batches) {
        const upperB = bRef.toUpperCase();
        const lowerB = bRef.toLowerCase();

        // Check if batch is in input batch list
        if (inputBatchCodes.has(upperB)) {
          resolvedBatchCodes.push(upperB);
        } else if (existingBatchByCode.has(upperB)) {
          resolvedBatchCodes.push(existingBatchByCode.get(upperB)!.code);
        } else if (existingBatchByName.has(lowerB)) {
          resolvedBatchCodes.push(existingBatchByName.get(lowerB)!.code);
        } else {
          unresolvedBatches.push(bRef);
        }
      }

      if (unresolvedBatches.length > 0) {
        errors.push(`Student "${name}" references non-existent batches: ${unresolvedBatches.join(', ')}`);
        studentPreviews.push({
          name,
          batches,
          resolvedBatchCodes,
          action: 'error',
          status: 'error',
          message: `Unresolved batches: ${unresolvedBatches.join(', ')}`
        });
        continue;
      }

      // Check DB match
      const existingStudent = existingRosterByName.get(lowerStudent);
      if (existingStudent) {
        studentPreviews.push({
          name,
          batches,
          resolvedBatchCodes,
          action: 'update',
          status: 'warning',
          existingId: existingStudent._id.toString(),
          message: 'Student already exists in roster; batches will be updated'
        });
      } else {
        studentPreviews.push({
          name,
          batches,
          resolvedBatchCodes,
          action: 'create',
          status: 'valid',
          message: `New house surgeon will be enrolled in batches [${resolvedBatchCodes.join(', ')}]`
        });
      }
    }

    // ==========================================
    // 4. SUMMARY STATISTICS
    // ==========================================
    const summary = {
      departments: {
        create: deptPreviews.filter((d) => d.action === 'create').length,
        update: deptPreviews.filter((d) => d.action === 'update').length,
        skip: deptPreviews.filter((d) => d.action === 'skip').length,
        error: deptPreviews.filter((d) => d.action === 'error').length
      },
      batches: {
        create: batchPreviews.filter((b) => b.action === 'create').length,
        update: batchPreviews.filter((b) => b.action === 'update').length,
        skip: batchPreviews.filter((b) => b.action === 'skip').length,
        error: batchPreviews.filter((b) => b.action === 'error').length
      },
      students: {
        create: studentPreviews.filter((s) => s.action === 'create').length,
        update: studentPreviews.filter((s) => s.action === 'update').length,
        skip: studentPreviews.filter((s) => s.action === 'skip').length,
        error: studentPreviews.filter((s) => s.action === 'error').length
      },
      totalErrors: errors.length,
      totalWarnings: warnings.length
    };

    const isValid = errors.length === 0;

    return {
      isValid,
      summary,
      errors,
      warnings,
      departments: deptPreviews,
      batches: batchPreviews,
      students: studentPreviews
    };
  }

  /**
   * Revalidates and executes the bulk import into MongoDB using transactions where supported,
   * with automatic fallback for standalone MongoDB instances.
   */
  async executeImport(
    institutionId: string,
    payload: IBulkImportPayload
  ): Promise<IBulkImportExecutionResponse> {
    // 1. Strict revalidation to prevent race conditions
    const preview = await this.validateAndPreview(institutionId, payload);
    if (!preview.isValid) {
      throw new Error(`Validation failed with ${preview.errors.length} error(s): ${preview.errors.join('; ')}`);
    }

    // Check if the connected MongoDB deployment supports multi-document transactions
    // (requires a replica set with a primary or a sharded cluster)
    const supportsTxn = this.isReplicaSetOrMongos();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const result = await this.executeWriteOperations(institutionId, preview, { session });
        await session.commitTransaction();
        return result;
      } catch (err: any) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        // If rejected because the cluster topology changed or is standalone
        if (
          err?.code === 20 ||
          err?.codeName === 'IllegalOperation' ||
          (typeof err?.message === 'string' &&
            err.message.includes('Transaction numbers are only allowed on a replica set member'))
        ) {
          return this.executeWriteOperations(institutionId, preview, {});
        }
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      // Standalone MongoDB (common in local dev / non-cluster setups)
      return this.executeWriteOperations(institutionId, preview, {});
    }
  }

  /**
   * Inspects Mongoose/MongoDB connection topology to determine whether
   * replica-set transactions are supported.
   */
  private isReplicaSetOrMongos(): boolean {
    try {
      const conn = mongoose.connection as any;
      const client = typeof conn?.getClient === 'function' ? conn.getClient() : (conn?.client || conn?.db?.client);
      const topology = client?.topology;
      const type = topology?.description?.type;
      return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
    } catch {
      return false;
    }
  }

  private async executeWriteOperations(
    institutionId: string,
    preview: IBulkImportPreviewResponse,
    sessionOpt: { session?: mongoose.ClientSession }
  ): Promise<IBulkImportExecutionResponse> {
    // ----------------------------------------------------
    // Step A: Persist Departments
    // ----------------------------------------------------
    let departmentsCreated = 0;
    let departmentsUpdated = 0;
    let departmentsSkipped = 0;

    for (const d of preview.departments) {
      if (d.action === 'create') {
        await DepartmentModel.create(
          [
            {
              institutionId: new Types.ObjectId(institutionId),
              name: d.name,
              abbreviation: d.abbreviation,
              color: d.color || '#2563EB',
              isActive: true
            }
          ],
          sessionOpt
        );
        departmentsCreated++;
      } else if (d.action === 'update' && d.existingId) {
        await DepartmentModel.findByIdAndUpdate(
          d.existingId,
          { $set: { abbreviation: d.abbreviation } },
          sessionOpt
        );
        departmentsUpdated++;
      } else if (d.action === 'skip') {
        departmentsSkipped++;
      }
    }

    // ----------------------------------------------------
    // Step B: Persist Batches (Topological Order by Depth)
    // ----------------------------------------------------
    let batchesCreated = 0;
    let batchesUpdated = 0;
    let batchesSkipped = 0;

    // Map to track created or existing batch code -> batch document / ObjectId
    const allBatchDocsByCode = new Map<string, { _id: Types.ObjectId; depth: number; ancestorIds: Types.ObjectId[] }>();

    // Populate existing batches in map
    const existingBatches = await BatchNodeModel.find({ institutionId }, null, sessionOpt);
    for (const eb of existingBatches) {
      allBatchDocsByCode.set(eb.code.toUpperCase(), {
        _id: eb._id as Types.ObjectId,
        depth: eb.depth,
        ancestorIds: eb.ancestorIds as Types.ObjectId[]
      });
    }

    // Sort batches by computed depth ascending so root batches are created first!
    const sortedBatches = [...preview.batches].sort((a, b) => a.computedDepth - b.computedDepth);

    for (const b of sortedBatches) {
      const upperCode = b.code.toUpperCase();

      if (b.action === 'create') {
        let parentBatchId: Types.ObjectId | null = null;
        const ancestorIds: Types.ObjectId[] = [];

        if (b.parent) {
          const parentUpper = b.parent.toUpperCase();
          const parentDoc = allBatchDocsByCode.get(parentUpper);
          if (parentDoc) {
            parentBatchId = parentDoc._id;
            if (parentDoc.ancestorIds && parentDoc.ancestorIds.length > 0) {
              ancestorIds.push(...parentDoc.ancestorIds);
            }
            ancestorIds.push(parentDoc._id);
          }
        }

        const createdBatch = await BatchNodeModel.create(
          [
            {
              institutionId: new Types.ObjectId(institutionId),
              code: upperCode,
              name: b.name,
              parentBatchId,
              ancestorIds,
              depth: b.computedDepth,
              isActive: true
            }
          ],
          sessionOpt
        );

        allBatchDocsByCode.set(upperCode, {
          _id: createdBatch[0]._id as Types.ObjectId,
          depth: b.computedDepth,
          ancestorIds
        });
        batchesCreated++;
      } else if (b.action === 'skip') {
        batchesSkipped++;
      }
    }

    // ----------------------------------------------------
    // Step C: Persist Students
    // ----------------------------------------------------
    let studentsCreated = 0;
    let studentsUpdated = 0;
    let studentsSkipped = 0;

    for (const s of preview.students) {
      if (s.action === 'create') {
        const batchNodeIds: Types.ObjectId[] = [];
        for (const bCode of s.resolvedBatchCodes) {
          const bDoc = allBatchDocsByCode.get(bCode.toUpperCase());
          if (bDoc) {
            batchNodeIds.push(bDoc._id);
          }
        }

        await HouseSurgeonRecordModel.create(
          [
            {
              institutionId: new Types.ObjectId(institutionId),
              name: s.name,
              batchNodeIds,
              isActive: true
            }
          ],
          sessionOpt
        );
        studentsCreated++;
      } else if (s.action === 'update' && s.existingId) {
        const batchNodeIds: Types.ObjectId[] = [];
        for (const bCode of s.resolvedBatchCodes) {
          const bDoc = allBatchDocsByCode.get(bCode.toUpperCase());
          if (bDoc) {
            batchNodeIds.push(bDoc._id);
          }
        }

        await HouseSurgeonRecordModel.findByIdAndUpdate(
          s.existingId,
          { $set: { batchNodeIds, isActive: true } },
          sessionOpt
        );
        studentsUpdated++;
      } else if (s.action === 'skip') {
        studentsSkipped++;
      }
    }

    return {
      success: true,
      message: `Successfully imported ${departmentsCreated} departments, ${batchesCreated} batches, and ${studentsCreated} students.`,
      summary: {
        departmentsCreated,
        departmentsUpdated,
        departmentsSkipped,
        batchesCreated,
        batchesUpdated,
        batchesSkipped,
        studentsCreated,
        studentsUpdated,
        studentsSkipped
      }
    };
  }
}

export const bulkImportService = new BulkImportService();
