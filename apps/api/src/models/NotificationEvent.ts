import mongoose, { Schema, Document, Types } from 'mongoose';
import { NotificationEventStatus, NotificationEventType } from '../shared/index.js';

export interface INotificationEventDocument extends Document {
  userId: Types.ObjectId;
  institutionMembershipId: Types.ObjectId;
  defaultScheduleRecordId: Types.ObjectId;
  scheduleVersionId: Types.ObjectId;
  eventType: NotificationEventType;
  scheduledFor: Date;
  status: NotificationEventStatus;
  idempotencyKey: string;
  attemptCount: number;
  sentAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationEventSchema = new Schema<INotificationEventDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionMembershipId: { type: Schema.Types.ObjectId, ref: 'InstitutionMembership', required: true },
    defaultScheduleRecordId: { type: Schema.Types.ObjectId, ref: 'HouseSurgeonRecord', required: true },
    scheduleVersionId: { type: Schema.Types.ObjectId, ref: 'ScheduleVersion', required: true },
    eventType: {
      type: String,
      enum: ['posting_end_reminder', 'posting_start_notification'],
      required: true
    },
    scheduledFor: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
      default: 'pending'
    },
    idempotencyKey: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    sentAt: { type: Date },
    lastError: { type: String }
  },
  { timestamps: true }
);

NotificationEventSchema.index({ idempotencyKey: 1 }, { unique: true });
NotificationEventSchema.index({ status: 1, scheduledFor: 1 });
NotificationEventSchema.index({ scheduleVersionId: 1, status: 1 });

export const NotificationEventModel = mongoose.model<INotificationEventDocument>(
  'NotificationEvent',
  NotificationEventSchema
);
