import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = Number(process.env.MEMBER_TOKEN_TTL ?? 60 * 60 * 3);
const SECRET = process.env.MEMBER_TOKEN_SECRET ?? 'dev-member-token-secret';

interface TokenPayload {
  room_id: string;
  member_id: string;
  exp: number;
}

function encode(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function decode(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString()) as TokenPayload;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface SignedToken {
  token: string;
  expiresIn: number;
  expiresAt: Date;
}

export function signMemberToken(roomId: string, memberId: string): SignedToken {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload: TokenPayload = { room_id: roomId, member_id: memberId, exp };
  const token = encode(payload);
  return { token, expiresIn: TOKEN_TTL_SECONDS, expiresAt: new Date(exp * 1000) };
}

export interface VerifiedToken {
  roomId: string;
  memberId: string;
}

export function verifyMemberToken(token: string): VerifiedToken | null {
  const payload = decode(token);
  if (!payload) return null;
  return { roomId: payload.room_id, memberId: payload.member_id };
}
