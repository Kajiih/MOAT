# Provider Testing & API Diagnostics

Moat implements a highly standardized, globally guarded testing architecture to ensure providers are completely resilient to upstream API drift.

## 1. Global Network Isolation (`src/test/setup.tsx`)

**All unit tests in Moat are strictly isolated from the live internet.**
If an adapter (`my-provider.test.ts`) forgets to use `vi.spyOn(global, 'fetch')` and attempts to execute a live API fetch, the Vitest runner will intercept the request and throw a catastrophic failure:
`Error: Unmocked network request attempted in test environment.`

This guarantees that local development commands (`npm run test`) never accidentally trigger API bans.

## 2. Generic Integration Suite (`src/providers/provider.integration.test.ts`)

We use a single, generic integration loop that fundamentally asserts the resilience of every provider automatically.

**This file explicitly bypasses the global network guard** (via `.integration.test.ts` suffix) to interact with live APIs. It systematically loops through every registered Provider and its `entities`, executing:

- **Image Resolution Checks**: Validates that `testImageKeys` yield valid URLs.
- **Sorting Validation**: Pulls live data and asserts correct date/alphabetical string sorting.
- **Filtering Validation**: Submits payload test cases and runs Zod parse checks against the response.
- **Edge Cases**:
  - Submits ghost queries (`___NON_EXISTENT_GIBBERISH___`) to verify empty array fallbacks.
  - Submits encoded symbols (like `éà!@#$%`) to ensure network sanitization doesn't crash the Node server.
  - Submits extreme offsets or boundary queries to ensure the `hasNextPage` cursor safely stops at the API wall.

## 3. Targeted Provider Debugging

When actively developing a new provider or fixing a broken cursor lock, target the tests natively to prevent API quota exhaustion. Use Vitest's regular expression targeting (`-t`):

```bash
# General Unit Test Mode (Fully Mocked, Safe)
npm run test

# Run ALL Integration Tests (Consumes API Quotas)
npm run test:integration -- --run

# Run BOTH Unit and Integration Tests
npm run test:all

# Target ONLY the RAWG provider integration
npm run test:integration -- --run -t "(rawg)"

# Target ONLY the Release Year filter on RAWG
npm run test:integration -- --run -t "rawg.*yearRange"

# Target ONLY Edge Cases for the rawg provider
npm run test:integration -- --run -t "rawg.*Edge Cases"
```

## 4. API Metric Quotas (CI Protection)

The integration suite tracks every `global.fetch` internally via a non-blocking `vi.spyOn`. When the test completes, Vitest prints a unified diagnostic table outlining exactly how many network requests were made:

```text
======================================
📡  INTEGRATION API METRICS (QUOTA) 📡
======================================
- rawg           : 84 requests
--------------------------------------
- TOTAL          : 84 requests
======================================
```

If a developer's code triggers an infinite pagination loop, the suite will hard-fail the Github Action (`expect(fetchCalls).toBeLessThan(120)`), protecting API billing parameters.
