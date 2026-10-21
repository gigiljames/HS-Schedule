import { HouseSurgeonRecordModel, IHouseSurgeonRecordDocument } from '../models/HouseSurgeonRecord.js';

export class RosterRepository {
  async findById(id: string): Promise<IHouseSurgeonRecordDocument | null> {
    return HouseSurgeonRecordModel.findById(id).populate('batchNodeIds');
  }

  async findByName(institutionId: string, name: string): Promise<IHouseSurgeonRecordDocument | null> {
    return HouseSurgeonRecordModel.findOne({
      institutionId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });
  }

  async create(data: Partial<IHouseSurgeonRecordDocument>): Promise<IHouseSurgeonRecordDocument> {
    return HouseSurgeonRecordModel.create(data);
  }

  async update(id: string, update: Partial<IHouseSurgeonRecordDocument>): Promise<IHouseSurgeonRecordDocument | null> {
    return HouseSurgeonRecordModel.findByIdAndUpdate(id, { $set: update }, { new: true }).populate('batchNodeIds');
  }

  async delete(id: string): Promise<void> {
    await HouseSurgeonRecordModel.findByIdAndDelete(id);
  }

  async list(
    institutionId: string,
    query: { search?: string; batchNodeId?: string; page?: number; pageSize?: number; includeArchived?: boolean; all?: boolean }
  ): Promise<{ items: IHouseSurgeonRecordDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = query.all ? 2000 : Math.min(500, Math.max(1, query.pageSize || 25));
    const filter: Record<string, unknown> = { institutionId };

    if (!query.includeArchived) {
      filter.isActive = true;
    }

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.batchNodeId) {
      filter.batchNodeIds = query.batchNodeId;
    }

    const [items, total] = await Promise.all([
      HouseSurgeonRecordModel.find(filter)
        .populate('batchNodeIds', 'code name depth')
        .sort({ name: 1 })
        .skip(query.all ? 0 : (page - 1) * pageSize)
        .limit(pageSize),
      HouseSurgeonRecordModel.countDocuments(filter)
    ]);

    return { items, total };
  }

  async getAllActiveByInstitution(institutionId: string): Promise<IHouseSurgeonRecordDocument[]> {
    return HouseSurgeonRecordModel.find({ institutionId, isActive: true })
      .populate('batchNodeIds', 'code name depth')
      .sort({ name: 1 });
  }

  async countTotal(): Promise<number> {
    return HouseSurgeonRecordModel.countDocuments();
  }
}

export const rosterRepository = new RosterRepository();
