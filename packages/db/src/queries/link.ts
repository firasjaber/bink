import { initDrizzle } from "../client";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { linkTable } from "../schema";

export async function update(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  data: {
    title?: string;
    description?: string;
    image?: string;
    state?: "processed" | "failed" | "processed";
  }
) {
  return db.update(linkTable).set(data).where(eq(linkTable.id, linkId));
}
