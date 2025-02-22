import { describe, expect, test } from "bun:test";
import { extractTextFromNotes, isURLReachable } from "./helper";

describe("isURLReachable", () => {
  test("should return false if url is not reachable", async () => {
    const url = "http://invalid-url";
    expect(await isURLReachable(url)).toBe(false);
  }, 20000);

  test("should return true if url is reachable", async () => {
    const url = "https://google.com";
    expect(await isURLReachable(url)).toBe(true);
  });
});

describe("extractTextFromNotes", () => {
  test("should return empty string if notes is null", () => {
    const notes = null;
    expect(extractTextFromNotes(notes)).toBe("");
  });

  test("should return text if notes is not null", () => {
    const notes = {
      type: "paragraph",
      text: "Hello, world!",
    };
    expect(extractTextFromNotes(notes)).toBe("Hello, world!");
  });

  test("should return text if notes with nested elements", () => {
    const notes = {
      type: "paragraph",
      content: [
        {
          type: "paragraph",
          text: "Nested paragraph",
          content: [
            {
              type: "text",
              text: "Nested text",
            },
          ],
        },
        {
          type: "paragraph",
          text: "Hello, world!",
        },
      ],
    };
    expect(extractTextFromNotes(notes)).toBe(
      "Nested paragraph Nested text Hello, world!"
    );
  });
});
