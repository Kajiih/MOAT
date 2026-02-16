/**
 * @file setup.tsx
 * @description Global Vitest setup file. Contains global mocks for framework components.
 */

import { vi } from 'vitest';

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
