import { describe, expect, test } from 'bun:test';
import { generateTagSuggestions } from '../openai';

describe('generateTagSuggestions', async () => {
  test('should return empty array when API key is missing', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await generateTagSuggestions('Test Title', 'Test Description', []);

    expect(result).toEqual([]);

    process.env.OPENAI_API_KEY = originalKey;
  });

  test('should handle API error gracefully', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key-invalid';

    const result = await generateTagSuggestions('Test Title', 'Test Description', []);

    expect(result).toEqual([]);

    process.env.OPENAI_API_KEY = originalKey;
  });
});
