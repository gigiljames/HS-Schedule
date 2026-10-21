import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, UserStatus } from '../shared/index.js';

export interface IUserDocument extends Document {
  role: UserRole;
  email: string;
  displayName: string;
  username?: string;
  passwordHash?: string;
  googleSubjectId?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    role: { type: String, enum: ['admin', 'hs'], required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    username: { type: String, sparse: true, trim: true },
    passwordHash: { type: String },
    googleSubjectId: { type: String, sparse: true },
    status: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' }
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ googleSubjectId: 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
