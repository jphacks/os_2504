type StoredMemberSession = {
  memberId: string;
  memberName: string;
};

const prefix = 'mogfinder::session::';

export function loadParticipantSession(roomCode: string): StoredMemberSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${prefix}${roomCode}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMemberSession;
    if (parsed && typeof parsed.memberId === 'string') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveParticipantSession(roomCode: string, session: StoredMemberSession | null) {
  if (typeof window === 'undefined') return;
  const key = `${prefix}${roomCode}`;
  if (!session) {
    window.sessionStorage.removeItem(key);
    return;
  }
  window.sessionStorage.setItem(key, JSON.stringify(session));
}

export type { StoredMemberSession };
