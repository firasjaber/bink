import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export const initDrizzle = async (connectionString: string) => {
  const client = new Client({
    connectionString,
  });
  await client.connect();
  const db = drizzle(client, {
    schema,
  });
  return db;
};
