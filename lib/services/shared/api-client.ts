/**
 * @file api-client.ts
 * @description Generic HTTP client for external media APIs with retry logic and standard logging.
 */

import { logger } from '@/lib/logger';

export interface RequestOptions extends RequestInit {
  retryLimit?: number;
  timeout?: number;
}

/**
 * Robust fetcher with automatic retries for common server errors (503, 504, 429).
 */
export async function secureFetch<T = any>(
  url: string,
  options: RequestOptions = {},
  retryCount = 0
): Promise<T> {
  const { retryLimit = 2, ...fetchOptions } = options;

  try {
    const response = await fetch(url, fetchOptions);

    // Handle temporary server errors or rate limits
    if ([429, 503, 504].includes(response.status) && retryCount < retryLimit) {
        const delay = 1000 * (retryCount + 1);
        logger.warn(`API received ${response.status} for ${url}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return secureFetch<T>(url, options, retryCount + 1);
    }

    if (!response.ok) {
        const text = await response.text();
        logger.error({ status: response.status, url, body: text }, 'External API Error');
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (retryCount < retryLimit && !(error instanceof Error && error.message.includes('API Error'))) {
        logger.warn({ error, url }, 'Network Error, retrying...');
        return secureFetch<T>(url, options, retryCount + 1);
    }
    throw error;
  }
}
