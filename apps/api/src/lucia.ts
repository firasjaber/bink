import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import { initDrizzle, sessionTable, userTable } from "db";

const drizzle = await initDrizzle();
const adapter = new DrizzlePostgreSQLAdapter(drizzle, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // set to `true` when using HTTPS
      secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      domain:
        process.env.NODE_ENV === "production" ? "bink.firrj.com" : "localhost",
    },
  },
});

// IMPORTANT!
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
  }
}
