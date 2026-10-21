import { z } from 'zod';

export const adminLoginSchema = {
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
  })
};

export const hsGoogleLoginSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required')
  })
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().optional()
  })
};

export const updateProfileSchema = {
  body: z.object({
    displayName: z.string().min(2, 'Display name must be at least 2 characters')
  })
};
