import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuthSessionDocument extends Document {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuthSessionSchema = new Schema<IAuthSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

AuthSessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
AuthSessionSchema.index({ userId: 1, isRevoked: 1 });
AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const AuthSessionModel = mongoose.model<IAuthSessionDocument>('AuthSession', AuthSessionSchema);
