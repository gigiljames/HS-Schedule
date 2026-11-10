import { UserModel, IUserDocument } from '../models/User.js';

export class UserRepository {
  async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findByUsername(username: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ username: username.trim() });
  }

  async findByGoogleSubjectId(googleSubjectId: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ googleSubjectId });
  }

  async createUser(data: Partial<IUserDocument>): Promise<IUserDocument> {
    return UserModel.create(data);
  }

  async updateUser(id: string, update: Partial<IUserDocument>): Promise<IUserDocument | null> {
    return UserModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async listHsUsers(query: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'name' | 'createdAt' | 'lastActiveAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: IUserDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
    const filter: Record<string, unknown> = { role: 'hs' };

    if (query.search) {
      filter.$or = [
        { displayName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    let sortField = 'displayName';
    if (query.sortBy === 'createdAt') {
      sortField = 'createdAt';
    } else if (query.sortBy === 'lastActiveAt') {
      sortField = 'lastActiveAt';
    }

    const sortDir: 1 | -1 = query.sortOrder === 'desc' ? -1 : 1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDir };

    const queryChain = UserModel.find(filter);
    if (sortField === 'displayName') {
      queryChain.collation({ locale: 'en', strength: 2 });
    }

    const [items, total] = await Promise.all([
      queryChain
        .sort(sortOptions)
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      UserModel.countDocuments(filter)
    ]);

    return { items, total };
  }

  async countAdmins(): Promise<number> {
    return UserModel.countDocuments({ role: 'admin' });
  }

  async countTotalUsers(role?: string): Promise<number> {
    const filter = role ? { role } : {};
    return UserModel.countDocuments(filter);
  }
}

export const userRepository = new UserRepository();
