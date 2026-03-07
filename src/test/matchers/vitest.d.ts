/**
 * @file vitest.d.ts
 * @description TypeScript definitions for custom Vitest matchers.
 */

import 'vitest';

/**
 * Custom matchers for TierList domain objects.
 */
interface CustomMatchers<R = unknown> {
  /** Asserts that the state has a tier with the given label. */
  toHaveTier(label: string): R;
  /** Asserts that an item exists in the state, optionally in a specific tier. */
  toContainItem(itemId: string, tierLabel?: string): R;
  /** Asserts that a tier has the expected number of items. */
  toHaveItemCount(count: number, tierLabel: string): R;
  /** Asserts that the board title matches. */
  toHaveTitle(title: string): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
