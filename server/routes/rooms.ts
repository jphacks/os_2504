import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
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

const router = Router();

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

const memberParamSchema = z.object({
  member_id: z.string().uuid('member_id must be a valid UUID'),
});

const findMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const roomReq = req as MemberAwareRequest;
  const parsed = memberParamSchema.safeParse({ member_id: req.params.member_id });
  if (!parsed.success) {
    res
      .status(400)
      .json({ ok: false, error: { code: 'MEMBER_ID_INVALID', message: 'member_id must be a valid UUID', details: {} } });
    return;
  }

  if (!roomReq.room) {
    res.status(500).json({ ok: false, error: { code: 'ROOM_NOT_LOADED', message: 'Room missing in request context', details: {} } });
    return;
  }

  const member = await getMember(roomReq.room.room.id, parsed.data.member_id);
  if (!member) {
    res.status(404).json({ ok: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', details: {} } });
    return;
  }

  roomReq.memberId = member.id;
  next();
});

const settingsSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius: z.number().positive().max(50).optional(),
    min_price_level: z.number().int().min(0).max(4).optional(),
    max_price_level: z.number().int().min(0).max(4).optional(),
  })
  .strict();

const createRoomSchema = z.object({
  room_name: z.string().trim().min(1, 'room_name required'),
  settings: settingsSchema.partial().optional(),
});

const updateSettingsSchema = settingsSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'at least one setting is required',
});

const createMemberSchema = z.object({
  member_name: z.string().trim().min(1, 'member_name required'),
});

const likeSchema = z.object({
  place_id: z.string().min(1, 'place_id required'),
  is_liked: z.boolean({ invalid_type_error: 'is_liked must be boolean' }),
});

const likesQuerySchema = z.object({
  place_id: z.string().optional(),
  is_liked: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

function buildValidationError(err: z.ZodError) {
  const details: Record<string, string> = {};
  err.errors.forEach((issue) => {
    const path = issue.path.join('.') || 'root';
    details[path] = issue.message;
  });
  return { code: 'INVALID_REQUEST', message: 'Request validation failed', details };
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: buildValidationError(parsed.error) });
      return;
    }

    const room = await createRoom({
      roomName: parsed.data.room_name.trim(),
      settings: parsed.data.settings ?? {},
    });

    res.status(201).json({ ok: true, data: serializeRoom(room) });
  }),
);

router.patch(
  '/:room_code/settings',
  findRoom,
  asyncHandler(async (req: Request, res: Response) => {
    const room = (req as RoomRequest).room!;
    const parsed = updateSettingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: buildValidationError(parsed.error) });
      return;
    }

    const updated = await updateRoomSettings(room, parsed.data);

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
    const parsed = createMemberSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: buildValidationError(parsed.error) });
      return;
    }

    const member = await addMember(room.room.id, parsed.data.member_name.trim());
    res.status(201).json({ ok: true, data: { member_id: member.id, member_name: member.memberName } });
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
  '/:room_code/:member_id/likes',
  findRoom,
  findMember,
  asyncHandler(async (req: Request, res: Response) => {
    const memberReq = req as MemberAwareRequest & { memberId: string };
    const room = memberReq.room!;
    if (room.room.status !== 'voting') {
      res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
      return;
    }

    const parsed = likeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: buildValidationError(parsed.error) });
      return;
    }

    const restaurants = await ensureRestaurantsPrepared(room.room.id);
    const placeKnown = restaurants.some((restaurant) => restaurant.place_id === parsed.data.place_id);
    if (!placeKnown) {
      res.status(404).json({ ok: false, error: { code: 'PLACE_NOT_FOUND', message: 'Restaurant not found', details: {} } });
      return;
    }

    const like = await recordLike({
      roomId: room.room.id,
      memberId: memberReq.memberId!,
      placeId: parsed.data.place_id,
      isLiked: parsed.data.is_liked,
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
  '/:room_code/:member_id/likes',
  findRoom,
  findMember,
  asyncHandler(async (req: Request, res: Response) => {
    const memberReq = req as MemberAwareRequest & { memberId: string };
    const room = memberReq.room!;

    const parsedQuery = likesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ ok: false, error: buildValidationError(parsedQuery.error) });
      return;
    }

    const { place_id: placeFilter, is_liked: likedFilter } = parsedQuery.data;

    const likesList = await listLikes({
      roomId: room.room.id,
      memberIds: [memberReq.memberId!],
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
  '/:room_code/:member_id/likes',
  findRoom,
  findMember,
  asyncHandler(async (req: Request, res: Response) => {
    const memberReq = req as MemberAwareRequest & { memberId: string };
    const room = memberReq.room!;
    if (room.room.status !== 'voting') {
      res.status(409).json({ ok: false, error: { code: 'ROOM_NOT_IN_VOTING', message: 'Voting is not available right now.', details: {} } });
      return;
    }

    const deletedCount = await resetLikes(room.room.id, memberReq.memberId!);
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
