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
        // Find sortable options before creating the entity describe block
        const sortableOptions = entity.sortOptions.filter(opt => !!opt.extractValue);
        
        if (sortableOptions.length === 0) continue;

        describe(`Entity: ${entity.branding.label} (${entity.id})`, () => {

          describe('Sorting', () => {
            for (const sortOpt of sortableOptions) {
              describe(`Sort Option: ${sortOpt.label} (${sortOpt.id})`, () => {
                const isReversible = !!sortOpt.defaultDirection && !sortOpt.isDirectionFixed;
                const defaultDir = sortOpt.defaultDirection ?? SortDirection.DESC;
                const queries = ['', ...(entity.testQueries || [])];

                it.each(queries)('should sort correctly for query "%s"', async (query) => {
                  // Skip testing search + sort if the entity doesn't have testQueries and query is not empty
                  if (query !== '' && (!entity.testQueries || !entity.testQueries.includes(query))) return;

                  // Test the default direction
                  const defaultRes = await entity.search({
                    query,
                    filters: {},
                    sort: sortOpt.id,
                    sortDirection: defaultDir,
                    limit: 10
                  });

                  expect(defaultRes.raw).toBeDefined();
                  expect(defaultRes.raw!.length, `Sort test for "${sortOpt.id}" with query "${query}" failed: not enough results to verify sorting (need at least 2).`).toBeGreaterThan(1);
                  
                  expectSorted(defaultRes.raw!, sortOpt.extractValue!, defaultDir, `${sortOpt.label} (${defaultDir})`);

                  // If reversible, test the other direction
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
                    expect(altRes.raw!.length, `Sort test for "${sortOpt.id}" (reverse) with query "${query}" failed: not enough results to verify sorting (need at least 2).`).toBeGreaterThan(1);
                    expectSorted(altRes.raw!, sortOpt.extractValue!, altDir, `${sortOpt.label} (${altDir})`);
                  }
                });
              });
            }
          });
        });
      }
    });
  }
});
