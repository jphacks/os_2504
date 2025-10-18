import crypto from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from './db/client.js';
import {
  likes,
  members,
  ratings,
  restaurants,
  roomRestaurants,
  rooms,
  roomSettings,
} from '../db/schema.js';
import { sampleRestaurants } from './sample-data.js';
import { stableUuid } from './utils/stable-uuid.js';

type RoomRow = InferSelectModel<typeof rooms>;
type RoomSettingsRow = InferSelectModel<typeof roomSettings>;
type MemberRow = InferSelectModel<typeof members>;
type RestaurantRow = InferSelectModel<typeof restaurants>;

export type RoomStatus = RoomRow['status'];

export interface RoomWithSettings {
  room: RoomRow;
  settings: RoomSettingsRow;
}

export interface CreateRoomInput {
  roomName: string;
  settings: Partial<RoomSettingsInput>;
}

export interface RoomSettingsInput {
  latitude?: number;
  longitude?: number;
  radius?: number;
  min_price_level?: number;
  max_price_level?: number;
}

export interface RecordLikeInput {
  roomId: string;
  memberId: string;
  placeId: string;
  isLiked: boolean;
}

export interface ListLikesParams {
  roomId: string;
  memberIds?: string[];
  placeId?: string;
  isLiked?: boolean;
}

export interface LikeView {
  memberId: string;
  placeId: string;
  isLiked: boolean;
  updatedAt: Date;
}

export interface RestaurantView {
  place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  photo_urls: string[];
  types: string[];
  latitude: number;
  longitude: number;
  summary_simple: string | null;
  summary_detail: string | null;
  google_maps_url: string | null;
}

export interface RestaurantDetail extends RestaurantView {
  phone_number: string | null;
  website: string | null;
  opening_hours: Record<string, unknown> | null;
}

export interface RestaurantReview {
  id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  time: string | null;
}

export interface RankingItem {
  place_id: string;
  name: string;
  score: number;
  like_count: number;
  dislike_count: number;
  rating: number | null;
  user_ratings_total: number | null;
  google_maps_url: string | null;
  rank: number;
}

type SettingsShape = Pick<RoomSettingsRow, 'radius' | 'latitude' | 'longitude' | 'minPriceLevel' | 'maxPriceLevel'>;

const DEFAULT_SETTINGS: SettingsShape = {
  radius: 3,
  latitude: 35.681236,
  longitude: 139.767125,
  minPriceLevel: 0,
  maxPriceLevel: 4,
};

const rawShareBase =
  process.env.APP_SHARE_BASE_URL ??
  (process.env.NODE_ENV === 'production' ? 'https://mogfinder.app' : 'http://localhost:5173');
const SHARE_BASE_URL = `${rawShareBase.replace(/\/+$/, '')}/r/`;

const SAMPLE_RESTAURANTS = sampleRestaurants;

const preparationTimers = new Map<string, NodeJS.Timeout[]>();

const PREPARATION_STEPS: Array<{ delay: number; progress: number; fraction: number; final?: boolean }> = [
  { delay: 500, progress: 35, fraction: 0.3 },
  { delay: 1100, progress: 70, fraction: 0.7 },
  { delay: 1700, progress: 100, fraction: 1, final: true },
];

function applySettings(partial: Partial<RoomSettingsInput>, base?: SettingsShape): SettingsShape {
  const source = base ?? DEFAULT_SETTINGS;
  return {
    radius: partial.radius ?? source.radius,
    latitude: partial.latitude ?? source.latitude,
    longitude: partial.longitude ?? source.longitude,
    minPriceLevel: partial.min_price_level ?? source.minPriceLevel,
    maxPriceLevel: partial.max_price_level ?? source.maxPriceLevel,
  };
}

function serializeSettings(settings: SettingsShape) {
  return {
    latitude: settings.latitude,
    longitude: settings.longitude,
    radius: settings.radius,
    min_price_level: settings.minPriceLevel,
    max_price_level: settings.maxPriceLevel,
  };
}

async function generateRoomCode(): Promise<string> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      const idx = crypto.randomInt(0, alphabet.length);
      code += alphabet[idx];
    }
    const existing = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.roomCode, code))
      .limit(1);
    if (existing.length === 0) {
      return code;
    }
  }
}

async function getRoomById(roomId: string): Promise<RoomWithSettings | undefined> {
  const result = await db
    .select({ room: rooms, settings: roomSettings })
    .from(rooms)
    .innerJoin(roomSettings, eq(rooms.id, roomSettings.roomId))
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (result.length === 0) return undefined;
  const record = result[0];
  if (!record?.room || !record?.settings) return undefined;
  return { room: record.room, settings: record.settings };
}

