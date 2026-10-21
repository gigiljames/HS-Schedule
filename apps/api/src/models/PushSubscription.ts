import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPushSubscriptionDocument extends Document {
  userId: Types.ObjectId;
  institutionId: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  isValid: boolean;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    isValid: { type: Boolean, default: true },
    userAgent: { type: String }
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1, institutionId: 1, isValid: 1 });

export const PushSubscriptionModel = mongoose.model<IPushSubscriptionDocument>(
  'PushSubscription',
  PushSubscriptionSchema
);
