/**
 * @file setup.tsx
 * @description Global Vitest setup file. Contains global mocks for framework components and custom matchers.
 */

import './matchers/tierlist';

import { vi } from 'vitest';
import { logger } from '@/lib/logger';

/**
 * Global mock for next/image.
 * Standardizes the mock across all tests and prevents linter errors
 * by handling unused props and adding required accessibility attributes.
 */
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...props
  }: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

/**
 * Global Network Guard
 * Prevents any unit test from making a real network request unless explicitly mocked.
 * Integration tests (*.integration.test.ts) are explicitly allowed through this barrier.
 */
const originalFetch = global.fetch;

global.fetch = async (...args) => {
  // Check the current file context executing this code
  const errorObj = new Error();
  const stackTrace = errorObj.stack || '';
  
  // If the executing test file contains .integration.test, allow it to pass through to the real internet
  if (stackTrace.includes('.integration.test.')) {
    return originalFetch(...args);
  }

  // Otherwise, throw a catastrophic error
  const target = typeof args[0] === 'string' 
    ? args[0] 
    : (args[0] instanceof Request ? args[0].url : (args[0] instanceof URL ? args[0].href : 'unknown'));
  
  logger.fatal(
    { target },
    '🚨 [FATAL: UNMOCKED NETWORK REQUEST IN UNIT TEST] 🚨\n' +
    'A test attempted to call fetch() without providing a mock implementation.\n' +
    'If this is an integration test intended to hit a real API, rename the file to end with .integration.test.ts\n' +
    'Otherwise, wrap global.fetch with vi.spyOn() or vi.fn().'
  );
  
  throw new Error(`Unmocked network request attempted in test environment targeting: ${target}`);
};
