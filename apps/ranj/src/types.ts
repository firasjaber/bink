import type { ScrapingJob } from "db/src/schema";
import { z } from "zod";

export type JobResult<T> = { success: boolean; data?: T; error?: string };

export interface JobHandler<T> {
  execute: (job: ScrapingJob) => Promise<JobResult<T>>;
}

export const LinkDataSchema = z.object({
  siteName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

export type LinkData = z.infer<typeof LinkDataSchema>;
