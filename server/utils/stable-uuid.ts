import crypto from 'node:crypto';

export function stableUuid(input: string): string {
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}
