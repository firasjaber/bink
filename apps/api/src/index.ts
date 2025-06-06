import { instrumentation } from './instrumentation';
import cors from '@elysiajs/cors';
import { logger } from '@bogeychan/elysia-logger';
import { initDrizzle } from 'db';
import { Elysia } from 'elysia';
import { initLucia } from './lucia';
import { googleAuth } from './auth/google.route';
import { config } from './config';
import { links } from './link/route';
import { logger as mainLogger } from './logger';
import { users } from './user/route';

mainLogger.info('Connecting to database...');
const drizzle = await initDrizzle(config.DATABASE_URL);
const lucia = initLucia(drizzle);

mainLogger.info('🐘 Database connected');

const app = new Elysia()
  .use(logger({ level: 'trace' }))
  .use(instrumentation)
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
// test log with nested objects
mainLogger.info(
  {
    user: {
      id: 1,
      name: 'John Doe',
      links: { id: 1, url: 'https://example.com' },
    },
    projectId: '123123',
  },
  'user links',
);

export type App = typeof app;
export { drizzle, lucia };
