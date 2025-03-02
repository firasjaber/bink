import { Elysia } from 'elysia';
import { users } from './user/route';
import cors from '@elysiajs/cors';
import { initDrizzle } from 'db';
import { links } from './link/route';
import { googleAuth } from './auth/google.route';
import { config } from './config';
import { logger } from '@bogeychan/elysia-logger';
import { logger as mainLogger } from './logger';

export const drizzle = await initDrizzle(config.DATABASE_URL);
mainLogger.info('🐘 Database connected');

const app = new Elysia()
  .use(
    logger({
      level: 'info',
    }),
  )
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['content-type', 'cookie'],
    }),
  )
  .use(users)
  .use(links)
  .use(googleAuth)
  .listen(config.PORT);

mainLogger.info(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
