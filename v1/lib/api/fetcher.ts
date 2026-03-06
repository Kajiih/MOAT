/**
 * @file fetcher.ts
 * @description Shared fetcher utility for SWR with built-in retry logic for rate limits.
 * Handles automatic retries on 503 errors (common with MusicBrainz API).
 * @module ApiFetcher
 */

/**
 * Robust fetcher for SWR.
 * @param url - The URL to fetch.
 * @param retryCount - Internal tracking of retry attempts.
 * @returns Parsed JSON response.
 * @throws {Error} On non-ok responses.
 */
export const swrFetcher = async <T>(url: string, retryCount = 0): Promise<T> => {
  const res = await fetch(url);

  // Handle 503 Service Unavailable (rate limiting) & 504 Gateway Timeout
  if ((res.status === 503 || res.status === 504) && retryCount < 2) {
    // Wait for 2 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return swrFetcher(url, retryCount + 1);
  }

  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching the data.';
    let errorInfo: unknown = {};

    try {
      errorInfo = await res.json();
      if (errorInfo && typeof errorInfo === 'object' && 'error' in errorInfo) {
        errorMessage = String(errorInfo.error);
      }
    } catch {
      // If parsing fails, use the status text
      errorMessage = res.statusText || errorMessage;
    }

    const error = new Error(errorMessage) as Error & {
      status?: number;
      info?: unknown;
    };
    error.status = res.status;
    error.info = errorInfo;
    throw error;
  }
  return res.json();
};
