import { Elysia } from "elysia";
import { users } from "./user/route";
import cors from "@elysiajs/cors";
import { initDrizzle } from "db";
import { links } from "./link/route";
import { googleAuth } from "./auth/google.route";
import { config } from "./config";

export const drizzle = await initDrizzle(config.DATABASE_URL);
console.log("🐘 Database connected");

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["content-type", "cookie"],
    })
  )
  .use(users)
  .use(links)
  .use(googleAuth)
  .listen(config.PORT);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
