import * as queries from 'db/src/queries';
import type { ScrapingJob } from 'db/src/schema';
import { db } from '../db';
import { logger } from '../logger';
import { type Tag, generateTagSuggestions } from '../openai';
import type { JobHandler, JobResult } from '../types';

export const autoTagHandler: JobHandler<void> = {
  async execute(job: ScrapingJob): Promise<JobResult<void>> {
    logger.info(`Auto-tagging for link ID: ${job.linkId}`);

    if (!job.autoTagging || !job.userId) {
      logger.info(`Auto-tagging disabled for job ${job.id}, skipping`);
      return { success: true };
    }

    try {
      const link = await queries.link.selectLinkById(db, job.linkId, job.userId);

      if (!link || !link.title) {
        logger.warn(`Link ${job.linkId} not found or has no title, skipping auto-tagging`);
        return { success: true };
      }

      const availableTags: Tag[] = await queries.link.selectAllUserTags(db, job.userId);

      if (availableTags.length === 0) {
        logger.info(`No available tags for user ${job.userId}, skipping auto-tagging`);
        return { success: true };
      }

      const suggestedTagNames = await generateTagSuggestions(
        link.title,
        link.description || undefined,
        availableTags,
      );

      if (suggestedTagNames.length === 0) {
        logger.info(`No tags suggested for link ${job.linkId}`);
        return { success: true };
      }

      const existingTags = await queries.link.selectLinkTags(db, job.linkId);

      const existingTagNames = new Set(existingTags.map((tag) => tag.name));
      const mergedTagNames = [
        ...existingTagNames,
        ...suggestedTagNames.filter((name) => !existingTagNames.has(name)),
      ];

      const mergedTags = mergedTagNames
        .map((name) => {
          const tag = availableTags.find((t) => t.name === name);
          if (!tag) return null;
          return {
            name: tag.name,
            color: tag.color,
          };
        })
        .filter((tag): tag is { name: string; color: string } => tag !== null);

      await queries.link.deleteLinkTagsByLinkId(db, job.linkId, job.userId, mergedTags);

      logger.info(
        `Successfully auto-tagged link ${job.linkId} with ${suggestedTagNames.length} tags`,
      );
      return { success: true };
    } catch (error) {
      logger.error(`Auto-tagging failed for link ${job.linkId}:`, error);
      return { success: true };
    }
  },
};
