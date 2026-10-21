import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { IJwtPayload } from '../shared/index.js';

export function signAccessToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    jwtid: crypto.randomUUID()
  });
}

export function signRefreshToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    jwtid: crypto.randomUUID()
  });
}

export function verifyAccessToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as IJwtPayload;
}

export function verifyRefreshToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as IJwtPayload;
}
