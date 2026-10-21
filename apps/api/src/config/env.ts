import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from current dir first, with workspace root fallback if available
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/hs_schedule_planner'),
  ADMIN_WEB_URL: z.string().default('http://localhost:5173'),
  HS_PWA_URL: z.string().default('http://localhost:5174'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().default('default-super-secret-access-token-key-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('default-super-secret-refresh-token-key-32-chars-long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_BOOTSTRAP_USERNAME: z.string().default('admin'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().default('AdminSecurePass2026!'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().default('admin@institution.edu'),
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:admin@institution.edu')
});

export const env = envSchema.parse(process.env);
