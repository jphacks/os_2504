import crypto from 'node:crypto';

export type RoomStatus = 'waiting' | 'voting';

export interface RoomSettings {
  latitude: number;
  longitude: number;
  radius: number;
  min_price_level: number;
  max_price_level: number;
}

export interface PreparationState {
  started: boolean;
  progress: number;
  preparedCount: number;
  expectedCount: number;
}

export interface Room {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: RoomStatus;
  settings: RoomSettings;
  shareUrl: string;
  preparation: PreparationState;
  members: Map<string, Member>;
  restaurants: Map<string, Restaurant>;
  likes: Map<string, Like>;
  createdAt: Date;
  prepTimers: NodeJS.Timeout[];
}

export interface Member {
  memberId: string;
  memberName: string;
  createdAt: Date;
}

export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  photo_urls: string[];
  types: string[];
  latitude: number;
  longitude: number;
  summary_simple: string;
  summary_detail: string;
  google_maps_url: string;
}

export interface Like {
  memberId: string;
  placeId: string;
  isLiked: boolean;
  updatedAt: Date;
}

export interface CreateRoomInput {
  roomName: string;
  settings: Partial<RoomSettings>;
}

const rooms = new Map<string, Room>();

const DEFAULT_SETTINGS: RoomSettings = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3.0,
  min_price_level: 0,
  max_price_level: 4,
};

const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    place_id: 'sample-izakaya-1',
    name: 'トリキン 神田店',
    address: '東京都千代田区内神田1-1-1',
    rating: 4.2,
    user_ratings_total: 230,
    photo_urls: ['https://picsum.photos/seed/izakaya1/640/480'],
    types: ['izakaya', 'japanese'],
    latitude: 35.691,
    longitude: 139.768,
    summary_simple: '焼き鳥が人気・0.3km',
    summary_detail: 'コスパの良い焼き鳥が楽しめる居酒屋。少人数の飲み会に最適。',
    google_maps_url: 'https://maps.google.com/?cid=sample-izakaya-1',
  },
  {
    place_id: 'sample-bistro-1',
    name: 'Bistro Sakura',
    address: '東京都千代田区鍛冶町2-2-2',
    rating: 4.5,
    user_ratings_total: 120,
    photo_urls: ['https://picsum.photos/seed/bistro1/640/480'],
    types: ['bistro', 'western'],
    latitude: 35.689,
    longitude: 139.77,
    summary_simple: '女子会向け・0.5km',
    summary_detail: 'ワインと創作料理が楽しめるビストロ。雰囲気重視の会におすすめ。',
    google_maps_url: 'https://maps.google.com/?cid=sample-bistro-1',
  },
  {
    place_id: 'sample-ramen-1',
    name: '拉麺 龍神',
    address: '東京都千代田区外神田3-3-3',
    rating: 4.0,
    user_ratings_total: 540,
    photo_urls: ['https://picsum.photos/seed/ramen1/640/480'],
    types: ['ramen'],
    latitude: 35.7,
    longitude: 139.77,
    summary_simple: '深夜営業・1.0km',
    summary_detail: '濃厚魚介スープが人気のラーメン店。二次会の締めにもぴったり。',
    google_maps_url: 'https://maps.google.com/?cid=sample-ramen-1',
  },
];

const SHARE_BASE_URL = (process.env.APP_SHARE_BASE_URL ?? 'https://mogfinder.app') + '/r/';

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    const idx = crypto.randomInt(0, alphabet.length);
    code += alphabet[idx];
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function cloneSettings(partial?: Partial<RoomSettings>): RoomSettings {
  return {
    latitude: partial?.latitude ?? DEFAULT_SETTINGS.latitude,
    longitude: partial?.longitude ?? DEFAULT_SETTINGS.longitude,
    radius: partial?.radius ?? DEFAULT_SETTINGS.radius,
    min_price_level: partial?.min_price_level ?? DEFAULT_SETTINGS.min_price_level,
    max_price_level: partial?.max_price_level ?? DEFAULT_SETTINGS.max_price_level,
  };
}

export function createRoom(input: CreateRoomInput): Room {
  const roomId = crypto.randomUUID();
  const roomCode = generateRoomCode();
  const settings = cloneSettings(input.settings);
  const room: Room = {
    roomId,
    roomCode,
    roomName: input.roomName,
    status: 'waiting',
    settings,
    shareUrl: `${SHARE_BASE_URL}${roomCode}`,
    preparation: { started: true, progress: 0, preparedCount: 0, expectedCount: SAMPLE_RESTAURANTS.length },
    members: new Map(),
    restaurants: new Map(),
    likes: new Map(),
    createdAt: new Date(),
    prepTimers: [],
  };

  rooms.set(roomCode, room);
  schedulePreparation(room);
  return room;
}

