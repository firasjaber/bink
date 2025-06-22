import { createClient } from 'redis';
import { config } from './config';

export const redis = createClient({
  url: config.REDIS_URL,
});

redis.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Connect to Redis
redis.connect().catch(console.error);
