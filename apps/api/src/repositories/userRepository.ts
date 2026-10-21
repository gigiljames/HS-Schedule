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

  async listHsUsers(query: { search?: string; page?: number; pageSize?: number }): Promise<{ items: IUserDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const filter: Record<string, unknown> = { role: 'hs' };

    if (query.search) {
      filter.$or = [
        { displayName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
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
