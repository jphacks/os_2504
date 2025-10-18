import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getRestaurantDetail, listRestaurantReviews } from '../store.js';

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};

router.get(
  '/:place_id',
  asyncHandler(async (req, res) => {
    const placeId = typeof req.params.place_id === 'string' ? req.params.place_id : '';
    if (!placeId) {
      res.status(400).json({ ok: false, error: { code: 'PLACE_ID_REQUIRED', message: 'place_id required', details: {} } });
      return;
    }

    const detail = await getRestaurantDetail(placeId);
    if (!detail) {
      res.status(404).json({ ok: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found', details: {} } });
      return;
    }

    res.json({ ok: true, data: detail });
  }),
);

router.get(
  '/:place_id/reviews',
  asyncHandler(async (req, res) => {
    const placeId = typeof req.params.place_id === 'string' ? req.params.place_id : '';
    if (!placeId) {
      res.status(400).json({ ok: false, error: { code: 'PLACE_ID_REQUIRED', message: 'place_id required', details: {} } });
      return;
    }

    const detail = await getRestaurantDetail(placeId);
    if (!detail) {
      res.status(404).json({ ok: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found', details: {} } });
      return;
    }

    const reviews = await listRestaurantReviews(placeId);
    res.json({ ok: true, data: reviews });
  }),
);

export default router;
