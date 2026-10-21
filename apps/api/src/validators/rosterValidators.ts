import { z } from 'zod';

export const createRosterSchema = {
  body: z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
    name: z.string().min(2, 'House Surgeon name must be at least 2 characters'),
    batchNodeIds: z.array(z.string()).min(1, 'At least one batch must be selected')
  })
};

export const updateRosterSchema = {
  params: z.object({
    id: z.string().min(1, 'Roster record ID is required')
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    batchNodeIds: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional()
  })
};
