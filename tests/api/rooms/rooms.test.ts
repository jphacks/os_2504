import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { db } from '../../../server/db/client.js';
import {
  likes,
  members,
  ratings,
  restaurants,
  roomRestaurants,
  rooms,
  roomSettings,
} from '../../../db/schema.js';
import { sampleRestaurants } from '../../../server/sample-data.js';

const app = createApp();

async function resetDatabase() {
  await db.delete(ratings).execute();
  await db.delete(likes).execute();
  await db.delete(roomRestaurants).execute();
  await db.delete(members).execute();
  await db.delete(roomSettings).execute();
  await db.delete(rooms).execute();
  await db.delete(restaurants).execute();
}

async function waitForVoting(roomCode: string, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await request(app).get(`/api/rooms/${roomCode}`);
    if (res.status === 200 && res.body.data.status === 'voting') {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Room ${roomCode} did not become voting within timeout`);
}

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
});


describe('Rooms API', () => {
  it('creates a room and triggers preparation', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({ room_name: 'Integration Room', settings: { latitude: 35.68 } });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.room_code).toHaveLength(6);

    const roomRecord = await db.select().from(rooms).where(eq(rooms.roomCode, res.body.data.room_code));
    expect(roomRecord).toHaveLength(1);
  });

  it('returns room share information', async () => {
    const create = await request(app).post('/api/rooms').send({ room_name: 'Share Room', settings: {} });
    const code = create.body.data.room_code;

    await waitForVoting(code);

    const res = await request(app).get(`/api/rooms/${code}`);

    expect(res.status).toBe(200);
    expect(res.body.data.share_url).toContain(code);
  });

  it('allows member creation and returns UUID identifiers', async () => {
    const create = await request(app).post('/api/rooms').send({ room_name: 'Member Room' });
    const code = create.body.data.room_code;

    const memberRes = await request(app)
      .post(`/api/rooms/${code}/members`)
      .send({ member_name: '太郎' });

    expect(memberRes.status).toBe(201);
    const memberId = memberRes.body.data.member_id;
    expect(typeof memberId).toBe('string');
    expect(memberId).toMatch(/[0-9a-fA-F-]{36}/);
  });

  it('provides restaurants after preparation completes', async () => {
    const create = await request(app).post('/api/rooms').send({ room_name: 'Restaurant Room' });
    const code = create.body.data.room_code;

    // Wait briefly for preparation timers to seed data
    await new Promise((resolve) => setTimeout(resolve, 2200));

    await waitForVoting(code);

    const res = await request(app).get(`/api/rooms/${code}/restaurants`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(sampleRestaurants.length);
  });

  it('records likes and returns ranking', async () => {
    const createRes = await request(app).post('/api/rooms').send({ room_name: 'Ranking Room' });
    const code = createRes.body.data.room_code;
    await waitForVoting(code);

    const memberRes = await request(app)
      .post(`/api/rooms/${code}/members`)
      .send({ member_name: '花子' });
    const memberId = memberRes.body.data.member_id as string;
    const sample = sampleRestaurants[0];

    await request(app)
      .post(`/api/rooms/${code}/${memberId}/likes`)
      .send({ place_id: sample.place_id, is_liked: true })
      .expect(200);

    const ranking = await request(app).get(`/api/rooms/${code}/ranking`);
    expect(ranking.status).toBe(200);
    expect(ranking.body.data.length).toBeGreaterThan(0);
  });

  it('serves restaurant detail and reviews', async () => {
    const createRes = await request(app).post('/api/rooms').send({ room_name: 'Detail Room' });
    const code = createRes.body.data.room_code;
    await waitForVoting(code);

    const detailRes = await request(app).get(`/api/restaurants/${sampleRestaurants[0].place_id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.name).toBe(sampleRestaurants[0].name);

    const reviewsRes = await request(app).get(`/api/restaurants/${sampleRestaurants[0].place_id}/reviews`);
    expect(reviewsRes.status).toBe(200);
    expect(reviewsRes.body.data.length).toBeGreaterThanOrEqual(sampleRestaurants[0].reviews?.length ?? 0);
  });

  it('resets likes for member', async () => {
    const createRes = await request(app).post('/api/rooms').send({ room_name: 'Reset Room' });
    const code = createRes.body.data.room_code;
    await waitForVoting(code);

    const memberRes = await request(app)
      .post(`/api/rooms/${code}/members`)
      .send({ member_name: '次郎' });
    const memberId = memberRes.body.data.member_id as string;
    const sample = sampleRestaurants[1];

    await request(app)
      .post(`/api/rooms/${code}/${memberId}/likes`)
      .send({ place_id: sample.place_id, is_liked: false })
      .expect(200);

    const resetRes = await request(app)
      .delete(`/api/rooms/${code}/${memberId}/likes`)
      .expect(200);
    expect(resetRes.body.data.deleted_count).toBeGreaterThanOrEqual(1);

    const likesRows = await db
      .select()
      .from(likes)
      .where(and(eq(likes.roomId, createRes.body.data.room_id), eq(likes.memberId, memberId)));
    expect(likesRows).toHaveLength(0);
  });
});
