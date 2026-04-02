# Test Framework Audit Report

## Overview
This report summarizes the compliance of the current test suite with the testing framework defined in `docs/TESTING.md` and project guidelines in `GEMINI.md`.

## Test Tiers Compliance

### Unit Tests
- **Status**: Generally Compliant.
- **Files**: `src/**/*.test.ts` (excluding feature integration tests).
- **Notes**: Focus on pure functions and isolated logic. Some files still contain `any` usages in mocks.

### Component Integration Tests
- **Status**: Compliant.
- **Files**: `src/features/board/TierListApp.test.tsx`, `src/features/search/SearchTab.test.tsx`.
- **Notes**: Successfully use `renderWithProviders` and test multi-component state flows. Lints have been cleaned up in these target files.

### Service Integration Tests
- **Status**: Compliant.
- **Files**: `src/infra/providers/provider.integration.test.ts`.
- **Notes**: Hits live APIs but is explicitly allowed by `docs/TESTING.md` with hard limit guards to prevent quota exhaustion.

### E2E Tests
- **Status**: Partially Compliant.
- **Files**: `e2e/*.spec.ts`.
- **Notes**: Good coverage of visual and interactive features. However, several files violate the "no hardcoded sleeps" rule.

## Violations Found

### 1. Hardcoded Sleeps (`waitForTimeout`)
Explicitly flagged as code smell in `GEMINI.md`.
- `e2e/complex-board.spec.ts:20`: `await page.waitForTimeout(5000);`
- `e2e/pom/SearchPanel.ts:78`: `await this.page.waitForTimeout(500);`
- `e2e/pom/BoardPage.ts:475`: `await this.page.waitForTimeout(500);`
- `e2e/pom/BoardPage.ts:525`: `await this.page.waitForTimeout(500);`

### 2. Excessive `any` Usages
Linter flags many test files with `any` usage in mocks or assertions.
- Seen in `src/app/api/search/route.test.ts`, `useTierListDrag.test.ts`, `useTierListIO.test.ts`, `useTierListNamespaces.test.ts`, `useTierListUtils.test.ts`, `item-reducer.test.ts`.

## Recommendations
1.  **Remove `waitForTimeout`**: Refactor E2E tests to use `expect.poll` or locator-based waiting.
2.  **Type Mocks Properly**: Replace `any` with `unknown` or proper type casting in test files.
