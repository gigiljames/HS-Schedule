import mongoose, { Schema, Document, Types } from 'mongoose';
import { ScheduleVersionStatus } from '../shared/index.js';

export interface IScheduleVersionDocument extends Document {
  planId: Types.ObjectId;
  institutionId: Types.ObjectId;
  versionNumber: number;
  status: ScheduleVersionStatus;
  publishedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleVersionSchema = new Schema<IScheduleVersionDocument>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'SchedulePlan', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    versionNumber: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

ScheduleVersionSchema.index({ planId: 1, versionNumber: 1 }, { unique: true });
ScheduleVersionSchema.index({ institutionId: 1, status: 1 });

export const ScheduleVersionModel = mongoose.model<IScheduleVersionDocument>(
  'ScheduleVersion',
  ScheduleVersionSchema
);
