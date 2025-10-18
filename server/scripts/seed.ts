import 'dotenv/config';
import { db, pool } from '../db/client.js';
import {
  ratings,
  restaurants,
  roomRestaurants,
  rooms,
  roomSettings,
} from '../../db/schema.js';
import { sampleRestaurants } from '../sample-data.js';
import { stableUuid } from '../utils/stable-uuid.js';

const DEFAULT_SETTINGS = {
  latitude: 35.681236,
  longitude: 139.767125,
  radius: 3,
  minPriceLevel: 0,
  maxPriceLevel: 4,
};

const ROOM_CODE = process.env.SEED_ROOM_CODE ?? 'DEMO01';
const ROOM_NAME = process.env.SEED_ROOM_NAME ?? 'デモルーム@MogFinder';

function buildShareUrl(roomCode: string): string {
  const base = process.env.APP_SHARE_BASE_URL ?? 'http://localhost:5173';
  return `${base.replace(/\/+$/, '')}/r/${roomCode}`;
}

async function upsertRoom() {
  const now = new Date();
  const shareUrl = buildShareUrl(ROOM_CODE);
  const [roomRecord] = await db
    .insert(rooms)
    .values({
      roomCode: ROOM_CODE,
      roomName: ROOM_NAME,
      roomUrl: shareUrl,
      status: 'voting',
      prepStarted: true,
      prepProgress: 100,
      prepPreparedCount: sampleRestaurants.length,
      prepExpectedCount: sampleRestaurants.length,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: rooms.roomCode,
      set: {
        roomName: ROOM_NAME,
        roomUrl: shareUrl,
        status: 'voting',
        prepStarted: true,
        prepProgress: 100,
        prepPreparedCount: sampleRestaurants.length,
        prepExpectedCount: sampleRestaurants.length,
        updatedAt: now,
      },
    })
    .returning();

  if (!roomRecord) {
    throw new Error('ROOM_UPSERT_FAILED');
  }

  const [settingsRecord] = await db
    .insert(roomSettings)
    .values({
      roomId: roomRecord.id,
      radius: DEFAULT_SETTINGS.radius,
      latitude: DEFAULT_SETTINGS.latitude,
      longitude: DEFAULT_SETTINGS.longitude,
      minPriceLevel: DEFAULT_SETTINGS.minPriceLevel,
      maxPriceLevel: DEFAULT_SETTINGS.maxPriceLevel,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: roomSettings.roomId,
      set: {
        radius: DEFAULT_SETTINGS.radius,
        latitude: DEFAULT_SETTINGS.latitude,
        longitude: DEFAULT_SETTINGS.longitude,
        minPriceLevel: DEFAULT_SETTINGS.minPriceLevel,
        maxPriceLevel: DEFAULT_SETTINGS.maxPriceLevel,
        updatedAt: now,
      },
    })
    .returning();

  if (!settingsRecord) {
    throw new Error('ROOM_SETTINGS_UPSERT_FAILED');
  }

  return roomRecord.id;
}

async function seedRestaurants(roomId: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const sample of sampleRestaurants) {
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
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: restaurants.placeId,
          set: {
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
            updatedAt: now,
          },
        });

      await tx
        .insert(roomRestaurants)
        .values({ roomId, placeId: sample.place_id })
        .onConflictDoNothing({ target: [roomRestaurants.roomId, roomRestaurants.placeId] });

      if (sample.reviews?.length) {
        for (const review of sample.reviews) {
          const reviewId = stableUuid(`seed:${sample.place_id}:${review.author_name}:${review.time}`);
          await tx
            .insert(ratings)
            .values({
              id: reviewId,
              placeId: sample.place_id,
              authorName: review.author_name,
              rating: review.rating,
              text: review.text,
              time: new Date(review.time),
              createdAt: now,
            })
            .onConflictDoUpdate({
              target: ratings.id,
              set: {
                authorName: review.author_name,
                rating: review.rating,
                text: review.text,
                time: new Date(review.time),
              },
            });
        }
      }
    }
  });
}

async function main() {
  try {
    const roomId = await upsertRoom();
    await seedRestaurants(roomId);
    console.log(`Seed completed: room_code=${ROOM_CODE}, linked_restaurants=${sampleRestaurants.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[seed] failed', error);
  process.exitCode = 1;
});