async function updateRoomPreparation(
  roomId: string,
  patch: Partial<Pick<RoomRow, 'status' | 'prepStarted' | 'prepProgress' | 'prepPreparedCount' | 'prepExpectedCount'>>,
): Promise<void> {
  await db
    .update(rooms)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, roomId));
}

function schedulePreparation(roomId: string, expectedCount: number): void {
  const existing = preparationTimers.get(roomId);
  if (existing) {
    existing.forEach((timer) => clearTimeout(timer));
    preparationTimers.delete(roomId);
  }

  void updateRoomPreparation(roomId, {
    status: 'waiting',
    prepStarted: true,
    prepProgress: 0,
    prepPreparedCount: 0,
    prepExpectedCount: expectedCount,
  });

  const timers: NodeJS.Timeout[] = PREPARATION_STEPS.map((step) =>
    setTimeout(() => {
      void (async () => {
        try {
          const preparedCount = Math.min(expectedCount, Math.round(expectedCount * step.fraction));
          await updateRoomPreparation(roomId, {
            prepProgress: step.progress,
            prepPreparedCount: preparedCount,
          });
          if (step.final) {
            await seedSampleRestaurants(roomId);
            await updateRoomPreparation(roomId, {
              status: 'voting',
              prepProgress: 100,
              prepPreparedCount: expectedCount,
              prepExpectedCount: expectedCount,
            });
            preparationTimers.delete(roomId);
          }
        } catch (error) {
          console.error('[schedulePreparation] failed', error);
        }
      })();
    }, step.delay),
  );

  preparationTimers.set(roomId, timers);
}

async function seedSampleRestaurants(roomId: string): Promise<void> {
  await db.transaction(async (tx) => {
    for (const sample of SAMPLE_RESTAURANTS) {
      await tx
        .insert(restaurants)
        .values({
          placeId: sample.place_id,
          name: sample.name,
          address: sample.address,
          rating: sample.rating,
          userRatingsTotal: sample.user_ratings_total,
          photoUrls: sample.photo_urls,
          types: sample.types,
          latitude: sample.latitude,
          longitude: sample.longitude,
          summarySimple: sample.summary_simple,
          summaryDetail: sample.summary_detail,
          googleMapsUrl: sample.google_maps_url,
          phoneNumber: sample.phone_number ?? null,
          website: sample.website ?? null,
          openingHours: sample.opening_hours ?? null,
        })
        .onConflictDoNothing({ target: restaurants.placeId });
    }

    if (SAMPLE_RESTAURANTS.length > 0) {
      await tx
        .insert(roomRestaurants)
        .values(
          SAMPLE_RESTAURANTS.map((restaurant) => ({
            roomId,
            placeId: restaurant.place_id,
          })),
        )
        .onConflictDoNothing({ target: [roomRestaurants.roomId, roomRestaurants.placeId] });
    }

    for (const sample of SAMPLE_RESTAURANTS) {
      if (!sample.reviews?.length) continue;
      for (const review of sample.reviews) {
        const reviewId = stableUuid(`${roomId}:${sample.place_id}:${review.author_name}:${review.time}`);
        await tx
          .insert(ratings)
          .values({
            id: reviewId,
            placeId: sample.place_id,
            authorName: review.author_name,
            rating: review.rating,
            text: review.text,
            time: new Date(review.time),
          })
          .onConflictDoNothing({ target: ratings.id });
      }
    }
  });
}

function toRestaurantView(row: RestaurantRow): RestaurantView {
  return {
    place_id: row.placeId,
    name: row.name,
    address: row.address ?? null,
    rating: row.rating ?? null,
    user_ratings_total: row.userRatingsTotal ?? null,
    photo_urls: Array.isArray(row.photoUrls) ? row.photoUrls : [],
    types: Array.isArray(row.types) ? row.types : [],
    latitude: row.latitude,
    longitude: row.longitude,
    summary_simple: row.summarySimple ?? null,
    summary_detail: row.summaryDetail ?? null,
    google_maps_url: row.googleMapsUrl ?? null,
  };
}

function toRestaurantDetail(row: RestaurantRow): RestaurantDetail {
  return {
    ...toRestaurantView(row),
    phone_number: row.phoneNumber ?? null,
    website: row.website ?? null,
    opening_hours: (row.openingHours as Record<string, unknown> | null) ?? null,
  };
}

async function fetchRestaurantsForRoom(roomId: string): Promise<RestaurantRow[]> {
  const rows = await db
    .select({ restaurant: restaurants })
    .from(roomRestaurants)
    .innerJoin(restaurants, eq(roomRestaurants.placeId, restaurants.placeId))
    .where(eq(roomRestaurants.roomId, roomId));
  return rows.map((row) => row.restaurant);
}

