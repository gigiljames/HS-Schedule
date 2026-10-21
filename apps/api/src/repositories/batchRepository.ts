import { BatchNodeModel, IBatchNodeDocument } from '../models/BatchNode.js';
import { Types } from 'mongoose';

export class BatchRepository {
  async findById(id: string): Promise<IBatchNodeDocument | null> {
    return BatchNodeModel.findById(id);
  }

  async findByInstitutionAndCode(institutionId: string, code: string): Promise<IBatchNodeDocument | null> {
    return BatchNodeModel.findOne({
      institutionId,
      code: code.trim().toUpperCase()
    });
  }

  async findByIds(ids: string[] | Types.ObjectId[]): Promise<IBatchNodeDocument[]> {
    return BatchNodeModel.find({ _id: { $in: ids } });
  }

  async create(data: Partial<IBatchNodeDocument>): Promise<IBatchNodeDocument> {
    return BatchNodeModel.create(data);
  }

  async update(id: string, update: Partial<IBatchNodeDocument>): Promise<IBatchNodeDocument | null> {
    return BatchNodeModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async getAllByInstitution(institutionId: string, includeArchived = false): Promise<IBatchNodeDocument[]> {
    const filter: Record<string, unknown> = { institutionId };
    if (!includeArchived) {
      filter.isActive = true;
    }
    return BatchNodeModel.find(filter).sort({ depth: 1, code: 1 });
  }

  async findChildren(parentId: string): Promise<IBatchNodeDocument[]> {
    return BatchNodeModel.find({ parentBatchId: parentId, isActive: true });
  }
}

export const batchRepository = new BatchRepository();
