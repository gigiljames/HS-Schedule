import { z } from 'zod';

export const createInstitutionSchema = {
  body: z.object({
    name: z.string().min(2, 'Institution name must be at least 2 characters'),
    shortName: z.string().min(2, 'Short name must be at least 2 characters').max(10, 'Short name cannot exceed 10 characters'),
    location: z.string().min(2, 'Location is required')
  })
};

export const updateInstitutionSchema = {
  params: z.object({
    id: z.string().min(1, 'Institution ID is required')
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    shortName: z.string().min(2).max(10).optional(),
    location: z.string().min(2).optional(),
    isActive: z.boolean().optional()
  })
};

export const joinInstitutionSchema = {
  body: z.object({
    accessCode: z.string().min(4, 'Access code is required')
  })
};

export const setDefaultScheduleRecordSchema = {
  params: z.object({
    institutionId: z.string().min(1, 'Institution ID is required')
  }),
  body: z.object({
    rosterRecordId: z.string().min(1, 'Roster record ID is required')
  })
};

export const updateNotificationPreferencesSchema = {
  params: z.object({
    institutionId: z.string().min(1, 'Institution ID is required')
  }),
  body: z.object({
    postingEndReminder: z.boolean().optional(),
    postingStartNotification: z.boolean().optional(),
    reminderTimeEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
    reminderTimeStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
    hideDepartmentNameOnLockScreen: z.boolean().optional()
  })
};
