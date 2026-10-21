import { z } from 'zod';

export const createBatchSchema = {
  body: z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
    code: z.string().min(1, 'Batch code is required').max(15),
    name: z.string().min(1, 'Batch name is required'),
    parentBatchId: z.string().optional()
  })
};

export const updateBatchSchema = {
  params: z.object({
    id: z.string().min(1, 'Batch ID is required')
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).max(15).optional(),
    parentBatchId: z.string().nullable().optional(),
    isActive: z.boolean().optional()
  })
};
