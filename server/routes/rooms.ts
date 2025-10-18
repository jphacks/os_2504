import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  addMember,
  createRoom,
  ensureRestaurantsPrepared,
  getMember,
  getRanking,
  getRoomByCode,
  listLikes,
  listMembers,
  recordLike,
  resetLikes,
  serializeRoom,
  updateRoomSettings,
  type LikeView,
  type RoomWithSettings,
} from '../store.js';
import { signMemberToken, verifyMemberToken } from '../tokens.js';

const router = Router();

// eslint-disable-next-line no-unused-vars
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

interface RoomRequest extends Request {
  room?: RoomWithSettings;
}

const findRoom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const roomReq = req as RoomRequest;
  const roomCode = typeof req.params.room_code === 'string' ? req.params.room_code : '';
  if (!roomCode) {
    res.status(400).json({ ok: false, error: { code: 'ROOM_CODE_REQUIRED', message: 'room_code required', details: {} } });
    return;
  }
  const room = await getRoomByCode(roomCode);
  if (!room) {
    res.status(404).json({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found', details: {} } });
    return;
  }
  roomReq.room = room;
  next();
});

type MemberAwareRequest = RoomRequest & { memberId?: string };

const authenticateMember: RequestHandler = asyncHandler(async (req, res, next) => {
  const roomReq = req as MemberAwareRequest;
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

  if (!roomReq.room) {
    res.status(500).json({ ok: false, error: { code: 'ROOM_NOT_LOADED', message: 'Room missing in request context', details: {} } });
    return;
  }

  if (roomReq.room.room.id !== verified.roomId) {
    res.status(403).json({ ok: false, error: { code: 'ROOM_MISMATCH', message: 'Token does not belong to this room', details: {} } });
    return;
  }

  const member = await getMember(roomReq.room.room.id, verified.memberId);
  if (!member) {
    res.status(403).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in room', details: {} } });
    return;
  }

  roomReq.memberId = member.id;
  next();
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const roomName = typeof req.body?.room_name === 'string' ? req.body.room_name.trim() : '';
    if (!roomName) {
      res.status(400).json({ ok: false, error: { code: 'ROOM_NAME_REQUIRED', message: 'room_name required', details: {} } });
      return;
    }

    const settingsInput =
      typeof req.body?.settings === 'object' && req.body.settings !== null ? req.body.settings : {};

    const room = await createRoom({
      roomName,
      settings: {
        latitude: typeof settingsInput.latitude === 'number' ? settingsInput.latitude : undefined,
        longitude: typeof settingsInput.longitude === 'number' ? settingsInput.longitude : undefined,
        radius: typeof settingsInput.radius === 'number' ? settingsInput.radius : undefined,
        min_price_level:
          typeof settingsInput.min_price_level === 'number' ? settingsInput.min_price_level : undefined,
        max_price_level:
          typeof settingsInput.max_price_level === 'number' ? settingsInput.max_price_level : undefined,
      },
    });

    res.status(201).json({ ok: true, data: serializeRoom(room) });
  }),
);

router.patch(
  '/:room_code/settings',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const partial = req.body ?? {};
    const updated = await updateRoomSettings(room, {
      latitude: typeof partial.latitude === 'number' ? partial.latitude : undefined,
      longitude: typeof partial.longitude === 'number' ? partial.longitude : undefined,
      radius: typeof partial.radius === 'number' ? partial.radius : undefined,
      min_price_level: typeof partial.min_price_level === 'number' ? partial.min_price_level : undefined,
      max_price_level: typeof partial.max_price_level === 'number' ? partial.max_price_level : undefined,
    });

    res.json({ ok: true, data: serializeRoom(updated) });
  }),
);

router.get(
  '/:room_code',
  findRoom,
  (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    res.json({
      ok: true,
      data: {
        room_name: room.room.roomName,
        status: room.room.status,
        share_url: room.room.roomUrl,
        qr: { text: room.room.roomUrl },
        preparation: {
          started: room.room.prepStarted,
          progress: room.room.prepProgress,
          preparedCount: room.room.prepPreparedCount,
          expectedCount: room.room.prepExpectedCount,
        },
      },
    });
  },
);

router.get(
  '/:room_code/members',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const membersList = await listMembers(room.room.id);
    res.json({
      ok: true,
      data: membersList.map((member) => ({
        member_id: member.id,
        member_name: member.memberName,
      })),
    });
  }),
);

router.post(
  '/:room_code/members',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const memberName = typeof req.body?.member_name === 'string' ? req.body.member_name.trim() : '';
    if (!memberName) {
      res.status(400).json({ ok: false, error: { code: 'MEMBER_NAME_REQUIRED', message: 'member_name required', details: {} } });
      return;
    }

    const member = await addMember(room.room.id, memberName);
    res.status(201).json({ ok: true, data: { member_id: member.id, member_name: member.memberName } });
  }),
);

