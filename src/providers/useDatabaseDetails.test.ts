import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchDatabaseDetails } from './useDatabaseDetails';

describe('fetchDatabaseDetails (SWR Fetcher)', () => {
  beforeEach(() => {
    // Mock global fetch to succeed so we only test the function signature crash
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '123',
        title: 'Test Title'
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should safely handle undefined options from SWR without a destructuring TypeError', async () => {
    const cacheKey = ['db-details', 'rawg', 'game', '123'];

    // Call the fetcher EXACTLY like SWR does when options are unexpectedly missing
    const promise = fetchDatabaseDetails(cacheKey, undefined as any);
    
    // If the destructuring bug exists, this will reject with a TypeError.
    // If it's fixed, it will resolve successfully.
    await expect(promise).resolves.toBeDefined();
  });
});
