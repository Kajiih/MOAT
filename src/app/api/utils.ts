/**
 * @file utils.ts
 * @description Shared HTTP and error utilities for Next.js API Routes.
 */

import { NextResponse } from 'next/server';

import { isObject } from '@/lib/type-guards';
import { ProviderError, ProviderErrorCode } from '@/domain/providers/errors';

/**
 * Normalizes an unknown error from the provider layer into an appropriate Next.js HTTP response.
 * Identifies standard `ProviderError` exceptions and assigns precise status codes.
 * Safely extracts string bodies to avoid `(undefined).message` crashes.
 * @param error - The locally caught or native javascript error stack.
 * @returns A normalized NextResponse for the front-end fetcher.
 */
export function createErrorResponse(error: unknown): NextResponse {
  if (error instanceof ProviderError) {
    const statusMap: Record<ProviderErrorCode, number> = {
      [ProviderErrorCode.NOT_FOUND]: 404,
      [ProviderErrorCode.AUTH_ERROR]: 401,
      [ProviderErrorCode.RATE_LIMIT]: 429,
      [ProviderErrorCode.VALIDATION_ERROR]: 502,
      [ProviderErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ProviderErrorCode.TIMEOUT]: 504,
      [ProviderErrorCode.INTERNAL_ERROR]: 500,
    };

    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: statusMap[error.code] || 500 },
    );
  }

  // 1. If it's a native Error, extract the message
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message, code: ProviderErrorCode.INTERNAL_ERROR },
      { status: 500 },
    );
  }

  // 1b. If it's an object that threw a message prop (duck typing)
  if (isObject(error) && typeof error.message === 'string') {
    return NextResponse.json(
      { error: error.message, code: ProviderErrorCode.INTERNAL_ERROR },
      { status: 500 },
    );
  }

  // 2. If it's an arbitrary string payload
  if (typeof error === 'string' && error.trim() !== '') {
    return NextResponse.json({ error, code: ProviderErrorCode.INTERNAL_ERROR }, { status: 500 });
  }

  // 3. Absolute fallback (blank object or null)
  return NextResponse.json(
    { error: 'An unknown server error occurred', code: ProviderErrorCode.INTERNAL_ERROR },
    { status: 500 },
  );
}
