import { z } from 'zod';

export const createDepartmentSchema = {
  body: z.object({
    institutionId: z.string().min(1, 'Institution ID is required'),
    name: z.string().min(2, 'Department name is required'),
    abbreviation: z.string().min(1, 'Abbreviation is required').max(10),
    aliases: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid 6-character hex code').optional()
  })
};

export const updateDepartmentSchema = {
  params: z.object({
    id: z.string().min(1, 'Department ID is required')
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    abbreviation: z.string().min(1).max(10).optional(),
    aliases: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    isActive: z.boolean().optional()
  })
};
