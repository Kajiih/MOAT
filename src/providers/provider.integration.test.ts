import { describe, expect, it } from 'vitest';
import { registry } from '@/providers';
import { SortDirection } from '@/search/schemas';
import { expectSorted } from './test-utils';

/**
 * Generic Database Provider Integration Tests (Live API)
 * 
 * Automatically tests common functionality (like sorting) for all 
 * registered entities that provide `testQueries`.
 */
describe.runIf(!!process.env.RAWG_API_KEY)('Generic Provider Integration', { timeout: 15000 }, () => {
  const providers = registry.getAllProviders();

  for (const provider of providers) {
    describe(`Provider: ${provider.label} (${provider.id})`, () => {
      for (const entity of provider.entities) {
        describe(`Entity: ${entity.branding.label} (${entity.id})`, () => {
          const sortableOptions = entity.sortOptions.filter(opt => !!opt.extractValue);
          
          if (sortableOptions.length > 0) {
            describe('Sorting', () => {
              for (const sortOpt of sortableOptions) {
                describe(`Sort Option: ${sortOpt.label} (${sortOpt.id})`, () => {
                  const isReversible = !!sortOpt.defaultDirection && !sortOpt.isDirectionFixed;
                  const defaultDir = sortOpt.defaultDirection ?? SortDirection.DESC;
                  const queries = ['', ...(entity.testQueries || [])];

                  it.each(queries)('should sort correctly for query "%s"', async (query) => {
                    if (query !== '' && (!entity.testQueries || !entity.testQueries.includes(query))) return;

                    const defaultRes = await entity.search({
                      query,
                      filters: {},
                      sort: sortOpt.id,
                      sortDirection: defaultDir,
                      limit: 10
                    });

                    expect(defaultRes.raw).toBeDefined();
                    expect(defaultRes.raw!.length, `Sort test for "${sortOpt.id}" failed: not enough results.`).toBeGreaterThan(1);
                    expectSorted(defaultRes.raw!, sortOpt.extractValue!, defaultDir, `${sortOpt.label} (${defaultDir})`);

                    if (isReversible) {
                      const altDir = defaultDir === SortDirection.DESC ? SortDirection.ASC : SortDirection.DESC;
                      const altRes = await entity.search({
                        query,
                        filters: {},
                        sort: sortOpt.id,
                        sortDirection: altDir,
                        limit: 10
                      });

                      expect(altRes.raw).toBeDefined();
                      expect(altRes.raw!.length, `Sort test for "${sortOpt.id}" (reverse) failed.`).toBeGreaterThan(1);
                      expectSorted(altRes.raw!, sortOpt.extractValue!, altDir, `${sortOpt.label} (${altDir})`);
                    }
                  });
                });
              }
            });
          }

          const allFilters = [...entity.filters, ...(entity.searchOptions || [])];
          if (allFilters.length > 0) {
            describe('Filters', () => {
              for (const filter of allFilters) {
                describe(`Filter: ${filter.label} (${filter.id})`, () => {
                  it.each(filter.testCases as any[])('should filter correctly for value: $value', async ({ value, match }) => {
                    const res = await entity.search({
                      query: '',
                      filters: { [filter.id]: value },
                      limit: 20
                    });

                    expect(res.raw).toBeDefined();
                    expect(res.raw!.length, `Filter test for "${filter.id}" failed: no results.`).toBeGreaterThan(0);
                    
                    for (const item of res.raw!) {
                      expect(match(item), `Item did not match filter ${filter.id} for value ${JSON.stringify(value)}`).toBe(true);
                    }
                  });
                });
              }
            });
          }
        });
      }
    });
  }
});
