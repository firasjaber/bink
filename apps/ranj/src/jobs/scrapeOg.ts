import type { JobHandler, JobResult, LinkData } from "../types";
import { linkTable, type ScrapingJob } from "db/src/schema";
import ogs from "open-graph-scraper";
import { LinkDataSchema } from "../types";
import { db } from "..";
import { eq } from "drizzle-orm";

export const scrapeOgHandler: JobHandler<LinkData> = {
  async execute(job: ScrapingJob): Promise<JobResult<LinkData>> {
    console.log(`Scraping OG data for URL: ${job.url}`);

    const data = await parseLinkData(job.url);

    // update the link with the data
    await db
      .update(linkTable)
      .set({
        title: data.title,
        description: data.description,
        image: data.image,
      })
      .where(eq(linkTable.id, job.linkId));

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
      throw new Error("Failed to parse link data");
    }

    // Parse the result using the Zod schema
    const parsedData = LinkDataSchema.parse({
      siteName: result.ogSiteName,
      title: result.ogTitle,
      description: result.ogDescription,
      image:
        result.ogImage && result.ogImage.length > 0
          ? result.ogImage[0].url
          : undefined,
    });

    return parsedData;
  } catch (_error) {
    throw new Error("Failed to parse link data");
  }
}
