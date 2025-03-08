import { initDrizzle } from 'db/src/client';
import { config } from './config';
import { startJobExecutor } from './executor';
import { logger } from './logger';

const db = await initDrizzle(config.DATABASE_URL);
logger.info('🐘 Database connected');

logger.info('Starting job executor...');
startJobExecutor().catch((error) => {
  logger.error({ error }, 'Job executor error');
  process.exit(1);
});

export { db };
