import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  addMember,
  createRoom,
  getMember,
  getRanking,
  getRoomByCode,
  listLikes,
  listMembers,
  recordLike,
  resetLikes,
  serializeRoom,
  updateRoomSettings,
  ensureRestaurantsPrepared,
  type Room,
} from '../store.js';
import { signMemberToken, verifyMemberToken } from '../tokens.js';

const router = Router();

interface RoomRequest extends Request {
  room?: Room;
}

function findRoom(req: RoomRequest, res: Response, next: NextFunction) {
  const { room_code: roomCode } = req.params;
  if (!roomCode) {
    res.status(400).json({ ok: false, error: { code: 'ROOM_CODE_REQUIRED', message: 'room_code required', details: {} } });
    return;
  }
  const room = getRoomByCode(roomCode);
  if (!room) {
    res.status(404).json({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found', details: {} } });
    return;
  }
  req.room = room;
  next();
}

function authenticateMember(req: RoomRequest, res: Response, next: NextFunction) {
  const auth = req.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authorization header required', details: {} } });
    return;
  }
  const token = auth.slice('Bearer '.length);
  const verified = verifyMemberToken(token);
  if (!verified) {
    res.status(401).json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Invalid member token', details: {} } });
    return;
  }
  if (!req.room) {
    res.status(500).json({ ok: false, error: { code: 'ROOM_NOT_LOADED', message: 'Room missing in request context', details: {} } });
    return;
  }
  if (req.room.roomId !== verified.roomId) {
    res.status(403).json({ ok: false, error: { code: 'ROOM_MISMATCH', message: 'Token does not belong to this room', details: {} } });
    return;
  }
  const member = getMember(req.room, verified.memberId);
  if (!member) {
    res.status(403).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in room', details: {} } });
    return;
  }
  (req as RoomRequest & { memberId: string }).memberId = member.memberId;
  next();
}

router.post('/', (req, res) => {
  const roomName = typeof req.body?.room_name === 'string' ? req.body.room_name.trim() : '';
  if (!roomName) {
    res.status(400).json({ ok: false, error: { code: 'ROOM_NAME_REQUIRED', message: 'room_name required', details: {} } });
    return;
  }

  const settingsInput = typeof req.body?.settings === 'object' && req.body.settings !== null ? req.body.settings : {};
  const room = createRoom({
    roomName,
    settings: {
      latitude: typeof settingsInput.latitude === 'number' ? settingsInput.latitude : undefined,
      longitude: typeof settingsInput.longitude === 'number' ? settingsInput.longitude : undefined,
      radius: typeof settingsInput.radius === 'number' ? settingsInput.radius : undefined,
      min_price_level: typeof settingsInput.min_price_level === 'number' ? settingsInput.min_price_level : undefined,
      max_price_level: typeof settingsInput.max_price_level === 'number' ? settingsInput.max_price_level : undefined,
    },
  });

  res.status(201).json({ ok: true, data: serializeRoom(room) });
});

router.patch('/:room_code/settings', findRoom, (req: RoomRequest, res: Response) => {
  const partial = req.body ?? {};
  const room = req.room!;
  const updated = updateRoomSettings(room, {
    latitude: typeof partial.latitude === 'number' ? partial.latitude : undefined,
    longitude: typeof partial.longitude === 'number' ? partial.longitude : undefined,
    radius: typeof partial.radius === 'number' ? partial.radius : undefined,
    min_price_level: typeof partial.min_price_level === 'number' ? partial.min_price_level : undefined,
    max_price_level: typeof partial.max_price_level === 'number' ? partial.max_price_level : undefined,
  });

  res.json({ ok: true, data: serializeRoom(updated) });
});

router.get('/:room_code', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  res.json({
    ok: true,
    data: {
      room_name: room.roomName,
      status: room.status,
      share_url: room.shareUrl,
      qr: { text: room.shareUrl },
      preparation: room.preparation,
    },
  });
});

router.get('/:room_code/members', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  res.json({
    ok: true,
    data: listMembers(room).map((member) => ({
      member_id: member.memberId,
      member_name: member.memberName,
    })),
  });
});

