import * as queries from 'db/src/queries';
import { drizzle } from '../';
import { config } from '../config';

export const MAX_AI_TRIALS = 10;

type AiKeySource = 'system' | 'user' | null;

export interface AiAccessResult {
  apiKey: string | null;
  source: AiKeySource;
  remainingTrials: number;
  shouldConsumeTrial: boolean;
  isPro: boolean;
  hasUserKey: boolean;
}

export function getRemainingTrials(trialCount: number) {
  return Math.max(0, MAX_AI_TRIALS - trialCount);
}

export async function getAiAccess(userId: string): Promise<AiAccessResult> {
  const user = await queries.user.selectUserById(drizzle, userId);
  if (!user) {
    throw new Error('User not found');
  }

  const isPro = user.isPro ?? false;
  const userKey = user.openAiApiKey ?? null;
  const remainingTrials = getRemainingTrials(user.aiTrialCount ?? 0);

  if (isPro) {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return {
      apiKey: config.OPENAI_API_KEY,
      source: 'system',
      remainingTrials,
      shouldConsumeTrial: false,
      isPro,
      hasUserKey: Boolean(userKey),
    };
  }

  if (userKey) {
    return {
      apiKey: userKey,
      source: 'user',
      remainingTrials,
      shouldConsumeTrial: false,
      isPro,
      hasUserKey: true,
    };
  }

  if (remainingTrials > 0) {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return {
      apiKey: config.OPENAI_API_KEY,
      source: 'system',
      remainingTrials,
      shouldConsumeTrial: true,
      isPro,
      hasUserKey: false,
    };
  }

  return {
    apiKey: null,
    source: null,
    remainingTrials,
    shouldConsumeTrial: false,
    isPro,
    hasUserKey: false,
  };
}

export async function consumeAiTrial(userId: string) {
  const user = await queries.user.incrementUserAiTrialCount(drizzle, userId);
  if (!user) {
    throw new Error('Failed to update AI trial count');
  }
  return getRemainingTrials(user.aiTrialCount ?? 0);
}
