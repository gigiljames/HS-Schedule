import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISchedulePeriodDocument extends Document {
  scheduleVersionId: Types.ObjectId;
  rotationTrackId: Types.ObjectId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SchedulePeriodSchema = new Schema<ISchedulePeriodDocument>(
  {
    scheduleVersionId: { type: Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
    rotationTrackId: { type: Schema.Types.ObjectId, ref: 'RotationTrack', required: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

SchedulePeriodSchema.index(
  { scheduleVersionId: 1, rotationTrackId: 1, startDate: 1, endDate: 1 },
  { unique: true }
);
SchedulePeriodSchema.index({ scheduleVersionId: 1, rotationTrackId: 1, order: 1 });

export const SchedulePeriodModel = mongoose.model<ISchedulePeriodDocument>('SchedulePeriod', SchedulePeriodSchema);
