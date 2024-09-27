import { describe, expect, test } from 'bun:test';
import { isURLReachable, parseLinkData } from './parser';

describe('parseLinkData', async () => {
  test('should parse link data', async () => {
    const urls = [
      'https://open.spotify.com/track/3fpKdubElctX8ZrwA548Mj?si=9e831a9dc0b44a8d&nd=1&dlsi=f528e543d6e84a9b',
      'https://superuser.com/questions/209437/how-do-i-scroll-in-tmux',
      'https://www.npmjs.com/package/node-html-parser',
      'https://chatgpt.com/c/66f59cb2-7ef0-800a-95be-29d88dbc9b8a',
    ];

    for (const url of urls) {
      const data = await parseLinkData(url);
      expect(data).toBeDefined();
    }
  });

  test('should throw an error if the link data is invalid', async () => {
    const url = 'https://invalid-url.com';
    await expect(parseLinkData(url)).rejects.toThrow('Failed to parse link data');
  });
});

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
