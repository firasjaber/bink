import { autoTagHandler } from './jobs/autoTag';
import { scrapeOgHandler } from './jobs/scrapeOg';
import type { JobHandler, LinkData, TagData } from './types';

type JobReturns = LinkData | TagData;

export const jobsRegistry: Record<string, JobHandler<JobReturns>> = {
  scrape_og: scrapeOgHandler,
  auto_tag: autoTagHandler,
};

export function getJobHandler(eventType: string): JobHandler<JobReturns> | undefined {
  return jobsRegistry[eventType];
}
