/**
 * @file global.d.ts
 * @description Global type definitions for the application.
 */

declare global {
  // Flag set by Playwright to detect test environment
  var isPlaywright: boolean | undefined;

  // Test API exposed by the board context for E2E tests
  var __TIERLIST_TEST_API__: {
    getState: () => import('@/features/board/types').TierListState;
    dispatch: (action: import('@/features/board/state/reducer').BoardAction) => void;
    isHydrated: boolean;
  } | undefined;
}

// Ensure this file is treated as a module
export {}; // eslint-disable-line unicorn/require-module-specifiers
