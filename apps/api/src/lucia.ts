import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import { initDrizzle, sessionTable, userTable } from "db";
import { config } from "./config";

const drizzle = await initDrizzle(config.DATABASE_URL);
const adapter = new DrizzlePostgreSQLAdapter(drizzle, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: config.NODE_ENV === "production",
      sameSite: config.NODE_ENV === "production" ? "strict" : undefined,
      domain: config.NODE_ENV === "production" ? "bink.firrj.com" : "localhost",
    },
  },
});

// IMPORTANT!
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
  }
}
