import { InstitutionModel, IInstitutionDocument } from '../models/Institution.js';
import { InstitutionMembershipModel, IInstitutionMembershipDocument } from '../models/InstitutionMembership.js';
import { UserModel } from '../models/User.js';

export class InstitutionRepository {
  async findById(id: string): Promise<IInstitutionDocument | null> {
    return InstitutionModel.findById(id);
  }

  async findByCodeHash(codeHash: string): Promise<IInstitutionDocument | null> {
    return InstitutionModel.findOne({ codeHash, isActive: true });
  }

  async create(data: Partial<IInstitutionDocument>): Promise<IInstitutionDocument> {
    return InstitutionModel.create(data);
  }

  async update(id: string, update: Partial<IInstitutionDocument>): Promise<IInstitutionDocument | null> {
    return InstitutionModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async list(query: { search?: string; page?: number; pageSize?: number; includeArchived?: boolean }): Promise<{ items: IInstitutionDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const filter: Record<string, unknown> = {};

    if (!query.includeArchived) {
      filter.isActive = true;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { shortName: { $regex: query.search, $options: 'i' } },
        { location: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      InstitutionModel.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      InstitutionModel.countDocuments(filter)
    ]);

    return { items, total };
  }

  async countTotal(): Promise<number> {
    return InstitutionModel.countDocuments();
  }

  // Membership queries
  async findMembership(userId: string, institutionId: string): Promise<IInstitutionMembershipDocument | null> {
    return InstitutionMembershipModel.findOne({ userId, institutionId });
  }

  async findActiveMembershipByUser(userId: string): Promise<IInstitutionMembershipDocument | null> {
    return InstitutionMembershipModel.findOne({ userId, status: 'active' }).populate('institutionId');
  }

  async createOrUpdateMembership(
    userId: string,
    institutionId: string,
    data: Partial<IInstitutionMembershipDocument>
  ): Promise<IInstitutionMembershipDocument> {
    return InstitutionMembershipModel.findOneAndUpdate(
      { userId, institutionId },
      { $set: { ...data, status: 'active' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async updateMembership(
    userId: string,
    institutionId: string,
    update: Partial<IInstitutionMembershipDocument>
  ): Promise<IInstitutionMembershipDocument | null> {
    return InstitutionMembershipModel.findOneAndUpdate(
      { userId, institutionId },
      { $set: update },
      { new: true }
    );
  }

  async listMembershipsByInstitution(
    institutionId: string,
    query: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ items: IInstitutionMembershipDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));

    const filter: Record<string, unknown> = { institutionId };

    if (query.search) {
      const matchingUsers = await UserModel.find({
        $or: [
          { displayName: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);
      filter.userId = { $in: userIds };
    }

    const [items, total] = await Promise.all([
      InstitutionMembershipModel.find(filter)
        .populate('userId', 'displayName email status')
        .populate('defaultScheduleRecordId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      InstitutionMembershipModel.countDocuments(filter)
    ]);

    return { items, total };
  }

  async removeMembership(membershipId: string): Promise<void> {
    await InstitutionMembershipModel.findByIdAndDelete(membershipId);
  }

  async countActiveMemberships(): Promise<number> {
    return InstitutionMembershipModel.countDocuments({ status: 'active' });
  }
}

export const institutionRepository = new InstitutionRepository();
