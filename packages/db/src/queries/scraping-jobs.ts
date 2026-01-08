import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { initDrizzle } from '../client';
import { scrapingJobs } from '../schema';

export async function getPendingJobs(db: Awaited<ReturnType<typeof initDrizzle>>, limit: number) {
  return db
    .select()
    .from(scrapingJobs)
    .where(
      and(
        eq(scrapingJobs.status, 'pending'),
        isNull(scrapingJobs.lockedAt),
        or(
          eq(scrapingJobs.event, 'scrape_og'),
          and(
            eq(scrapingJobs.event, 'auto_tag'),
            sql`EXISTS (
              SELECT 1 FROM ${scrapingJobs} AS sj2
              WHERE sj2.link_id = ${scrapingJobs.linkId}
              AND sj2.event = 'scrape_og'
              AND sj2.status = 'completed'
            )`,
          ),
        ),
      ),
    )
    .orderBy(desc(scrapingJobs.priority), asc(scrapingJobs.createdAt))
    .limit(limit);
}

export async function updateJobsToProcessing(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  jobIds: string[],
) {
  const now = new Date();
  return db
    .update(scrapingJobs)
    .set({ status: 'processing', lockedAt: now, updatedAt: now })
    .where(inArray(scrapingJobs.id, jobIds));
}

export async function updateJobToCompleted(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  jobId: string,
) {
  const now = new Date();
  return db
    .update(scrapingJobs)
    .set({ status: 'completed', lockedAt: null, updatedAt: now })
    .where(eq(scrapingJobs.id, jobId));
}

export async function updateJobToFailed(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  jobId: string,
) {
  const now = new Date();
  return db
    .update(scrapingJobs)
    .set({ status: 'failed', lockedAt: null, updatedAt: now })
    .where(eq(scrapingJobs.id, jobId));
}

export async function insertScrapingJob(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  job: {
    event: 'scrape_og' | 'auto_tag';
    url: string;
    linkId: string;
    priority: number;
    autoTagging?: boolean;
    userId?: string;
  },
) {
  const dbJob = await db.insert(scrapingJobs).values(job).returning();
  return dbJob[0];
}
