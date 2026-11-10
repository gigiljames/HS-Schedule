import mongoose from 'mongoose';
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

  async list(query: {
    search?: string;
    page?: number;
    pageSize?: number;
    includeArchived?: boolean;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: IInstitutionDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
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

    const sortField = query.sortBy === 'createdAt' ? 'createdAt' : 'name';
    const sortDir: 1 | -1 = query.sortOrder === 'desc' ? -1 : 1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDir };

    const queryChain = InstitutionModel.find(filter);
    if (sortField === 'name') {
      queryChain.collation({ locale: 'en', strength: 2 });
    }

    const [items, total] = await Promise.all([
      queryChain
        .sort(sortOptions)
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
    query: {
      search?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'name' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
    const sortBy = query.sortBy || 'name';
    const sortDir: 1 | -1 = query.sortOrder === 'desc' ? -1 : 1;

    const matchStage: any = {
      institutionId: new mongoose.Types.ObjectId(institutionId)
    };

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];

    if (query.search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.displayName': { $regex: query.search, $options: 'i' } },
            { 'user.email': { $regex: query.search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'housesurgeonrecords',
          localField: 'defaultScheduleRecordId',
          foreignField: '_id',
          as: 'defaultSchedule'
        }
      },
      {
        $unwind: {
          path: '$defaultSchedule',
          preserveNullAndEmptyArrays: true
        }
      }
    );

    const sortStage: any = {};
    if (sortBy === 'createdAt') {
      sortStage.createdAt = sortDir;
    } else {
      sortStage['user.displayName'] = sortDir;
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize }
        ]
      }
    });

    const [result] = await InstitutionMembershipModel.aggregate(pipeline).collation({ locale: 'en', strength: 2 });
    const total = result?.metadata[0]?.total || 0;
    const items = (result?.data || []).map((doc: any) => ({
      _id: doc._id,
      institutionId: doc.institutionId,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      userId: {
        _id: doc.user._id,
        displayName: doc.user.displayName,
        email: doc.user.email,
        status: doc.user.status,
        lastActiveAt: doc.user.lastActiveAt
      },
      defaultScheduleRecordId: doc.defaultSchedule ? {
        _id: doc.defaultSchedule._id,
        name: doc.defaultSchedule.name
      } : null
    }));

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
