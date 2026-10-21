import { batchRepository } from '../repositories/batchRepository.js';
import { BatchNodeModel } from '../models/BatchNode.js';
import { ScheduleAssignmentModel } from '../models/ScheduleAssignment.js';
import { HouseSurgeonRecordModel } from '../models/HouseSurgeonRecord.js';
import { IBatchNode, IBatchTreeNode } from '../shared/index.js';
import { Types } from 'mongoose';

export class BatchService {
  async createBatch(data: {
    institutionId: string;
    code: string;
    name: string;
    parentBatchId?: string;
  }): Promise<IBatchNode> {
    const existing = await batchRepository.findByInstitutionAndCode(data.institutionId, data.code);
    if (existing) {
      throw new Error(`Batch code "${data.code}" already exists in this institution`);
    }

    let depth = 0;
    const ancestorIds: Types.ObjectId[] = [];

    if (data.parentBatchId) {
      const parent = await batchRepository.findById(data.parentBatchId);
      if (!parent || parent.institutionId.toString() !== data.institutionId) {
        throw new Error('Parent batch node not found in this institution');
      }

      depth = parent.depth + 1;
      if (parent.ancestorIds && parent.ancestorIds.length > 0) {
        ancestorIds.push(...parent.ancestorIds);
      }
      ancestorIds.push(parent._id as any);
    }

    const doc = await batchRepository.create({
      institutionId: data.institutionId as any,
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      parentBatchId: data.parentBatchId ? (data.parentBatchId as any) : null,
      ancestorIds,
      depth,
      isActive: true
    });

    return this.toDto(doc);
  }

  async updateBatch(
    id: string,
    data: { name?: string; code?: string; parentBatchId?: string; isActive?: boolean }
  ): Promise<IBatchNode> {
    const batch = await batchRepository.findById(id);
    if (!batch) throw new Error('Batch node not found');

    if (data.parentBatchId !== undefined && data.parentBatchId !== (batch.parentBatchId?.toString() || null)) {
      // Validate cycle prevention
      if (data.parentBatchId === id) {
        throw new Error('A batch node cannot be its own parent');
      }

      let depth = 0;
      const ancestorIds: Types.ObjectId[] = [];

      if (data.parentBatchId) {
        const newParent = await batchRepository.findById(data.parentBatchId);
        if (!newParent) throw new Error('Parent batch node not found');

        // Check if new parent is a descendant of current batch (cycle check)
        if (newParent.ancestorIds.some((anc) => anc.toString() === id)) {
          throw new Error('Cannot set parent to a descendant node (hierarchy cycle detected)');
        }

        depth = newParent.depth + 1;
        ancestorIds.push(...newParent.ancestorIds, newParent._id as any);
      }

      batch.parentBatchId = data.parentBatchId ? (data.parentBatchId as any) : null;
      batch.ancestorIds = ancestorIds;
      batch.depth = depth;
    }

    if (data.name) batch.name = data.name.trim();
    if (data.code) batch.code = data.code.trim().toUpperCase();
    if (data.isActive !== undefined) batch.isActive = data.isActive;

    await batch.save();
    return this.toDto(batch);
  }

  async deleteBatch(id: string): Promise<void> {
    const descendants = await BatchNodeModel.find({
      $or: [{ _id: id }, { ancestorIds: id }]
    });
    const idsToDelete = descendants.map((d: any) => d._id);

    await ScheduleAssignmentModel.deleteMany({ batchNodeId: { $in: idsToDelete } });
    await HouseSurgeonRecordModel.updateMany(
      { batchNodeIds: { $in: idsToDelete } },
      { $pull: { batchNodeIds: { $in: idsToDelete } } }
    );
    await BatchNodeModel.deleteMany({ _id: { $in: idsToDelete } });
  }

  async getBatchTree(institutionId: string): Promise<IBatchTreeNode[]> {
    const all = await batchRepository.getAllByInstitution(institutionId);
    const nodes = all.map(this.toDto);

    const nodeMap = new Map<string, IBatchTreeNode>();
    for (const n of nodes) {
      nodeMap.set(n.id, { ...n, children: [] });
    }

    const roots: IBatchTreeNode[] = [];
    for (const item of nodeMap.values()) {
      if (item.parentBatchId && nodeMap.has(item.parentBatchId)) {
        nodeMap.get(item.parentBatchId)!.children.push(item);
      } else {
        roots.push(item);
      }
    }

    return roots;
  }

  async getAllBatches(institutionId: string): Promise<IBatchNode[]> {
    const all = await batchRepository.getAllByInstitution(institutionId);
    return all.map(this.toDto);
  }

  private toDto(doc: any): IBatchNode {
    return {
      id: doc._id.toString(),
      institutionId: doc.institutionId.toString(),
      code: doc.code,
      name: doc.name,
      parentBatchId: doc.parentBatchId ? doc.parentBatchId.toString() : null,
      ancestorIds: (doc.ancestorIds || []).map((a: any) => a.toString()),
      depth: doc.depth,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }
}

export const batchService = new BatchService();
