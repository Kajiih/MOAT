import { describe, expect, it } from 'vitest';
import { registry } from '@/providers';
import { ProviderStatus } from '@/providers/types';
import {
  SortDirection,
  FilterTestCase,
} from '@/search/schemas';
import {
  expectSorted,
  expectDistinctPages
} from './test-utils';

/**
 * Generic Provider Integration Tests (Live API)
 * 
 * Automatically tests common functionality for all registered entities 
 * that provide configuration for sorting, filters, pagination, or details.
 */
describe.runIf(!!process.env.RAWG_API_KEY)('Generic Provider Integration', { timeout: 15000 }, () => {
  const providers = registry.getAllProviders();

  for (const provider of providers) {
    describe(`Provider: ${provider.label} (${provider.id})`, () => {
      
      describe('Lifecycle & Capabilities', () => {
        it('should have successfully initialized', () => {
          expect(provider.status, `Provider ${provider.id} failed to initialize.`).toBe(ProviderStatus.READY);
        });

        describe('Image Resolution', () => {
          it('should expose the mandatory resolveImage method and testImageKeys array', () => {
            expect(typeof provider.resolveImage, `Provider ${provider.id} must implement resolveImage.`).toBe('function');
            expect(Array.isArray(provider.testImageKeys), `Provider ${provider.id} must define a testImageKeys array.`).toBe(true);
          });

          const keys = provider.testImageKeys || [];
          if (keys.length > 0) {
            it.each(keys)('should resolve test image key "%s" to a valid URL', async (key) => {
              const url = await provider.resolveImage(key);
              expect(typeof url, `Resolving image key "${key}" should yield a URL string.`).toBe('string');
              expect(url!.length, `Resolved URL for "${key}" is empty.`).toBeGreaterThan(10);
              expect(url!.startsWith('http'), `Resolved URL for "${key}" must be an absolute internet address.`).toBe(true);
            });
          }
        });
      });

      for (const entity of provider.entities) {
        describe(`Entity: ${entity.branding.label} (${entity.id})`, () => {
          const sortableOptions = entity.sortOptions.filter(opt => !!opt.extractValue && opt.id !== 'relevance');
          const allFilters = [...entity.searchOptions, ...entity.filters];

          it('should have a valid configuration', () => {
            expect(entity.defaultTestQueries.length, `Entity "${entity.id}" must provide at least one defaultTestQuery.`).toBeGreaterThan(0);
            expect(entity.testDetailsIds.length, `Entity "${entity.id}" must provide at least one testDetailsId.`).toBeGreaterThan(0);
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
                    limit: 10
                  });

                  const items = res.raw || [];
                  expect(items.length, `Sort test for "${sortOpt.id}" failed: not enough results.`).toBeGreaterThan(1);
                  expectSorted(items, sortOpt.extractValue!, defaultDir, `${sortOpt.label} (${defaultDir})`);

                  if (isReversible) {
                    const altDir = defaultDir === SortDirection.DESC ? SortDirection.ASC : SortDirection.DESC;
                    const altRes = await entity.search({
                      query,
                      filters: {},
                      sort: sortOpt.id,
                      sortDirection: altDir,
                      limit: 10
                    });

                    const altItems = altRes.raw || [];
                    expect(altItems.length, `Sort test for "${sortOpt.id}" (reverse) failed.`).toBeGreaterThan(1);
                    expectSorted(altItems, sortOpt.extractValue!, altDir, `${sortOpt.label} (${altDir})`);
                  }
                });
              });
            }
          });

          describe.runIf(allFilters.length > 0)('Filters', () => {
            allFilters.forEach(filter => {
              describe(`Filter: ${filter.label} (${filter.id})`, () => {
                filter.testCases.forEach((testCase: FilterTestCase<any, any>) => {
                  const { value, query = '' } = testCase;
                  it(`should filter correctly for value: ${JSON.stringify(value)}${query ? ` (query: "${JSON.stringify(query)}")` : ''}`, async () => {
                    const res = await entity.search({
                      query,
                      filters: { [filter.id]: value },
                      limit: 10
                    });

                    const items = res.raw || [];

                    // Every filter test case is expected to return some data to verify against
                    expect(items.length, `Filter ${filter.id} for value ${JSON.stringify(value)} returned no results.`).toBeGreaterThan(0);

                    if (testCase.match) {
                      items.forEach((item, i) => {
                        expect(testCase.match!(item), `Item at index ${i} did not match filter ${filter.id}`).toBe(true);
                      });
                    }

                    testCase.verifyResults?.(items);
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
            it.each(entity.testDetailsIds)(`should fetch valid transformed details for ID %s`, async (testId) => {
              const details = await entity.getDetails(testId);

              // Basic Identity
              expect(details).toBeDefined();
              expect(details.identity.dbId).toBe(testId);
              expect(details.identity.databaseId).toBe(provider.id);
              expect(details.identity.entityId).toBe(entity.id);
              expect(details.title, 'Details missing title').toBeTruthy();
              
              // Transformation Quality
              if (details.description) {
                expect(details.description.length, 'Description is too short').toBeGreaterThan(20);
              }
              
              // Metadata presence (either tags or related entities)
              const hasTags = !!details.tags && details.tags.length > 0;
              const hasRelated = !!details.relatedEntities && details.relatedEntities.length > 0;
              const hasUrls = !!details.urls && details.urls.length > 0;
              
              expect(hasTags || hasRelated || hasUrls, 'Details yielded zero enrichment data (tags, relatedEntities, or urls)').toBe(true);

              // Image resolution (if applicable)
              if (details.images && details.images.length > 0) {
                expect(details.images[0].type).toBeTruthy();
              }
            });
          });
        });
      }
    });
  }
});
