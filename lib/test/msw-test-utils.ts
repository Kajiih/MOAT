/**
 * @file msw-test-utils.ts
 * @description Utility functions to simplify MSW server lifecycle in Vitest.
 */

import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import type { RequestHandler } from 'msw';

/**
 * Sets up a Mock Service Worker (MSW) server for the current test file.
 * Handles server start, reset, and close automatically.
 *
 * @param handlers - Array of MSW request handlers.
 * @returns The MSW server instance if manual control is needed.
 *
 * @example
 * const server = setupMSW(handlers);
 */
export function setupMSW(handlers: RequestHandler[]) {
  const server = setupServer(...handlers);

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  return server;
}
