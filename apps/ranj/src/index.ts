import { initDrizzle } from "db/src/client";
import { startJobExecutor } from "./executor";

export const db = await initDrizzle();
console.log("🐘 Database connected");

console.log("Starting job executor...");
startJobExecutor().catch((error) => {
  console.error("Job executor error:", error);
  process.exit(1);
});
