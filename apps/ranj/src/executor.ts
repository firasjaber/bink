import { eq, and, isNull, desc, asc, inArray } from "drizzle-orm";
import { scrapingJobs, type ScrapingJob } from "db/src/schema";
import { db } from "./index";
import type { JobResult, LinkData } from "./types";
import { getJobHandler } from "./registry";

const BATCH_SIZE = 10;

async function fetchJobs(): Promise<ScrapingJob[]> {
  const now = new Date();

  // First, select the jobs
  const jobsToUpdate = await db
    .select()
    .from(scrapingJobs)
    .where(
      and(eq(scrapingJobs.status, "pending"), isNull(scrapingJobs.lockedAt))
    )
    .orderBy(desc(scrapingJobs.priority), asc(scrapingJobs.createdAt))
    .limit(BATCH_SIZE);

  // Then, update the selected jobs
  if (jobsToUpdate.length > 0) {
    await db
      .update(scrapingJobs)
      .set({
        status: "processing",
        lockedAt: now,
        updatedAt: now,
      })
      .where(
        inArray(
          scrapingJobs.id,
          jobsToUpdate.map((job) => job.id)
        )
      );
  }

  return jobsToUpdate;
}

async function executeJob(job: ScrapingJob): Promise<void> {
  const handler = getJobHandler(job.event);
  if (!handler) {
    await updateFailedJob(
      job,
      new Error(`No handler found for event type: ${job.event}`)
    );
    return;
  }

  try {
    const result = await handler.execute(job);
    await updateSuccessfulJob(job, result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      await updateFailedJob(job, error);
    } else {
      await updateFailedJob(job, new Error(String(error)));
    }
  }
}

async function updateSuccessfulJob(
  job: ScrapingJob,
  result: JobResult<LinkData>
): Promise<void> {
  console.log(result);
  await db
    .update(scrapingJobs)
    .set({
      status: "completed",
      updatedAt: new Date(),
      lockedAt: null,
    })
    .where(eq(scrapingJobs.id, job.id));
  console.log(`Job ${job.id} completed successfully`);
}

async function updateFailedJob(job: ScrapingJob, error: Error): Promise<void> {
  await db
    .update(scrapingJobs)
    .set({
      status: "failed",
      updatedAt: new Date(),
      lockedAt: null,
    })
    .where(eq(scrapingJobs.id, job.id));
  console.log(`Job ${job.id} failed: ${error.message}`);
}

async function processBatch(): Promise<number> {
  const jobs = await fetchJobs();

  if (jobs.length > 0) {
    const promises = jobs.map((job) => executeJob(job));
    await Promise.all(promises);
  }

  return jobs.length;
}

export async function startJobExecutor() {
  while (true) {
    const processedCount = await processBatch();
    if (processedCount === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
