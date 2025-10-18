import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roomStatusEnum = pgEnum('room_status', ['waiting', 'voting']);

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: text('room_code').notNull(),
  roomName: text('room_name').notNull(),
  roomUrl: text('room_url').notNull(),
  status: roomStatusEnum('status').notNull().default('waiting'),
  prepStarted: boolean('prep_started').notNull().default(false),
  prepProgress: integer('prep_progress').notNull().default(0),
  prepPreparedCount: integer('prep_prepared_count').notNull().default(0),
  prepExpectedCount: integer('prep_expected_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roomCodeUnique: uniqueIndex('rooms_room_code_unique').on(table.roomCode),
}));

export const roomSettings = pgTable('room_settings', {
  roomId: uuid('room_id').primaryKey().references(() => rooms.id, { onDelete: 'cascade' }),
  radius: doublePrecision('radius').notNull().default(3),
  latitude: doublePrecision('latitude').notNull().default(35.681236),
  longitude: doublePrecision('longitude').notNull().default(139.767125),
  minPriceLevel: integer('min_price_level').notNull().default(0),
  maxPriceLevel: integer('max_price_level').notNull().default(4),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable('members', {
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  id: uuid('id').defaultRandom().notNull(),
  memberName: text('member_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roomId, table.id], name: 'members_room_member_pk' }),
}));

export const restaurants = pgTable('restaurants', {
  placeId: text('place_id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  rating: doublePrecision('rating'),
  userRatingsTotal: integer('user_ratings_total'),
  photoUrls: jsonb('photo_urls').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  types: jsonb('types').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  phoneNumber: text('phone_number'),
  website: text('website'),
  googleMapsUrl: text('google_maps_url'),
  openingHours: jsonb('opening_hours').$type<Record<string, unknown>>(),
  summarySimple: text('summary_simple'),
  summaryDetail: text('summary_detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roomRestaurants = pgTable('room_restaurants', {
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  placeId: text('place_id').notNull().references(() => restaurants.placeId, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roomId, table.placeId], name: 'room_restaurants_pk' }),
}));

export const likes = pgTable('likes', {
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull(),
  placeId: text('place_id').notNull(),
  isLiked: boolean('is_liked').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roomId, table.memberId, table.placeId], name: 'likes_room_member_place_pk' }),
  memberFk: foreignKey({
    columns: [table.roomId, table.memberId],
    foreignColumns: [members.roomId, members.id],
    name: 'likes_member_fk',
  }),
  roomRestaurantFk: foreignKey({
    columns: [table.roomId, table.placeId],
    foreignColumns: [roomRestaurants.roomId, roomRestaurants.placeId],
    name: 'likes_room_restaurant_fk',
  }),
}));

export const ratings = pgTable('ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeId: text('place_id').notNull().references(() => restaurants.placeId, { onDelete: 'cascade' }),
  authorName: text('author_name'),
  rating: integer('rating'),
  text: text('text'),
  time: timestamp('time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