export function getRoomByCode(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function updateRoomSettings(room: Room, partial: Partial<RoomSettings>): Room {
  room.settings = {
    ...room.settings,
    ...(typeof partial.latitude === 'number' ? { latitude: partial.latitude } : {}),
    ...(typeof partial.longitude === 'number' ? { longitude: partial.longitude } : {}),
    ...(typeof partial.radius === 'number' ? { radius: partial.radius } : {}),
    ...(typeof partial.min_price_level === 'number' ? { min_price_level: partial.min_price_level } : {}),
    ...(typeof partial.max_price_level === 'number' ? { max_price_level: partial.max_price_level } : {}),
  };
  schedulePreparation(room);
  return room;
}

export function addMember(room: Room, memberName: string): Member {
  const memberId = crypto.randomUUID();
  const member: Member = { memberId, memberName, createdAt: new Date() };
  room.members.set(memberId, member);
  return member;
}

export function listMembers(room: Room): Member[] {
  return [...room.members.values()];
}

export function getMember(room: Room, memberId: string): Member | undefined {
  return room.members.get(memberId);
}

export function ensureRestaurantsPrepared(room: Room): Restaurant[] {
  if (room.restaurants.size === 0) {
    SAMPLE_RESTAURANTS.forEach((restaurant) => {
      room.restaurants.set(restaurant.place_id, { ...restaurant });
    });
  }
  return [...room.restaurants.values()];
}

function schedulePreparation(room: Room): void {
  room.prepTimers.forEach((timer) => clearTimeout(timer));
  room.prepTimers = [];

  room.status = 'waiting';
  room.preparation = {
    started: true,
    progress: 0,
    preparedCount: 0,
    expectedCount: SAMPLE_RESTAURANTS.length,
  };

  const steps = [
    { delay: 500, progress: 35, preparedCount: 10 },
    { delay: 1100, progress: 70, preparedCount: 20 },
    { delay: 1700, progress: 100, preparedCount: SAMPLE_RESTAURANTS.length },
  ];

  steps.forEach(({ delay, progress, preparedCount }) => {
    const timer = setTimeout(() => {
      room.preparation.progress = progress;
      room.preparation.preparedCount = preparedCount;
      if (progress === 100) {
        ensureRestaurantsPrepared(room);
        room.status = 'voting';
      }
    }, delay);
    room.prepTimers.push(timer);
  });
}

export interface RecordLikeInput {
  room: Room;
  memberId: string;
  placeId: string;
  isLiked: boolean;
}

export function recordLike({ room, memberId, placeId, isLiked }: RecordLikeInput): Like {
  const key = `${memberId}:${placeId}`;
  const like: Like = {
    memberId,
    placeId,
    isLiked,
    updatedAt: new Date(),
  };
  room.likes.set(key, like);
  return like;
}

export interface ListLikesParams {
  room: Room;
  memberIds?: string[];
  placeId?: string;
  isLiked?: boolean;
}

export function listLikes({ room, memberIds, placeId, isLiked }: ListLikesParams): Like[] {
  const likes = [...room.likes.values()];
  return likes.filter((like) => {
    if (memberIds && memberIds.length > 0 && !memberIds.includes(like.memberId)) return false;
    if (placeId && like.placeId !== placeId) return false;
    if (typeof isLiked === 'boolean' && like.isLiked !== isLiked) return false;
    return true;
  });
}

export function resetLikes(room: Room, memberId: string): number {
  let count = 0;
  [...room.likes.keys()].forEach((key) => {
    if (key.startsWith(`${memberId}:`)) {
      room.likes.delete(key);
      count += 1;
    }
  });
  return count;
}

export interface RankingItem {
  place_id: string;
  name: string;
  score: number;
  like_count: number;
  dislike_count: number;
  rating: number;
  user_ratings_total: number;
  google_maps_url: string;
  rank: number;
}

export function getRanking(room: Room): RankingItem[] {
  ensureRestaurantsPrepared(room);
  const stats = new Map<string, { likes: number; dislikes: number }>();

  room.likes.forEach((like) => {
    const entry = stats.get(like.placeId) ?? { likes: 0, dislikes: 0 };
    if (like.isLiked) entry.likes += 1;
    else entry.dislikes += 1;
    stats.set(like.placeId, entry);
  });

  const alpha = 1.0;
  const ranking = [...room.restaurants.values()].map((restaurant) => {
    const stat = stats.get(restaurant.place_id) ?? { likes: 0, dislikes: 0 };
    return {
      place_id: restaurant.place_id,
      name: restaurant.name,
      score: stat.likes - alpha * stat.dislikes,
      like_count: stat.likes,
      dislike_count: stat.dislikes,
      rating: restaurant.rating,
      user_ratings_total: restaurant.user_ratings_total,
      google_maps_url: restaurant.google_maps_url,
    };
  });

  ranking.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.user_ratings_total - a.user_ratings_total;
  });

  return ranking.map((item, index) => ({ ...item, rank: index + 1 }));
}

export function serializeRoom(room: Room) {
  return {
    room_id: room.roomId,
    room_code: room.roomCode,
    room_name: room.roomName,
    share_url: room.shareUrl,
    status: room.status,
    settings: room.settings,
    preparation: room.preparation,
  };
}
