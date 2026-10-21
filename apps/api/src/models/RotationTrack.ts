import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRotationTrackDocument extends Document {
  scheduleVersionId: Types.ObjectId;
  name: string;
  order: number;
  inheritParentAssignments: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RotationTrackSchema = new Schema<IRotationTrackDocument>(
  {
    scheduleVersionId: { type: Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    inheritParentAssignments: { type: Boolean, default: true }
  },
  { timestamps: true }
);

RotationTrackSchema.index({ scheduleVersionId: 1, order: 1 });

export const RotationTrackModel = mongoose.model<IRotationTrackDocument>('RotationTrack', RotationTrackSchema);
