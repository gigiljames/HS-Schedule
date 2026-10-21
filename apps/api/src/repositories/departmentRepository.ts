import { DepartmentModel, IDepartmentDocument } from '../models/Department.js';

export class DepartmentRepository {
  async findById(id: string): Promise<IDepartmentDocument | null> {
    return DepartmentModel.findById(id);
  }

  async findByInstitutionAndName(institutionId: string, name: string): Promise<IDepartmentDocument | null> {
    return DepartmentModel.findOne({
      institutionId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });
  }

  async create(data: Partial<IDepartmentDocument>): Promise<IDepartmentDocument> {
    return DepartmentModel.create(data);
  }

  async update(id: string, update: Partial<IDepartmentDocument>): Promise<IDepartmentDocument | null> {
    return DepartmentModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async delete(id: string): Promise<void> {
    await DepartmentModel.findByIdAndDelete(id);
  }

  async listByInstitution(
    institutionId: string,
    query: { search?: string; page?: number; pageSize?: number; includeArchived?: boolean }
  ): Promise<{ items: IDepartmentDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 50));
    const filter: Record<string, unknown> = { institutionId };

    if (!query.includeArchived) {
      filter.isActive = true;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { abbreviation: { $regex: query.search, $options: 'i' } },
        { aliases: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      DepartmentModel.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      DepartmentModel.countDocuments(filter)
    ]);

    return { items, total };
  }

  async getAllActiveByInstitution(institutionId: string): Promise<IDepartmentDocument[]> {
    return DepartmentModel.find({ institutionId, isActive: true }).sort({ name: 1 });
  }
}

export const departmentRepository = new DepartmentRepository();
