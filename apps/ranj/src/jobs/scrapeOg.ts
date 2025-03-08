import * as queries from 'db/src/queries';
import { LinkStateEnum, type ScrapingJob, linkTable } from 'db/src/schema';
import ogs from 'open-graph-scraper';
import { db } from '..';
import { logger } from '../logger';
import type { JobHandler, JobResult, LinkData } from '../types';
import { LinkDataSchema } from '../types';

export const scrapeOgHandler: JobHandler<LinkData> = {
  async execute(job: ScrapingJob): Promise<JobResult<LinkData>> {
    logger.info(`Scraping OG data for URL: ${job.url}`);

    const data = await parseLinkData(job.url);

    // update the link with the data
    await queries.link.update(db, job.linkId, {
      title: data.title,
      description: data.description,
      image: data.image,
      state: 'processed',
    });

    return {
      success: true,
      data: data,
    };
  },
};

export async function parseLinkData(url: string): Promise<LinkData> {
  const options = { url };
  try {
    const { result } = await ogs(options);

    if (!result.success) {
      throw new Error('Failed to parse link data');
    }

    // Parse the result using the Zod schema
    const parsedData = LinkDataSchema.parse({
      siteName: result.ogSiteName,
      title: result.ogTitle,
      description: result.ogDescription,
      image: result.ogImage && result.ogImage.length > 0 ? result.ogImage[0].url : undefined,
    });

    return parsedData;
  } catch (_error) {
    throw new Error('Failed to parse link data');
  }
}
