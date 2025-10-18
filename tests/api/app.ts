import express from 'express';
import type { Express } from 'express';
import roomsRouter from '../../server/routes/rooms.js';
import restaurantsRouter from '../../server/routes/restaurants.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomsRouter);
  app.use('/api/restaurants', restaurantsRouter);
  return app;
}
