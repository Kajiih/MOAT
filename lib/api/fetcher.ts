/**
 * @file fetcher.ts
 * @description Shared fetcher utility for SWR with built-in retry logic for rate limits.
 * Handles automatic retries on 503 errors (common with MusicBrainz API).
 * @module ApiFetcher
 */

/**
 * Robust fetcher for SWR.
 *
 * @param url - The URL to fetch.
 * @param retryCount - Internal tracking of retry attempts.
 * @returns Parsed JSON response.
 * @throws Error on non-ok responses.
 */
export const swrFetcher = async <T>(url: string, retryCount = 0): Promise<T> => {
  const res = await fetch(url);

  // Handle 503 Service Unavailable (rate limiting)
  if (res.status === 503 && retryCount < 2) {
    // Wait for 2 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return swrFetcher(url, retryCount + 1);
  }

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};
