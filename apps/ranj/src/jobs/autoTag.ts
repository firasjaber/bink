import * as dbQueries from 'db/src/queries';
import type { ScrapingJob } from 'db/src/schema';
import { db } from '../db';
import { logger } from '../logger';
import { type Tag, generateTagSuggestions } from '../openai';
import type { JobHandler, JobResult } from '../types';

const MAX_AI_TRIALS = 10;

const getRemainingTrials = (trialCount: number) => Math.max(0, MAX_AI_TRIALS - trialCount);

const resolveAiAccess = async (userId: string) => {
  const user = await dbQueries.user.selectUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }

  const systemApiKey = process.env.OPENAI_API_KEY;
  const remainingTrials = getRemainingTrials(user.aiTrialCount ?? 0);

  if (user.isPro) {
    if (!systemApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return { apiKey: systemApiKey, shouldConsumeTrial: false };
  }

  if (user.openAiApiKey) {
    return { apiKey: user.openAiApiKey, shouldConsumeTrial: false };
  }

  if (remainingTrials > 0) {
    if (!systemApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return { apiKey: systemApiKey, shouldConsumeTrial: true };
  }

  return { apiKey: null, shouldConsumeTrial: false };
};

export const autoTagHandler: JobHandler<void> = {
  async execute(job: ScrapingJob): Promise<JobResult<void>> {
    logger.info(`Auto-tagging for link ID: ${job.linkId}`);

    if (!job.autoTagging || !job.userId) {
      logger.info(`Auto-tagging disabled for job ${job.id}, skipping`);
      return { success: true };
    }

    try {
      const link = await dbQueries.link.selectLinkById(db, job.linkId, job.userId);

      if (!link || !link.title) {
        logger.warn(`Link ${job.linkId} not found or has no title, skipping auto-tagging`);
        return { success: true };
      }

      const availableTags: Tag[] = await dbQueries.link.selectAllUserTags(db, job.userId);

      if (availableTags.length === 0) {
        logger.info(`No available tags for user ${job.userId}, skipping auto-tagging`);
        return { success: true };
      }

      const aiAccess = await resolveAiAccess(job.userId);
      if (!aiAccess.apiKey) {
        logger.info(`AI access unavailable for user ${job.userId}, skipping auto-tagging`);
        return { success: true };
      }

      const suggestedTagNames = await generateTagSuggestions(
        link.title,
        link.description || undefined,
        availableTags,
        aiAccess.apiKey,
      );

      if (aiAccess.shouldConsumeTrial) {
        await dbQueries.user.incrementUserAiTrialCount(db, job.userId);
      }

      if (suggestedTagNames.length === 0) {
        logger.info(`No tags suggested for link ${job.linkId}`);
        return { success: true };
      }

      const existingTags = await dbQueries.link.selectLinkTags(db, job.linkId);

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

      await dbQueries.link.deleteLinkTagsByLinkId(db, job.linkId, job.userId, mergedTags);

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
