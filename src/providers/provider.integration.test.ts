import { describe, expect, it } from 'vitest';
import { registry } from '@/providers';
import { SortDirection } from '@/search/schemas';
import { expectSorted } from './test-utils';

/**
 * Generic Database Provider Integration Tests (Live API)
 * 
 * Automatically tests common functionality (like sorting) for all 
 * registered entities that provide `defaultSortingTestQueries` or filters.
 */
describe.runIf(!!process.env.RAWG_API_KEY)('Generic Provider Integration', { timeout: 15000 }, () => {
  const providers = registry.getAllProviders();

  for (const provider of providers) {
    describe(`Provider: ${provider.label} (${provider.id})`, () => {
      for (const entity of provider.entities) {
        describe(`Entity: ${entity.branding.label} (${entity.id})`, () => {
          const sortableOptions = entity.sortOptions.filter(opt => !!opt.extractValue && opt.id !== 'relevance');
          const searchOptions = entity.searchOptions || [];
          const filters = entity.filters || [];

          it('should have a valid configuration', () => {
            if (entity.defaultSortingTestQueries && entity.defaultSortingTestQueries.length > 0) {
              expect(sortableOptions.length, `Entity "${entity.id}" provides defaultSortingTestQueries but has no sortable options.`).toBeGreaterThan(0);
            }
          });

          describe.runIf(sortableOptions.length > 0)('Sorting', () => {
            for (const sortOpt of sortableOptions) {
              describe(`Sort Option: ${sortOpt.label} (${sortOpt.id})`, () => {
                const isReversible = !!sortOpt.defaultDirection && !sortOpt.isDirectionFixed;
                const defaultDir = sortOpt.defaultDirection ?? SortDirection.DESC;
                const queries = ['', ...(entity.defaultSortingTestQueries || [])];

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

          const allFilters = [...searchOptions, ...filters];
          describe.runIf(allFilters.length > 0)('Filters', () => {
            allFilters.forEach(filter => {
              describe(`Filter: ${filter.label} (${filter.id})`, () => {
                filter.testCases.forEach((testCase: any) => {
                  const { value, query, match } = testCase;
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
        });
      }
    });
  }
});
