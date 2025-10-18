import { signMemberToken } from '../../../server/tokens.js';

export function issueMemberToken(roomId: string, memberId: string): string {
  return signMemberToken(roomId, memberId).token;
}
