import { initDrizzle } from "db/src/client";
import { startJobExecutor } from "./executor";
import { config } from "./config";

export const db = await initDrizzle(config.DATABASE_URL);
console.log("🐘 Database connected");

console.log("Starting job executor...");
startJobExecutor().catch((error) => {
  console.error("Job executor error:", error);
  process.exit(1);
});
