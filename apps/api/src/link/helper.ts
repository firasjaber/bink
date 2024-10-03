export async function isURLReachable(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const response: Response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    return response.ok;
  } catch (_error) {
    return false;
  }
}
