import { z } from 'zod';

export const createPlanSchema = {
  body: z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
    name: z.string().min(2, 'Plan name must be at least 2 characters'),
    description: z.string().optional()
  })
};

export const createVersionSchema = {
  params: z.object({
    planId: z.string().min(1, 'Plan ID is required')
  }),
  body: z.object({
    notes: z.string().optional()
  })
};

export const createTrackSchema = {
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required')
  }),
  body: z.object({
    name: z.string().min(1, 'Track name is required')
  })
};

export const createPeriodSchema = {
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required')
  }),
  body: z.object({
    trackId: z.string().min(1, 'Track ID is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')
  })
};

export const updateCellSchema = {
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required')
  }),
  body: z.object({
    trackId: z.string().min(1, 'Track ID is required'),
    periodId: z.string().min(1, 'Period ID is required'),
    departmentId: z.string().min(1, 'Department ID is required'),
    batchNodeIds: z.array(z.string())
  })
};

export const previewScheduleSchema = {
  params: z.object({
    versionId: z.string().min(1, 'Version ID is required')
  }),
  query: z.object({
    rosterRecordId: z.string().min(1, 'Roster record ID is required'),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
};
