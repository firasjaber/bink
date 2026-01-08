import { startJobExecutor } from './executor';
import { logger } from './logger';
import './db';

logger.info('Starting job executor...');
startJobExecutor().catch((error) => {
  logger.error({ error }, 'Job executor error');
  process.exit(1);
});
