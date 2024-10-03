import type { JobHandler, LinkData } from "./types";
import { scrapeOgHandler } from "./jobs/scrapeOg";

// Add more job returns as needed
type JobReturns = LinkData;

export const jobsRegistry: Record<string, JobHandler<JobReturns>> = {
  scrape_og: scrapeOgHandler,
};

export function getJobHandler(
  eventType: string
): JobHandler<JobReturns> | undefined {
  return jobsRegistry[eventType];
}
