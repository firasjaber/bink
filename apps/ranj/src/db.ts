import { initDrizzle } from 'db/src/client';
import { config } from './config';
import { logger } from './logger';

const db = await initDrizzle(config.DATABASE_URL);

export { db };
