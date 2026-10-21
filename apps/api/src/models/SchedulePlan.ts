import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISchedulePlanDocument extends Document {
  institutionId: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchedulePlanSchema = new Schema<ISchedulePlanDocument>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

SchedulePlanSchema.index({ institutionId: 1, name: 1 });

export const SchedulePlanModel = mongoose.model<ISchedulePlanDocument>('SchedulePlan', SchedulePlanSchema);
