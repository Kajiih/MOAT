/* eslint-disable vitest/valid-expect, vitest/max-nested-describe, vitest/valid-describe-callback, @typescript-eslint/no-explicit-any, sonarjs/no-nested-template-literals */
import '@/providers/bootstrap';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ItemDetailsSchema } from '@/items/items';
import { logger } from '@/lib/logger';
import { registry } from '@/providers/registry';
import { DEFAULT_PAGE_LIMIT, ProviderStatus } from '@/providers/types';
import { FilterTestCase } from '@/search/filter-schemas';
import { SearchResult } from '@/search/search-schemas';
import { SortDirection } from '@/search/sort-schemas';

import { expectDistinctPages, expectSorted } from './test-utils';

/**
 * Generic Provider Integration Tests (Live API)
 *
 * Automatically tests common functionality for all registered entities
 * that provide configuration for sorting, filters, pagination, or details.
 */
describe('Generic Provider Integration', { timeout: 15_000 }, () => {
  const providers = registry.getAllProviders();
  const globalMetrics: Record<string, number> = {};

  afterAll(() => {
    console.log('\n======================================');
    console.log('📡  INTEGRATION API METRICS (QUOTA) 📡');
    console.log('======================================');
    let total = 0;
    Object.entries(globalMetrics).forEach(([providerId, calls]) => {
      console.log(`- ${providerId.padEnd(15)}: ${calls} requests`);
      total += calls;
    });
    console.log('--------------------------------------');
    console.log(`- TOTAL          : ${total} requests`);
    console.log('======================================\n');
  });

  for (const provider of providers) {
    describe(`Provider: ${provider.label} (${provider.id})`, () => {
      let fetchSpy: ReturnType<typeof vi.spyOn>;
      let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

      beforeAll(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch');
        fetchSpy.mockClear();
        loggerWarnSpy = vi.spyOn(logger, 'warn');
        loggerWarnSpy.mockClear();
      });

      afterAll(() => {
        const fetchCalls = fetchSpy.mock.calls.length;
        globalMetrics[provider.label] = fetchCalls;
        // Hard limit to prevent Github Actions API billing exhaust loops
        expect(
          fetchCalls,
          `Provider ${provider.id} exceeded the absolute integration test limit of 120 API calls per run.`,
        ).toBeLessThan(120);

        // Verify that we never hit a 429 or 503 rate limit/overload during the integration test
        const rateLimitWarnings = loggerWarnSpy.mock.calls.filter((args: unknown[]) => {
          return (
            (typeof args[0] === 'string' && (args[0].includes('429') || args[0].includes('503'))) ||
            (typeof args[1] === 'string' && (args[1].includes('429') || args[1].includes('503')))
          );
        });
        expect(
          rateLimitWarnings.length,
          `Provider ${provider.id} hit a 429/503 error ${rateLimitWarnings.length} times during testing, indicating missing or misconfigured proactive rate limiting.`
        ).toBe(0);

        loggerWarnSpy.mockRestore();
        fetchSpy.mockRestore();
      });

      describe('Lifecycle & Capabilities', () => {
        it('should have successfully initialized', () => {
          expect(provider.status, `Provider ${provider.id} failed to initialize.`).toBe(
            ProviderStatus.READY,
          );
        });

        describe('Image Resolution', () => {
          it('should expose the resolveImage method and testImageResolution array on entities if test images exist', () => {
            for (const entity of provider.entities) {
              if (entity.testImageResolution && entity.testImageResolution.length > 0) {
                expect(
                  typeof entity.resolveImage,
                  `Entity ${entity.id} in Provider ${provider.id} must implement resolveImage.`,
                ).toBe('function');
                expect(
                  Array.isArray(entity.testImageResolution),
                  `Entity ${entity.id} in Provider ${provider.id} must define a testImageResolution array.`,
                ).toBe(true);
              }
            }
          });

          const tests = provider.entities.flatMap(e => (e.testImageResolution || []).map((t: any) => ({ ...t, entityId: e.id })));
          if (tests.length > 0) {
            it.each(tests)('should functionally resolve image: $description ($key)', async (testCase) => {
              const entity = provider.entities.find(e => e.id === testCase.entityId)!;
              const url = await entity.resolveImage?.(testCase.key);
              expect(typeof url, `Resolving image key "${testCase.key}" should yield a URL string.`).toBe(
                'string',
              );
              expect(url!.length, `Resolved URL for "${testCase.key}" is empty.`).toBeGreaterThan(10);
              expect(
                url!.startsWith('http'),
                `Resolved URL for "${testCase.key}" must be an absolute internet address.`,
              ).toBe(true);

              if (testCase.expectUrlContains) {
                expect(
                  url,
                  `Resolved URL for "${testCase.key}" expected to contain ${testCase.expectUrlContains}`
                ).toContain(testCase.expectUrlContains);
              }

              // Fire a live HEAD request to mathematically prove reachability and MIME type
              const res = await fetch(url!, { method: 'HEAD' });
              
              expect(
                res.ok, 
                `Expected image resolution for "${testCase.key}" to successfully ping the CDN (${url}), but received ${res.status} ${res.statusText}`
              ).toBe(true);

              const contentType = res.headers.get('content-type');
              expect(
                contentType,
                `Expected the URL for "${testCase.key}" to serve a valid image payload, but received Content-Type: ${contentType}`
              ).toMatch(/^image\//);
            });
          }
        });
      });

      for (const entity of provider.entities) {
        describe(`Entity: ${entity.branding.label} (${entity.id})`, () => {
          const sortableOptions = entity.sortOptions.filter(
            (opt) => !!opt.extractValue && opt.id !== 'relevance',
          );
          const allFilters = [...entity.searchOptions, ...entity.filters];

          it('should have a valid configuration', () => {
            expect(
              entity.defaultTestQueries.length,
              `Entity "${entity.id}" must provide at least one defaultTestQuery.`,
            ).toBeGreaterThan(0);
            expect(
              entity.testDetailsIds.length,
              `Entity "${entity.id}" must provide at least one testDetailsId.`,
            ).toBeGreaterThan(0);
          });

          describe.runIf(sortableOptions.length > 0)('Sorting', () => {
            for (const sortOpt of sortableOptions) {
              describe(`Sort Option: ${sortOpt.label} (${sortOpt.id})`, () => {
                const isReversible = !!sortOpt.defaultDirection && !sortOpt.isDirectionFixed;
                const defaultDir = sortOpt.defaultDirection ?? SortDirection.DESC;
                const queries = ['', ...entity.defaultTestQueries];

                it.each(queries)('should sort correctly for query "%s"', async (query) => {
                  const res = await entity.search({
                    query,
                    filters: {},
                    sort: sortOpt.id,
                    sortDirection: defaultDir,
                    limit: DEFAULT_PAGE_LIMIT,
                  });

                  const items = res.raw || [];
                  expect(
                    items.length,
                    `Sort test for "${sortOpt.id}" failed: not enough results.`,
                  ).toBeGreaterThan(1);
                  expectSorted(
                    items,
                    sortOpt.extractValue!,
                    defaultDir,
                    `${sortOpt.label} (${defaultDir})`,
                  );

                  if (isReversible) {
                    const altDir =
                      defaultDir === SortDirection.DESC ? SortDirection.ASC : SortDirection.DESC;
                    const altRes = await entity.search({
                      query,
                      filters: {},
                      sort: sortOpt.id,
                      sortDirection: altDir,
                      limit: DEFAULT_PAGE_LIMIT,
                    });

                    const altItems = altRes.raw || [];
                    expect(
                      altItems.length,
                      `Sort test for "${sortOpt.id}" (reverse) failed.`,
                    ).toBeGreaterThan(1);
                    expectSorted(
                      altItems,
                      sortOpt.extractValue!,
                      altDir,
                      `${sortOpt.label} (${altDir})`,
                    );
                  }
                });
              });
            }
          });

          describe.runIf(allFilters.length > 0)('Filters', () => {
            allFilters.forEach((filter) => {
              describe(`Filter: ${filter.label} (${filter.id})`, () => {
                // Cache baseline results by query string to avoid duplicate provider API calls
                const baselineCache: Record<string, SearchResult<any>> = {};

                filter.testCases.forEach((testCase: FilterTestCase<any, any>) => {
                  const { value, query = '' } = testCase;
                  const programmableIt = testCase.expectToFail ? it.fails : it;
                  programmableIt(`should filter correctly for value: ${JSON.stringify(value)}${query ? ` (query: "${JSON.stringify(query)}")` : ''}`, async () => {
                    const res = await entity.search({
                      query,
                      filters: { [filter.id]: value },
                      limit: DEFAULT_PAGE_LIMIT,
                    });

                    const items = res.raw || [];

                    // Every filter test case is expected to return some data to verify against
                    expect(
                      items.length,
                      `Filter ${filter.id} for value ${JSON.stringify(value)} returned no results.`,
                    ).toBeGreaterThan(0);

                    // By default, assume filters MUST alter the query payload compared to a baseline.
                    // This can be natively skipped by setting skipQueryDifferenceTest: true.
                    if (!testCase.skipQueryDifferenceTest) {
                      if (!baselineCache[query]) {
                        baselineCache[query] = await entity.search({
                          query,
                          filters: {},
                          limit: DEFAULT_PAGE_LIMIT,
                        });
                      }
                      
                      const baselineRes = baselineCache[query]!;
                      
                      // A filter must demonstrably alter the result payload compared to the unfiltered baseline
                      expect(
                        JSON.stringify(items) !== JSON.stringify(baselineRes.raw),
                        `Expected filter ${filter.id} to alter the search results compared to the baseline query, but the payloads were identical. Make sure this filter actually mutates the backend request. If this is intentional, set skipQueryDifferenceTest: true.`
                      ).toBe(true);
                    }

                    if ('expectAll' in testCase && testCase.expectAll) {
                      items.forEach((item, i) => {
                        expect(
                          testCase.expectAll!(item),
                          testCase.expectAllMessage
                            ? `Expected all results to ${testCase.expectAllMessage}, but item at index ${i} doesn't: ${JSON.stringify(item)}`
                            : `Item at index ${i} did not match expectAll for filter ${filter.id}`,
                        ).toBe(true);
                      });
                    }

                    if ('expectSome' in testCase && testCase.expectSome) {
                      const hasMatch = items.some((item) => testCase.expectSome!(item));
                      expect(
                        hasMatch,
                        testCase.expectSomeMessage
                          ? `Expected at least one result to ${testCase.expectSomeMessage}, but none did.`
                          : `Filter ${filter.id} expectSome failed: No items matched the condition.`,
                      ).toBe(true);
                    }

                    if ('expectNone' in testCase && testCase.expectNone) {
                      // Find the first matching item to show in the error message
                      const matchedItem = items.find((item) => testCase.expectNone!(item));
                      expect(
                        matchedItem === undefined,
                        testCase.expectNoneMessage
                          ? `Expected no results to ${testCase.expectNoneMessage}, but this item did: ${JSON.stringify(matchedItem)}`
                          : `Filter ${filter.id} expectNone failed: One or more items incorrectly matched the condition.`,
                      ).toBe(true);
                    }

                    if ('expectAggregate' in testCase && testCase.expectAggregate) {
                      testCase.expectAggregate(items);
                    }
                  });
                });
              });
            });
          });

          describe('Pagination', () => {
            const max_nb_queries = 5;
            const queries = ['', ...entity.defaultTestQueries];

            it.each(queries)('should verify pagination for query "%s"', async (query) => {
              const initialParams = entity.getInitialParams({ limit: max_nb_queries });
              const p1 = await entity.search({ ...initialParams, query });

              expect(p1.pagination.hasNextPage, 'First page should have next page').toBe(true);

              const nextParams = entity.getNextParams({ ...initialParams, query }, p1);
              expect(nextParams, 'getNextParams should return params for next page').not.toBeNull();

              const p2 = await entity.search(nextParams!);
              expectDistinctPages(p1.raw, p2.raw);
            });
          });

          describe('Details Fetching', () => {
            it.each(entity.testDetailsIds)(
              `should fetch valid transformed details for ID %s that match ItemDetailsSchema`,
              async (testId) => {
                const details = await entity.getDetails(testId);

                // Basic Identity
                expect(details).toBeDefined();
                expect(details.identity.providerItemId).toBe(testId);
                expect(details.identity.providerId).toBe(provider.id);
                expect(details.identity.entityId).toBe(entity.id);
                expect(details.title, 'Details missing title').toBeTruthy();
                
                // Assert strict Zod schema compliance
                const parseResult = ItemDetailsSchema.safeParse(details);
                if (!parseResult.success) {
                  console.error(`Schema validation failed for ${provider.id}/${entity.id}/${testId}:`, parseResult.error.format());
                }
                expect(parseResult.success, `Details for ${testId} must pass ItemDetailsSchema validation`).toBe(true);

                // Transformation Quality
                if (details.description) {
                  expect(details.description.length, 'Description is too short').toBeGreaterThan(
                    20,
                  );
                }

                // Metadata presence (either tags or related entities)
                const hasTags = !!details.tags && details.tags.length > 0;
                const hasRelated = !!details.relatedEntities && details.relatedEntities.length > 0;
                const hasUrls = !!details.urls && details.urls.length > 0;

                expect(
                  hasTags || hasRelated || hasUrls,
                  'Details yielded zero enrichment data (tags, relatedEntities, or urls)',
                ).toBe(true);

                // Image resolution (if applicable)
                if (details.images && details.images.length > 0) {
                  expect(details.images[0].type).toBeTruthy();
                }
              },
            );
          });

          describe('Edge Cases (Resilience)', () => {
            it('Empty States: should yield zero results gracefully without failing', async () => {
              const res = await entity.search({
                query: '"NON EXISTENT GIBBERISH 123456789"',
                filters: {}, // Required by SearchParams typing
                limit: 10,
              });

              expect(res.raw.length, 'Gibberish query should yield 0 results').toBe(0);
              expect(res.pagination.hasNextPage, 'Empty queries cannot have a next page').toBe(false);
            });

            it('Character Encoding: should safely transport symbols and non-latin scripts', async () => {
              const res = await entity.search({
                query: 'Pokémon & Zelda: éà!@#$%^ *()_+',
                filters: {}, // Required by SearchParams typing
                limit: 10,
              });

              // Assert that the request does NOT throw a ProviderError (e.g. 400 Bad Request)
              // Returning 0 results is fine, as long as it handles the encoding properly.
              expect(Array.isArray(res.raw)).toBe(true);
            });

            describe('Boundary Pagination', () => {
              it('should safely exhaust a short query until reaching the absolute API boundary limit', async () => {
                const initialParams = entity.getInitialParams({ limit: DEFAULT_PAGE_LIMIT });
                let currentParams = { ...initialParams, query: entity.edgeShortQuery };

                let pageCount = 0;
                let hasNext = true;

                // Failsafe: prevent truly infinite loops if pagination is broken
                while (hasNext && pageCount < 20) {
                  const res = await entity.search(currentParams);
                  pageCount++;

                  hasNext = res.pagination.hasNextPage;
                  if (hasNext) {
                    const nextParams = entity.getNextParams(currentParams, res);
                    expect(
                      nextParams,
                      'Provider claims hasNextPage but returned null nextParams',
                    ).not.toBeNull();
                    currentParams = nextParams!;
                  }
                }

                expect(
                  pageCount,
                  'Infinite loop detected or query was too broad (> 20 pages)',
                ).toBeLessThan(20);
                expect(
                  hasNext,
                  'Provider failed to reach a termination boundary for extreme pagination',
                ).toBe(false);
              }, 20_000); // Give boundary extraction 20 seconds.
            });
          });
        });
      }
    });
  }
});
