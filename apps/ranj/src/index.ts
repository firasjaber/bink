import { initDrizzle } from 'db/src/client';
import { startJobExecutor } from './executor';
import { config } from './config';
import { logger } from './logger';

export const db = await initDrizzle(config.DATABASE_URL);
logger.info('🐘 Database connected');

logger.info('Starting job executor...');
startJobExecutor().catch((error) => {
  logger.error('Job executor error:', error);
  process.exit(1);
});
