import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export const initDrizzle = async () => {
  const client = new Client({
    connectionString: 'postgres://user:password@localhost:5432/db',
  });
  await client.connect();
  const db = drizzle(client, {
    schema,
  });
  return db;
};