export async function createRoom(input: CreateRoomInput): Promise<RoomWithSettings> {
  const settingsValues = applySettings(input.settings);
  const roomCode = await generateRoomCode();
  const shareUrl = `${SHARE_BASE_URL}${roomCode}`;
  const expectedCount = SAMPLE_RESTAURANTS.length;
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [roomRecord] = await tx
      .insert(rooms)
      .values({
        roomCode,
        roomName: input.roomName,
        roomUrl: shareUrl,
        status: 'waiting',
        prepStarted: true,
        prepProgress: 0,
        prepPreparedCount: 0,
        prepExpectedCount: expectedCount,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!roomRecord) {
      throw new Error('ROOM_INSERT_FAILED');
    }

    const [settingsRecord] = await tx
      .insert(roomSettings)
      .values({
        roomId: roomRecord.id,
        radius: settingsValues.radius,
        latitude: settingsValues.latitude,
        longitude: settingsValues.longitude,
        minPriceLevel: settingsValues.minPriceLevel,
        maxPriceLevel: settingsValues.maxPriceLevel,
        updatedAt: now,
      })
      .returning();

    if (!settingsRecord) {
      throw new Error('ROOM_SETTINGS_INSERT_FAILED');
    }

    return { room: roomRecord, settings: settingsRecord } satisfies RoomWithSettings;
  });

  schedulePreparation(result.room.id, expectedCount);

  return result;
}

export async function getRoomByCode(roomCode: string): Promise<RoomWithSettings | undefined> {
  const result = await db
    .select({ room: rooms, settings: roomSettings })
    .from(rooms)
    .innerJoin(roomSettings, eq(rooms.id, roomSettings.roomId))
    .where(eq(rooms.roomCode, roomCode))
    .limit(1);
  if (result.length === 0) return undefined;
  const record = result[0];
  if (!record?.room || !record?.settings) return undefined;
  return { room: record.room, settings: record.settings };
}

export async function updateRoomSettings(
  current: RoomWithSettings,
  partial: Partial<RoomSettingsInput>,
): Promise<RoomWithSettings> {
  const merged = applySettings(partial, {
    radius: current.settings.radius,
    latitude: current.settings.latitude,
    longitude: current.settings.longitude,
    minPriceLevel: current.settings.minPriceLevel,
    maxPriceLevel: current.settings.maxPriceLevel,
  });

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(roomSettings)
      .set({
        radius: merged.radius,
        latitude: merged.latitude,
        longitude: merged.longitude,
        minPriceLevel: merged.minPriceLevel,
        maxPriceLevel: merged.maxPriceLevel,
        updatedAt: now,
      })
      .where(eq(roomSettings.roomId, current.room.id));

    await tx
      .update(rooms)
      .set({
        status: 'waiting',
        prepStarted: true,
        prepProgress: 0,
        prepPreparedCount: 0,
        prepExpectedCount: SAMPLE_RESTAURANTS.length,
        updatedAt: now,
      })
      .where(eq(rooms.id, current.room.id));
  });

  schedulePreparation(current.room.id, SAMPLE_RESTAURANTS.length);

  const refreshed = await getRoomById(current.room.id);
  if (!refreshed) {
    throw new Error('ROOM_NOT_FOUND_AFTER_UPDATE');
  }
  return refreshed;
}

export function serializeRoom(record: RoomWithSettings) {
  return {
    room_id: record.room.id,
    room_code: record.room.roomCode,
    room_name: record.room.roomName,
    share_url: record.room.roomUrl,
    status: record.room.status,
    settings: serializeSettings({
      radius: record.settings.radius,
      latitude: record.settings.latitude,
      longitude: record.settings.longitude,
      minPriceLevel: record.settings.minPriceLevel,
      maxPriceLevel: record.settings.maxPriceLevel,
    }),
    preparation: {
      started: record.room.prepStarted,
      progress: record.room.prepProgress,
      preparedCount: record.room.prepPreparedCount,
      expectedCount: record.room.prepExpectedCount,
    },
  };
}

export async function addMember(roomId: string, memberName: string): Promise<MemberRow> {
  const now = new Date();
  const [member] = await db
    .insert(members)
    .values({
      roomId,
      memberName,
      createdAt: now,
    })
    .returning();
  if (!member) {
    throw new Error('MEMBER_INSERT_FAILED');
  }
  return member;
}

export async function listMembers(roomId: string): Promise<MemberRow[]> {
  return db.select().from(members).where(eq(members.roomId, roomId));
}

export async function getMember(roomId: string, memberId: string): Promise<MemberRow | undefined> {
  const result = await db
    .select()
    .from(members)
    .where(and(eq(members.roomId, roomId), eq(members.id, memberId)))
    .limit(1);
  return result[0];
}

