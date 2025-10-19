import { v4 as uuidv4 } from 'uuid';

export function generateMemberId(name: string): string {
  // 名前ベースのIDを生成（実際のプロジェクトではUUID）
  return uuidv4();
}

export function buildQrSource(url: string): string {
  // QRコード生成（Google Chart API使用）
  const encoded = encodeURIComponent(url);
  return `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encoded}`;
}

export function saveRoomMemberId(roomCode: string, memberId: string): void {
  localStorage.setItem(`mogfinder:room:${roomCode}:memberId`, memberId);
}

export function getRoomMemberId(roomCode: string): string | null {
  return localStorage.getItem(`mogfinder:room:${roomCode}:memberId`);
}

const getRoomProgressMap = (): Record<string, number> => {
  const stored = localStorage.getItem('mogfinder_room_progress');
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, number>;
  } catch {
    return {};
  }
};

const saveRoomProgressMap = (map: Record<string, number>): void => {
  localStorage.setItem('mogfinder_room_progress', JSON.stringify(map));
};

export function saveRoomProgress(roomCode: string, memberId: string, index: number): void {
  const key = `${roomCode}:${memberId}`;
  const map = getRoomProgressMap();
  map[key] = index;
  saveRoomProgressMap(map);
}

export function getRoomProgress(roomCode: string, memberId: string): number | null {
  const key = `${roomCode}:${memberId}`;
  const map = getRoomProgressMap();
  return map[key] ?? null;
}
