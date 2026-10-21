import crypto from 'crypto';

export function generateAccessCode(shortName: string): { plainCode: string; codeHash: string; codePrefix: string } {
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
  const codePrefix = shortName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'COL';
  const plainCode = `${codePrefix}-${randomBytes.slice(0, 4)}-${randomBytes.slice(4)}`;
  const codeHash = hashAccessCode(plainCode);
  return { plainCode, codeHash, codePrefix };
}

export function hashAccessCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
