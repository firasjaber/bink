import { type ScrapingJob } from "db/src/schema";
import { db } from "./index";
import { getJobHandler } from "./registry";
import * as queries from "db/src/queries";
import { logger } from "./logger";

const BATCH_SIZE = 10;

async function fetchJobs(): Promise<ScrapingJob[]> {
  // First, select the jobs
  const jobsToUpdate = await queries.scrapingJobs.getPendingJobs(
    db,
    BATCH_SIZE
  );

  // Then, update the selected jobs
  if (jobsToUpdate.length > 0) {
    await queries.scrapingJobs.updateJobsToProcessing(
      db,
      jobsToUpdate.map((job) => job.id)
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
    logger.info(`Job ${job.id} completed successfully, result: ${result}`);
    await updateSuccessfulJob(job);
  } catch (error: unknown) {
    if (error instanceof Error) {
      await updateFailedJob(job, error);
    } else {
      await updateFailedJob(job, new Error(String(error)));
    }
  }
}

async function updateSuccessfulJob(job: ScrapingJob): Promise<void> {
  await queries.scrapingJobs.updateJobToCompleted(db, job.id);
  logger.info(`Job ${job.id} completed successfully`);
}

async function updateFailedJob(job: ScrapingJob, error: Error): Promise<void> {
  await queries.scrapingJobs.updateJobToFailed(db, job.id);
  logger.error(`Job ${job.id} failed: ${error.message}`);
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
