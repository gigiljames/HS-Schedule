import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScheduleAssignmentDocument extends Document {
  scheduleVersionId: Types.ObjectId;
  rotationTrackId: Types.ObjectId;
  periodId: Types.ObjectId;
  departmentId: Types.ObjectId;
  batchNodeId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleAssignmentSchema = new Schema<IScheduleAssignmentDocument>(
  {
    scheduleVersionId: { type: Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
    rotationTrackId: { type: Schema.Types.ObjectId, ref: 'RotationTrack', required: true },
    periodId: { type: Schema.Types.ObjectId, ref: 'SchedulePeriod', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    batchNodeId: { type: Schema.Types.ObjectId, ref: 'BatchNode', required: true }
  },
  { timestamps: true }
);

/**
 * Mandatory Duplicate Assignment Rule:
 * A batch must NOT be assigned more than once to the same period within the same track,
 * preventing a batch from appearing under multiple departments during that period.
 * (Separate tracks may legitimately assign the same batch for overlapping periods).
 */
ScheduleAssignmentSchema.index(
  { scheduleVersionId: 1, rotationTrackId: 1, periodId: 1, batchNodeId: 1 },
  { unique: true }
);

ScheduleAssignmentSchema.index({ scheduleVersionId: 1, periodId: 1 });
ScheduleAssignmentSchema.index({ scheduleVersionId: 1, departmentId: 1 });

export const ScheduleAssignmentModel = mongoose.model<IScheduleAssignmentDocument>(
  'ScheduleAssignment',
  ScheduleAssignmentSchema
);
