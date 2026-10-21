import mongoose, { Schema, Document, Types } from 'mongoose';
import { MembershipStatus } from '../shared/index.js';

export interface IInstitutionMembershipDocument extends Document {
  userId: Types.ObjectId;
  institutionId: Types.ObjectId;
  status: MembershipStatus;
  defaultScheduleRecordId?: Types.ObjectId;
  notificationPreferences: {
    postingEndReminder: boolean;
    postingStartNotification: boolean;
    reminderTimeEnd: string;
    reminderTimeStart: string;
    hideDepartmentNameOnLockScreen: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InstitutionMembershipSchema = new Schema<IInstitutionMembershipDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    defaultScheduleRecordId: { type: Schema.Types.ObjectId, ref: 'HouseSurgeonRecord' },
    notificationPreferences: {
      postingEndReminder: { type: Boolean, default: true },
      postingStartNotification: { type: Boolean, default: true },
      reminderTimeEnd: { type: String, default: '19:00' },
      reminderTimeStart: { type: String, default: '07:00' },
      hideDepartmentNameOnLockScreen: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

InstitutionMembershipSchema.index({ userId: 1, institutionId: 1 }, { unique: true });
InstitutionMembershipSchema.index({ institutionId: 1, status: 1 });

export const InstitutionMembershipModel = mongoose.model<IInstitutionMembershipDocument>(
  'InstitutionMembership',
  InstitutionMembershipSchema
);
