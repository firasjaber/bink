import { createHash } from 'crypto';
import OpenAI from 'openai';
import { config } from '../config';
import { redis } from '../redis';

export async function isURLReachable(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);

    const fetchOptions = {
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      // @ts-ignore - Bun-specific option to ignore SSL certificate errors
      tls: {
        rejectUnauthorized: false,
      },
    };

    // Try HEAD request first (faster and lighter)
    try {
      const response: Response = await fetch(url, {
        method: 'HEAD',
        ...fetchOptions,
      });
      return response.ok;
    } catch (_) {
      // Some servers don't respond to HEAD, try GET as fallback
      const response: Response = await fetch(url, {
        method: 'GET',
        ...fetchOptions,
      });
      return response.ok;
    }
  } catch (error) {
    console.error('isURLReachable error for', urlString, ':', error);
    return false;
  }
}

interface TextNode {
  type: string;
  text?: string;
  content?: TextNode[];
  attrs?: {
    level?: number;
    [key: string]: unknown;
  };
}

export function extractTextFromNotes(notes: TextNode | null): string {
  if (!notes) return '';

  const text: string[] = [];

  // If the node has direct text, add it
  if (notes.text) {
    text.push(notes.text);
  }

  // Recursively process content array if it exists
  if (notes.content && Array.isArray(notes.content)) {
    for (const node of notes.content) {
      text.push(extractTextFromNotes(node));
    }
  }

  return text.join(' ').trim();
}

export async function convertTextToEmbeddings(text: string) {
  // Create a hash of the text for caching
  const textHash = createHash('sha256').update(text).digest('hex');
  const cacheKey = `embedding:${textHash}`;

  try {
    // Try to get cached embedding
    const cachedEmbedding = await redis.get(cacheKey);
    if (cachedEmbedding) {
      return JSON.parse(cachedEmbedding);
    }
  } catch (error) {
    console.warn('Redis cache read failed:', error);
  }

  let embedding: number[];

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  embedding = response.data[0].embedding;

  // Cache the embedding with 1 day TTL (86400 seconds)
  try {
    await redis.setEx(cacheKey, 86400, JSON.stringify(embedding));
  } catch (error) {
    console.warn('Redis cache write failed:', error);
  }

  return embedding;
}
