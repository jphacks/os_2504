import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import todosRouter from './routes/todos.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use('/api/todos', todosRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not found' });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, '../client');

if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});
