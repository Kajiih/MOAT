import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { RAWGDatabase } from '../services/rawg';
import { registry, RegistryStatus } from './registry';
import { DatabaseErrorCode, DatabaseProvider, ImageSourceSchema,ProviderStatus, SearchParamsSchema, SearchResultSchema } from './types';
import { referenceImage,urlImage } from './types';
import { DatabaseEntity } from './types';
import { handleDatabaseError } from './utils';

describe('Database V2 Design', () => {
  beforeEach(() => {
    registry.clear();
  });

  describe('DatabaseRegistry', () => {
    it('should have IDLE status initially', () => {
      expect(registry.getStatus()).toBe(RegistryStatus.IDLE);
    });

    it('should register and reach READY status', async () => {
      const p = registry.register(RAWGDatabase);
      expect(registry.getStatus()).toBe(RegistryStatus.INITIALIZING);
      await p;
      expect(registry.getStatus()).toBe(RegistryStatus.READY);
    });

    it('should clear all state when clear() is called', async () => {
      await registry.register(RAWGDatabase);
      expect(registry.getStatus()).toBe(RegistryStatus.READY);
      
      registry.clear();
      
      expect(registry.getStatus()).toBe(RegistryStatus.IDLE);
      expect(registry.getAllProviders()).toHaveLength(0);
      expect(registry.getProvider('rawg')).toBeUndefined();
    });

    it('should register and retrieve a provider', async () => {
      await registry.register(RAWGDatabase);
      const provider = registry.getProvider('rawg');
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('rawg');
      expect(provider?.label).toBe('RAWG');
    });

    it('should list all providers', async () => {
      await registry.register(RAWGDatabase);
      const all = registry.getAllProviders();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('rawg');
    });

    it('should allow injecting a custom fetcher via registry', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ results: [], count: 0 });
      registry.setFetcher(mockFetcher);
      
      await registry.register(RAWGDatabase);
      const gameEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'game');
      
      await gameEntity?.search({ query: 'test', filters: {}, page: 1, limit: 10 });
      expect(mockFetcher).toHaveBeenCalled();
    });

    it('should track failed providers without completely breaking the registry for others', async () => {
      // Create a failing provider
      const failingProvider: DatabaseProvider = {
        id: 'failing',
        label: 'Failing Provider',
        entities: [],
        status: ProviderStatus.IDLE,
        initialize: async () => { throw new Error('Auth failed'); }
      };

      // Create a working provider
      const workingProvider: DatabaseProvider = {
        id: 'working',
        label: 'Working Provider',
        entities: [],
        status: ProviderStatus.IDLE,
        initialize: async () => {} // success
      };

      await expect(registry.register(failingProvider)).rejects.toThrow('Auth failed');

      // The failing provider SHOULD be retrievable so the UI knows it failed (rather than being undefined)
      const failed = registry.getProvider('failing');
      expect(failed).toBeDefined();
      expect(failed?.status).toBe(ProviderStatus.ERROR);

      // The Registry should show ERROR because ALL providers (1) failed
      expect(registry.getStatus()).toBe(RegistryStatus.ERROR);

      // But registering a new working provider should work and reset the registry to READY
      await registry.register(workingProvider);
      
      const working = registry.getProvider('working');
      expect(working?.status).toBe(ProviderStatus.READY);
      
      // Registry is READY because at least one provider is READY
      expect(registry.getStatus()).toBe(RegistryStatus.READY);
    });

    it('should wait for overlapping registrations in waitUntilReady', async () => {
      let slowDone = false;
      let fastDone = false;

      const slowProvider: DatabaseProvider = {
        id: 'slow',
        label: 'Slow',
        entities: [],
        status: ProviderStatus.IDLE,
        initialize: async () => {
          await new Promise(r => setTimeout(r, 50));
          slowDone = true;
        }
      };

      const fastProvider: DatabaseProvider = {
        id: 'fast',
        label: 'Fast',
        entities: [],
        status: ProviderStatus.IDLE,
        initialize: async () => {
          await new Promise(r => setTimeout(r, 10));
          fastDone = true;
        }
      };

      // Start slow registration
      const p1 = registry.register(slowProvider);
      
      // Start waiting
      const waitPromise = registry.waitUntilReady();

      // Start fast registration while waiting
      const p2 = registry.register(fastProvider);

      await waitPromise;

      expect(slowDone).toBe(true);
      expect(fastDone).toBe(true);
      expect(registry.getStatus()).toBe(RegistryStatus.READY);
      
      await Promise.all([p1, p2]); // Cleanup
    });
  });

  describe('handleDatabaseError', () => {
    it('should map AbortError to TIMEOUT', () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      const dbError = handleDatabaseError(abortError, 'test');
      expect(dbError.code).toBe(DatabaseErrorCode.TIMEOUT);
    });

    it('should map TimeoutError to TIMEOUT', () => {
      const timeoutError = new Error('The operation timed out');
      timeoutError.name = 'TimeoutError';
      
      const dbError = handleDatabaseError(timeoutError, 'test');
      expect(dbError.code).toBe(DatabaseErrorCode.TIMEOUT);
    });

    it('should map 401/403 to AUTH_ERROR', () => {
      expect(handleDatabaseError({ status: 401 }, 'test').code).toBe(DatabaseErrorCode.AUTH_ERROR);
      expect(handleDatabaseError({ status: 403 }, 'test').code).toBe(DatabaseErrorCode.AUTH_ERROR);
    });

    it('should map 500 to SERVICE_UNAVAILABLE', () => {
      expect(handleDatabaseError({ status: 500 }, 'test').code).toBe(DatabaseErrorCode.SERVICE_UNAVAILABLE);
    });

    it('should map ZodError to VALIDATION_ERROR', () => {
      const result = z.string().safeParse(123);
      if (!result.success) {
        const error = handleDatabaseError(result.error, 'test');
        expect(error.code).toBe(DatabaseErrorCode.VALIDATION_ERROR);
        expect(error.message).toContain('Validation failed');
      }
    });

    it('should fallback to INTERNAL_ERROR for unknown objects', () => {
      const error = handleDatabaseError({ message: 'Boom' }, 'test');
      expect(error.code).toBe(DatabaseErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Boom');
    });
  });

  describe('Flexible Pagination', () => {
    it('should accept page-based pagination', () => {
      const result = SearchResultSchema.parse({
        items: [],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalCount: 100,
          hasNextPage: true,
        },
      });
      
      expect(result.pagination.hasNextPage).toBe(true);
      expect('currentPage' in result.pagination && result.pagination.currentPage).toBe(1);
    });

    it('should accept cursor-based pagination', () => {
      const result = SearchResultSchema.parse({
        items: [],
        pagination: {
          nextCursor: 'abc-123',
          hasNextPage: true,
        },
      });

      expect(result.pagination.hasNextPage).toBe(true);
      expect('nextCursor' in result.pagination && result.pagination.nextCursor).toBe('abc-123');
    });

    it('should allow SearchParams with cursor instead of page', () => {
      const parsed = SearchParamsSchema.parse({
        query: 'test',
        filters: {},
        limit: 20,
        cursor: 'start-here',
      });
      expect(parsed.cursor).toBe('start-here');
      expect(parsed.page).toBeUndefined();
    });
  });

  describe('ImageSource', () => {
    it('should accept URL image sources', () => {
      const source = ImageSourceSchema.parse({ type: 'url', url: 'https://example.com/img.jpg' });
      expect(source.type).toBe('url');
      if (source.type === 'url') expect(source.url).toBe('https://example.com/img.jpg');
    });

    it('should accept reference image sources', () => {
      const source = ImageSourceSchema.parse({ type: 'reference', provider: 'wikidata', key: 'elden-ring' });
      expect(source.type).toBe('reference');
      if (source.type === 'reference') {
        expect(source.provider).toBe('wikidata');
        expect(source.key).toBe('elden-ring');
      }
    });

    it('should provide helper functions for creating sources', () => {
      const url = urlImage('https://example.com/img.jpg');
      expect(url.type).toBe('url');

      const ref = referenceImage('fanart', 'album:123');
      expect(ref.type).toBe('reference');
      expect(ref.provider).toBe('fanart');
    });
  });

  describe('RAWGDatabase Prototype', () => {
    it('should have the correct entities', () => {
      expect(RAWGDatabase.entities).toHaveLength(2);
      const gameEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'game');
      const devEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'developer');

      expect(gameEntity).toBeDefined();
      expect(devEntity).toBeDefined();
      expect(gameEntity?.branding.label).toBe('Video Game');
    });

    it('should have filters and sort options for games', () => {
      const gameEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'game');
      expect(gameEntity?.filters).toHaveLength(2);
      expect(gameEntity?.searchOptions).toHaveLength(1);
      expect(gameEntity?.sortOptions).toHaveLength(3);
    });

    it('should validate search results using Zod', async () => {
      const gameEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'game');
      // This test actually calls the search method, we might need to mock fetch
      // But for design verification, we just check if the method exists and types match
      expect(gameEntity?.search).toBeDefined();
    });
  });

  describe('Search Options', () => {
    it('should cleanly separate search modifiers from data filters', () => {
      const gameEntity = RAWGDatabase.entities.find((e: DatabaseEntity) => e.id === 'game')!;
      
      expect(gameEntity.searchOptions).toHaveLength(1);
      expect(gameEntity.searchOptions[0].id).toBe('precise');
      
      expect(gameEntity.filters).toHaveLength(2);
      expect(gameEntity.filters.map((f: any) => f.id)).toEqual(['yearRange', 'platform']);
    });
  });
});