router.post('/:room_code/members', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  const memberName = typeof req.body?.member_name === 'string' ? req.body.member_name.trim() : '';
  if (!memberName) {
    res.status(400).json({ ok: false, error: { code: 'MEMBER_NAME_REQUIRED', message: 'member_name required', details: {} } });
    return;
  }
  const member = addMember(room, memberName);
  res.status(201).json({ ok: true, data: { member_id: member.memberId, member_name: member.memberName } });
});

router.post('/:room_code/members/:member_id/session', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  const { member_id: memberId } = req.params;
  const member = getMember(room, memberId);
  if (!member) {
    res.status(404).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', details: {} } });
    return;
  }

  const signed = signMemberToken(room.roomId, member.memberId);
  res.json({
    ok: true,
    data: {
      member_token: signed.token,
      expires_in: signed.expiresIn,
      member: { member_id: member.memberId, member_name: member.memberName },
    },
  });
});

router.get('/:room_code/restaurants', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  if (room.status !== 'voting') {
    res.status(425).json({ ok: false, error: { code: 'ROOM_NOT_READY', message: 'Restaurant data is not ready yet.', details: {} } });
    return;
  }
  const items = ensureRestaurantsPrepared(room);
  res.json({
    ok: true,
    data: {
      items,
      next_cursor: null,
    },
  });
});

router.post('/:room_code/likes', findRoom, authenticateMember, (req: RoomRequest & { memberId: string }, res: Response) => {
  const room = req.room!;
  if (room.status !== 'voting') {
    res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
    return;
  }
  const placeId = typeof req.body?.place_id === 'string' ? req.body.place_id : '';
  const isLiked = req.body?.is_liked === true;
  if (!placeId) {
    res.status(400).json({ ok: false, error: { code: 'PLACE_ID_REQUIRED', message: 'place_id required', details: {} } });
    return;
  }
  ensureRestaurantsPrepared(room);
  if (!room.restaurants.has(placeId)) {
    res.status(404).json({ ok: false, error: { code: 'PLACE_NOT_FOUND', message: 'Restaurant not found', details: {} } });
    return;
  }
  const like = recordLike({ room, memberId: req.memberId, placeId, isLiked });
  res.json({
    ok: true,
    data: {
      member_id: like.memberId,
      place_id: like.placeId,
      is_liked: like.isLiked,
      updated_at: like.updatedAt.toISOString(),
    },
  });
});

router.get('/:room_code/likes', findRoom, authenticateMember, (req: RoomRequest & { memberId: string }, res: Response) => {
  const room = req.room!;
  const members = Array.isArray(req.query.member_id)
    ? (req.query.member_id as string[])
    : typeof req.query.member_id === 'string'
      ? [req.query.member_id]
      : undefined;
  const placeId = typeof req.query.place_id === 'string' ? req.query.place_id : undefined;
  const isLiked =
    typeof req.query.is_liked === 'string'
      ? req.query.is_liked === 'true'
      : undefined;
  const items = listLikes({ room, memberIds: members, placeId, isLiked }).map((like) => ({
    member: {
      member_id: like.memberId,
      member_name: getMember(room, like.memberId)?.memberName ?? 'unknown',
    },
    place: {
      place_id: like.placeId,
      name: room.restaurants.get(like.placeId)?.name ?? 'unknown',
    },
    is_liked: like.isLiked,
    updated_at: like.updatedAt.toISOString(),
  }));

  res.json({ ok: true, data: { items, next_cursor: null } });
});

router.delete('/:room_code/likes/:member_id', findRoom, authenticateMember, (req: RoomRequest & { memberId: string }, res: Response) => {
  const room = req.room!;
  if (room.status !== 'voting') {
    res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
    return;
  }
  const { member_id: targetMemberId } = req.params;
  if (!getMember(room, targetMemberId)) {
    res.status(404).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', details: {} } });
    return;
  }
  const deletedCount = resetLikes(room, targetMemberId);
  res.json({ ok: true, data: { reset: true, deleted_count: deletedCount } });
});

router.get('/:room_code/ranking', findRoom, (req: RoomRequest, res: Response) => {
  const room = req.room!;
  const ranking = getRanking(room).map((item) => ({
    rank: item.rank,
    place_id: item.place_id,
    name: item.name,
    score: item.score,
    like_count: item.like_count,
    dislike_count: item.dislike_count,
    rating: item.rating,
    user_ratings_total: item.user_ratings_total,
    google_maps_url: item.google_maps_url,
  }));
  res.json({ ok: true, data: ranking });
});

export default router;
