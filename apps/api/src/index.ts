import { logger } from '@bogeychan/elysia-logger';
import cors from '@elysiajs/cors';
import { initDrizzle } from 'db';
import { Elysia } from 'elysia';
import { googleAuth } from './auth/google.route';
import { config } from './config';
import { links } from './link/route';
import { logger as mainLogger } from './logger';
import { users } from './user/route';

const drizzle = await initDrizzle(config.DATABASE_URL);
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
export { drizzle };
