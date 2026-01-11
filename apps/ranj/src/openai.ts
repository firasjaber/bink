import OpenAI from 'openai';
import { logger } from './logger';

export interface Tag {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
}

export async function generateTagSuggestions(
  title: string,
  description: string | undefined,
  availableTags: Tag[],
  apiKey: string,
): Promise<string[]> {
  if (!apiKey) {
    logger.warn('OpenAI API key not set, auto-tagging will be skipped');
    return [];
  }

  const client = new OpenAI({ apiKey });
  const tagNames = availableTags.map((tag) => tag.name);
  const tagNamesString = JSON.stringify(tagNames);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that selects relevant tags for web links.

Available tags: ${tagNamesString}

Rules:
1. Select 2-5 tags from the available tags list
2. Tags must be relevant to the content
3. Only use tags from the provided list
4. Return as JSON array of tag names (strings)
5. If less than 2 tags are relevant, return as many as are relevant
6. Do not invent new tags`,
      },
      {
        role: 'user',
        content: `Title: ${title}\nDescription: ${description || 'No description'}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  const suggestedTagNames = parsed.tags || [];

  return suggestedTagNames.filter((tagName: string) => tagNames.includes(tagName));
}
