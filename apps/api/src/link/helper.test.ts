import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { convertTextToEmbeddings, extractTextFromNotes, isURLReachable } from './helper';

// Mock the redis client
const mockRedisGet = mock();
const mockRedisSetEx = mock();

mock.module('../redis', () => ({
  redis: {
    get: mockRedisGet,
    setEx: mockRedisSetEx,
  },
}));

// Mock the openai client with return value
const mockOpenAICreate = mock(() => ({
  data: [
    {
      embedding: Array.from({ length: 1536 }, (_, i) => Math.random() * 0.1 + i * 0.001),
    },
  ],
}));

mock.module('openai', () => ({
  default: class MockOpenAI {
    embeddings = {
      create: mockOpenAICreate,
    };
  },
}));

describe('isURLReachable', () => {
  test('should return false if url is not reachable', async () => {
    const url = 'http://invalid-url';
    expect(await isURLReachable(url)).toBe(false);
  }, 20000);

  test('should return true if url is reachable', async () => {
    const url = 'https://google.com';
    expect(await isURLReachable(url)).toBe(true);
  });
});

describe('extractTextFromNotes', () => {
  test('should return empty string if notes is null', () => {
    const notes = null;
    expect(extractTextFromNotes(notes)).toBe('');
  });

  test('should return text if notes is not null', () => {
    const notes = {
      type: 'paragraph',
      text: 'Hello, world!',
    };
    expect(extractTextFromNotes(notes)).toBe('Hello, world!');
  });

  test('should return text if notes with nested elements', () => {
    const notes = {
      type: 'paragraph',
      content: [
        {
          type: 'paragraph',
          text: 'Nested paragraph',
          content: [
            {
              type: 'text',
              text: 'Nested text',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'Hello, world!',
        },
      ],
    };
    expect(extractTextFromNotes(notes)).toBe('Nested paragraph Nested text Hello, world!');
  });
});

describe('convertTextToEmbeddings caching', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockRedisGet.mockReset();
    mockRedisSetEx.mockReset();
  });

  test('should return cached embeddings on cache hit', async () => {
    const cachedEmbedding = [0.4, 0.5, 0.6];

    // Mock Redis cache hit
    mockRedisGet.mockResolvedValue(JSON.stringify(cachedEmbedding));

    const text = 'Cached text';
    const embeddings = await convertTextToEmbeddings(text);

    expect(embeddings).toEqual(cachedEmbedding);

    // Verify Redis get was called but setEx was not (cache hit)
    expect(mockRedisGet).toHaveBeenCalledTimes(1);
    expect(mockRedisSetEx).not.toHaveBeenCalled();
  });

  test('should handle Redis cache read failure gracefully', async () => {
    // Mock Redis cache read failure
    mockRedisGet.mockRejectedValue(new Error('Redis connection failed'));
    mockRedisSetEx.mockResolvedValue('OK');

    const text = 'Text with Redis read failure';
    const embeddings = await convertTextToEmbeddings(text);

    expect(embeddings).toBeDefined();
    expect(embeddings).toBeArray();

    // Verify Redis get was called and setEx was attempted despite read failure
    expect(mockRedisGet).toHaveBeenCalledTimes(1);
    expect(mockRedisSetEx).toHaveBeenCalledTimes(1);
  });

  test('should handle Redis cache write failure gracefully', async () => {
    // Mock Redis cache miss and write failure that's handled silently
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetEx.mockImplementation(async () => {
      throw new Error('Redis write failed');
    });

    const text = 'Text with Redis write failure';

    // The function should not throw even if Redis write fails
    const embeddings = await convertTextToEmbeddings(text);

    expect(embeddings).toBeDefined();
    expect(embeddings).toBeArray();

    // Verify Redis get was called and setEx was attempted despite the error
    expect(mockRedisGet).toHaveBeenCalledTimes(1);
    expect(mockRedisSetEx).toHaveBeenCalledTimes(1);
  });

  test('should use same cache key for identical text', async () => {
    // Mock Redis cache miss
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetEx.mockResolvedValue('OK');

    const text = 'Identical text';

    // Call twice with same text
    await convertTextToEmbeddings(text);
    await convertTextToEmbeddings(text);

    // Both calls should use the same cache key
    expect(mockRedisGet).toHaveBeenCalledTimes(2);
    const firstCallKey = mockRedisGet.mock.calls[0][0];
    const secondCallKey = mockRedisGet.mock.calls[1][0];
    expect(firstCallKey).toBe(secondCallKey);
    expect(firstCallKey).toMatch(/^embedding:[a-f0-9]{64}$/);
  });

  test('should use different cache keys for different text', async () => {
    // Mock Redis cache miss
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetEx.mockResolvedValue('OK');

    await convertTextToEmbeddings('First text');
    await convertTextToEmbeddings('Second text');

    // Both calls should use different cache keys
    expect(mockRedisGet).toHaveBeenCalledTimes(2);
    const firstCallKey = mockRedisGet.mock.calls[0][0];
    const secondCallKey = mockRedisGet.mock.calls[1][0];
    expect(firstCallKey).not.toBe(secondCallKey);
    expect(firstCallKey).toMatch(/^embedding:[a-f0-9]{64}$/);
    expect(secondCallKey).toMatch(/^embedding:[a-f0-9]{64}$/);
  });

  test('should cache embedding with correct TTL', async () => {
    // Mock Redis cache miss
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetEx.mockResolvedValue('OK');

    const text = 'Text to cache with TTL check';
    await convertTextToEmbeddings(text);

    // Verify caching was attempted with correct TTL
    expect(mockRedisSetEx).toHaveBeenCalledTimes(1);
    expect(mockRedisSetEx).toHaveBeenCalledWith(
      expect.stringContaining('embedding:'),
      86400, // 1 day TTL in seconds
      expect.any(String),
    );
  });
});
