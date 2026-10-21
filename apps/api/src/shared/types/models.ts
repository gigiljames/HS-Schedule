export interface IInstitution {
  id: string;
  name: string;
  shortName: string;
  location: string;
  codePrefix?: string;
  plainCode?: string;
  allowNewJoinees?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface INotificationPreferences {
  postingEndReminder: boolean;
  postingStartNotification: boolean;
  reminderTimeEnd: string; // e.g. "19:00" in 24h Asia/Kolkata
  reminderTimeStart: string; // e.g. "07:00" in 24h Asia/Kolkata
  hideDepartmentNameOnLockScreen: boolean;
}

export type MembershipStatus = 'active' | 'inactive';

export interface IInstitutionMembership {
  id: string;
  userId: string;
  institutionId: string;
  status: MembershipStatus;
  defaultScheduleRecordId?: string;
  notificationPreferences: INotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface IDepartment {
  id: string;
  institutionId: string;
  name: string;
  abbreviation: string;
  aliases: string[];
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBatchNode {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  parentBatchId?: string | null;
  ancestorIds: string[];
  depth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBatchTreeNode extends IBatchNode {
  children: IBatchTreeNode[];
}

export interface IHouseSurgeonRecord {
  id: string;
  institutionId: string;
  name: string;
  batchNodeIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISchedulePlan {
  id: string;
  institutionId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleVersionStatus = 'draft' | 'published' | 'archived';

export interface IScheduleVersion {
  id: string;
  planId: string;
  institutionId: string;
  versionNumber: number;
  status: ScheduleVersionStatus;
  publishedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRotationTrack {
  id: string;
  scheduleVersionId: string;
  name: string;
  order: number;
  inheritParentAssignments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISchedulePeriod {
  id: string;
  scheduleVersionId: string;
  rotationTrackId: string;
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive)
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface IScheduleAssignment {
  id: string;
  scheduleVersionId: string;
  rotationTrackId: string;
  periodId: string;
  departmentId: string;
  batchNodeId: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationEventType = 'posting_end_reminder' | 'posting_start_notification';
export type NotificationEventStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

export interface INotificationEvent {
  id: string;
  userId: string;
  institutionMembershipId: string;
  defaultScheduleRecordId: string;
  scheduleVersionId: string;
  eventType: NotificationEventType;
  scheduledFor: string;
  status: NotificationEventStatus;
  payload: {
    departmentName: string;
    departmentColor?: string;
    shiftStartDate: string;
    shiftEndDate: string;
  };
  attemptCount: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
