import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { initDrizzle } from 'db';
import { sessionTable, userTable } from 'db';
import { Lucia } from 'lucia';
import { config } from './config';

export function initLucia(drizzle: Awaited<ReturnType<typeof initDrizzle>>) {
  const adapter = new DrizzlePostgreSQLAdapter(drizzle, sessionTable, userTable);

  const lucia = new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: config.NODE_ENV === 'production',
        sameSite: config.NODE_ENV === 'production' ? 'strict' : undefined,
        domain: config.NODE_ENV === 'production' ? 'bink.firrj.com' : 'localhost',
      },
    },
  });
  return lucia;
}

// IMPORTANT!
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initLucia>;
  }
}
