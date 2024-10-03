import { describe, expect, test } from "bun:test";
import { isURLReachable } from "./helper";

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
