import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { initDrizzle } from '../client';
import { scrapingJobs } from '../schema';

export async function getPendingJobs(db: Awaited<ReturnType<typeof initDrizzle>>, limit: number) {
  return db
    .select()
    .from(scrapingJobs)
    .where(and(eq(scrapingJobs.status, 'pending'), isNull(scrapingJobs.lockedAt)))
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
    event: 'scrape_og';
    url: string;
    linkId: string;
    priority: number;
  },
) {
  const dbJob = await db.insert(scrapingJobs).values(job).returning();
  return dbJob[0];
}