export async function ensureRestaurantsPrepared(roomId: string): Promise<RestaurantView[]> {
  let rows = await fetchRestaurantsForRoom(roomId);
  if (rows.length === 0) {
    await seedSampleRestaurants(roomId);
    rows = await fetchRestaurantsForRoom(roomId);
  }
  return rows.map(toRestaurantView);
}

export async function getRestaurantDetail(placeId: string): Promise<RestaurantDetail | undefined> {
  const result = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.placeId, placeId))
    .limit(1);
  const [row] = result;
  if (!row) return undefined;
  return toRestaurantDetail(row);
}

export async function listRestaurantReviews(placeId: string): Promise<RestaurantReview[]> {
  const rows = await db
    .select()
    .from(ratings)
    .where(eq(ratings.placeId, placeId))
    .orderBy(desc(ratings.time), desc(ratings.createdAt));

  return rows.map((row) => ({
    id: row.id,
    author_name: row.authorName ?? null,
    rating: row.rating ?? null,
    text: row.text ?? null,
    time: row.time ? row.time.toISOString() : null,
  }));
}

export async function recordLike(input: RecordLikeInput): Promise<LikeView> {
  const now = new Date();
  const [likeRecord] = await db
    .insert(likes)
    .values({
      roomId: input.roomId,
      memberId: input.memberId,
      placeId: input.placeId,
      isLiked: input.isLiked,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [likes.roomId, likes.memberId, likes.placeId],
      set: {
        isLiked: input.isLiked,
        updatedAt: now,
      },
    })
    .returning();

  if (!likeRecord) {
    throw new Error('LIKE_UPSERT_FAILED');
  }

  return {
    memberId: likeRecord.memberId,
    placeId: likeRecord.placeId,
    isLiked: likeRecord.isLiked,
    updatedAt: likeRecord.updatedAt,
  };
}

export async function listLikes(params: ListLikesParams): Promise<LikeView[]> {
  const conditions = [eq(likes.roomId, params.roomId)];
  if (params.memberIds && params.memberIds.length > 0) {
    conditions.push(inArray(likes.memberId, params.memberIds));
  }
  if (params.placeId) {
    conditions.push(eq(likes.placeId, params.placeId));
  }
  if (typeof params.isLiked === 'boolean') {
    conditions.push(eq(likes.isLiked, params.isLiked));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const rows = await db.select().from(likes).where(where);

  return rows.map((row) => ({
    memberId: row.memberId,
    placeId: row.placeId,
    isLiked: row.isLiked,
    updatedAt: row.updatedAt,
  }));
}

export async function resetLikes(roomId: string, memberId: string): Promise<number> {
  const deleted = await db
    .delete(likes)
    .where(and(eq(likes.roomId, roomId), eq(likes.memberId, memberId)))
    .returning({ placeId: likes.placeId });
  return deleted.length;
}

export async function getRanking(roomId: string): Promise<RankingItem[]> {
  const rows = await db
    .select({
      placeId: roomRestaurants.placeId,
      name: restaurants.name,
      rating: restaurants.rating,
      userRatingsTotal: restaurants.userRatingsTotal,
      googleMapsUrl: restaurants.googleMapsUrl,
      likeCount: sql<number>`sum(case when ${likes.isLiked} = true then 1 else 0 end)`,
      dislikeCount: sql<number>`sum(case when ${likes.isLiked} = false then 1 else 0 end)`,
    })
    .from(roomRestaurants)
    .innerJoin(restaurants, eq(roomRestaurants.placeId, restaurants.placeId))
    .leftJoin(
      likes,
      and(eq(likes.roomId, roomRestaurants.roomId), eq(likes.placeId, roomRestaurants.placeId)),
    )
    .where(eq(roomRestaurants.roomId, roomId))
    .groupBy(
      roomRestaurants.placeId,
      restaurants.name,
      restaurants.rating,
      restaurants.userRatingsTotal,
      restaurants.googleMapsUrl,
    );

  const alpha = 1;
  const ranking = rows.map((row) => {
    const likeCount = Number(row.likeCount ?? 0);
    const dislikeCount = Number(row.dislikeCount ?? 0);
    const score = likeCount - alpha * dislikeCount;
    return {
      place_id: row.placeId,
      name: row.name,
      score,
      like_count: likeCount,
      dislike_count: dislikeCount,
      rating: row.rating ?? null,
      user_ratings_total: row.userRatingsTotal ?? null,
      google_maps_url: row.googleMapsUrl ?? null,
    };
  });

  ranking.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    return (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0);
  });

  return ranking.map((item, index) => ({ ...item, rank: index + 1 }));
}
