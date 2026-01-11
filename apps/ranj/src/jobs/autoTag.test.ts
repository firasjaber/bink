import { describe, expect, test } from 'bun:test';
import { generateTagSuggestions } from '../openai';

describe('generateTagSuggestions', async () => {
  test('should return empty array when API key is missing', async () => {
    const result = await generateTagSuggestions('Test Title', 'Test Description', [], '');

    expect(result).toEqual([]);
  });

  test('should throw on API error', async () => {
    await expect(
      generateTagSuggestions('Test Title', 'Test Description', [], 'test-key-invalid'),
    ).rejects.toBeDefined();
  });
});