router.post(
  '/:room_code/members/:member_id/session',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const memberId = typeof req.params.member_id === 'string' ? req.params.member_id : '';
    if (!memberId) {
      res.status(400).json({ ok: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'member_id required', details: {} } });
      return;
    }
    const member = await getMember(room.room.id, memberId);
    if (!member) {
      res.status(404).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', details: {} } });
      return;
    }

    const signed = signMemberToken(room.room.id, member.id);
    res.json({
      ok: true,
      data: {
        member_token: signed.token,
        expires_in: signed.expiresIn,
        member: { member_id: member.id, member_name: member.memberName },
      },
    });
  }),
);

router.get(
  '/:room_code/restaurants',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    if (room.room.status !== 'voting') {
      res.status(425).json({ ok: false, error: { code: 'ROOM_NOT_READY', message: 'Restaurant data is not ready yet.', details: {} } });
      return;
    }

    const items = await ensureRestaurantsPrepared(room.room.id);
    res.json({
      ok: true,
      data: {
        items,
        next_cursor: null,
      },
    });
  }),
);

router.post(
  '/:room_code/likes',
  findRoom,
  authenticateMember,
  asyncHandler(async (req: Request, res: Response) => {
    const memberReq = req as MemberAwareRequest & { memberId: string };
    const room = memberReq.room!;
    if (room.room.status !== 'voting') {
      res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
      return;
    }

    const placeId = typeof req.body?.place_id === 'string' ? req.body.place_id : '';
    const isLiked = req.body?.is_liked === true;
    if (!placeId) {
      res.status(400).json({ ok: false, error: { code: 'PLACE_ID_REQUIRED', message: 'place_id required', details: {} } });
      return;
    }

    const restaurants = await ensureRestaurantsPrepared(room.room.id);
    const placeKnown = restaurants.some((restaurant) => restaurant.place_id === placeId);
    if (!placeKnown) {
      res.status(404).json({ ok: false, error: { code: 'PLACE_NOT_FOUND', message: 'Restaurant not found', details: {} } });
      return;
    }

    const like = await recordLike({
      roomId: room.room.id,
      memberId: memberReq.memberId!,
      placeId,
      isLiked,
    });

    res.json({
      ok: true,
      data: {
        member_id: like.memberId,
        place_id: like.placeId,
        is_liked: like.isLiked,
        updated_at: like.updatedAt.toISOString(),
      },
    });
  }),
);

function buildLikeResponse(
  likesList: LikeView[],
  memberNames: Map<string, string>,
  restaurantNames: Map<string, string>,
) {
  return likesList.map((like) => ({
    member: {
      member_id: like.memberId,
      member_name: memberNames.get(like.memberId) ?? 'unknown',
    },
    place: {
      place_id: like.placeId,
      name: restaurantNames.get(like.placeId) ?? 'unknown',
    },
    is_liked: like.isLiked,
    updated_at: like.updatedAt.toISOString(),
  }));
}

router.get(
  '/:room_code/likes',
  findRoom,
  authenticateMember,
  asyncHandler(async (req: Request, res: Response) => {
    const memberReq = req as MemberAwareRequest;
    const room = memberReq.room!;

    const membersFilter = Array.isArray(req.query.member_id)
      ? (req.query.member_id as string[])
      : typeof req.query.member_id === 'string'
        ? [req.query.member_id]
        : undefined;
    const placeFilter = typeof req.query.place_id === 'string' ? req.query.place_id : undefined;
    const likedFilter = typeof req.query.is_liked === 'string' ? req.query.is_liked === 'true' : undefined;

    const likesList = await listLikes({
      roomId: room.room.id,
      memberIds: membersFilter,
      placeId: placeFilter,
      isLiked: likedFilter,
    });

    const [membersList, restaurants] = await Promise.all([
      listMembers(room.room.id),
      ensureRestaurantsPrepared(room.room.id),
    ]);

    const memberNames = new Map(membersList.map((member) => [member.id, member.memberName]));
    const restaurantNames = new Map(restaurants.map((restaurant) => [restaurant.place_id, restaurant.name]));

    res.json({ ok: true, data: { items: buildLikeResponse(likesList, memberNames, restaurantNames), next_cursor: null } });
  }),
);

router.delete(
  '/:room_code/likes/:member_id',
  findRoom,
  authenticateMember,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as MemberAwareRequest).room!;
    if (room.room.status !== 'voting') {
      res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
      return;
    }

    const targetMemberId = typeof req.params.member_id === 'string' ? req.params.member_id : '';
    if (!targetMemberId) {
      res.status(400).json({ ok: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'member_id required', details: {} } });
      return;
    }

    const member = await getMember(room.room.id, targetMemberId);
    if (!member) {
      res.status(404).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', details: {} } });
      return;
    }

    const deletedCount = await resetLikes(room.room.id, targetMemberId);
    res.json({ ok: true, data: { reset: true, deleted_count: deletedCount } });
  }),
);

router.get(
  '/:room_code/ranking',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const ranking = await getRanking(room.room.id);
    res.json({ ok: true, data: ranking });
  }),
);

export default router;
