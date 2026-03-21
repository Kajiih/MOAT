/**
 * @file api-client.ts
 * @description Generic HTTP client for external provider APIs with retry logic and standard logging.
 */

import { ProviderError, ProviderErrorCode } from '@/domain/providers/errors';
import { logger } from '@/lib/logger';

/** Options for secure fetch requests. */
export interface RequestOptions extends RequestInit {
  retryLimit?: number;
  timeout?: number;
  raw?: boolean;
}

function buildFetchOptions(
  baseOptions: RequestInit,
  customSignal?: AbortSignal | null,
  timeout?: number,
): RequestInit {
  const signals: AbortSignal[] = [];
  if (customSignal) signals.push(customSignal);
  if (
    timeout !== undefined &&
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    signals.push(AbortSignal.timeout(timeout));
  }

  return {
    ...baseOptions,
    ...(signals.length > 0 && {
      signal: typeof AbortSignal.any === 'function' ? AbortSignal.any(signals) : signals[0],
    }),
  };
}

function calculateRetryDelay(response: Response | null, attempt: number): number {
  if (response && typeof response.headers?.get === 'function') {
    const retryAfterHeader = response.headers.get('Retry-After');
    if (retryAfterHeader) {
      const delaySeconds = Number.parseInt(retryAfterHeader, 10);

      // If parsed as an integer, it's a delay in seconds
      if (!Number.isNaN(delaySeconds) && delaySeconds > 0) {
        return delaySeconds * 1000;
      }

      // Otherwise, it might be an HTTP-date
      const date = new Date(retryAfterHeader);
      if (!Number.isNaN(date.getTime())) {
        const diff = date.getTime() - Date.now();
        if (diff > 0) return diff;
      }
    }
  }

  // Full Jitter implementation for exponential backoff
  const maxDelay = Math.pow(2, attempt) * 1000;
  return Math.floor(Math.random() * maxDelay) + 250; // Guaranteed 250ms minimum, up to maxDelay + 250ms
}

/**
 * Robust fetcher with automatic retries for common server errors (503, 504, 429).
 * @template T - The expected response type when not expecting a raw Response.
 * @param url - The full URL to fetch.
 * @param options - Fetch options including retry limits, timeouts, and raw response flag.
 * @returns The parsed generic Type T or the raw Response.
 */
export async function secureFetch<T = unknown>(
  url: string,
  options?: Omit<RequestOptions, 'raw'> & { raw?: false },
): Promise<T>;
export async function secureFetch(
  url: string,
  options: RequestOptions & { raw: true },
): Promise<Response>;
export async function secureFetch<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T | Response> {
  const { retryLimit = 2, raw = false, timeout, signal: customSignal, ...rest } = options;
  const currentFetchOptions = buildFetchOptions(rest, customSignal, timeout);

  for (let attempt = 0; attempt <= retryLimit; attempt++) {
    const isLastAttempt = attempt === retryLimit;
    let response: Response;

    // 1. Handle actual network/transport errors (Timeouts, DNS failures, etc.)
    try {
      response = await fetch(url, currentFetchOptions);
    } catch (error) {
      if (isLastAttempt || !shouldRetryError(error)) {
        handleTerminalError(error, url, timeout);
      }

      logger.warn({ error, url }, 'Network Error, retrying...');
      const delay = calculateRetryDelay(null, attempt);
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
      continue;
    }

    // 2. Handle API/HTTP Status errors
    if ([429, 503, 504].includes(response.status)) {
      if (isLastAttempt) {
        await handleNonOkResponse(response, url);
      }

      const delay = calculateRetryDelay(response, attempt);
      logger.warn(
        `API received ${response.status} for ${url}. Retrying in ${Math.round(delay)}ms...`,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
      continue;
    }

    if (!response.ok) {
      // 4xx client errors (excluding 429) or non-retryable 5xx errors terminate immediately
      await handleNonOkResponse(response, url);
    }

    // 3. Handle success
    if (raw) {
      return response;
    }

    return (await response.json()) as T;
  }

  throw new Error('Unreachable code in secureFetch');
}

async function handleNonOkResponse(response: Response, url: string): Promise<never> {
  const text = await response.text();
  logger.error({ status: response.status, url, body: text }, 'External API Error');

  throw new ProviderError(
    resolveErrorCode(response.status),
    `API Error: ${response.status} ${response.statusText}`,
    { status: response.status, body: text },
  );
}

function shouldRetryError(error: unknown): boolean {
  return (
    !(error instanceof ProviderError) &&
    !(error instanceof SyntaxError) &&
    !(error instanceof DOMException && error.name === 'AbortError') &&
    !(error instanceof DOMException && error.name === 'TimeoutError')
  );
}

function handleTerminalError(error: unknown, url: string, timeout?: number): never {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    logger.error({ url, timeout }, 'API Request Timed Out');
    throw new ProviderError(
      ProviderErrorCode.TIMEOUT,
      `Request timed out after ${timeout}ms`,
      error,
    );
  }
  throw error;
}
function resolveErrorCode(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return ProviderErrorCode.AUTH_ERROR;
  if (status === 404) return ProviderErrorCode.NOT_FOUND;
  if (status === 429) return ProviderErrorCode.RATE_LIMIT;
  if (status >= 500) return ProviderErrorCode.SERVICE_UNAVAILABLE;
  return ProviderErrorCode.INTERNAL_ERROR;
}
