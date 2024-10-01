import ogs from 'open-graph-scraper';
import { z } from 'zod';

const LinkDataSchema = z.object({
  siteName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

export type LinkData = z.infer<typeof LinkDataSchema>;

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

export async function isURLReachable(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const response: Response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    return response.ok;
  } catch (_error) {
    return false;
  }
}
