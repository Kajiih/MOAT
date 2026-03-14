import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { EntityLink } from '@/items/items';
import { FilterDefinition } from '@/search/filter-schemas';

import { ProviderError, ProviderErrorCode } from './errors';
import { applyFilters, extractRelatedEntities, extractTags, handleProviderError } from './utils';

describe('Providers Utils', () => {
  describe('handleProviderError', () => {
    it('should return the original error if it is already a ProviderError', () => {
      const original = new ProviderError(ProviderErrorCode.INTERNAL_ERROR, 'Test', null, 'test-db');
      const result = handleProviderError(original, 'test-db');
      expect(result).toBe(original);
    });

    it('should translate Native AbortError to ProviderErrorCode.TIMEOUT', () => {
      // In some environments DOMException doesn't perfectly inherit Error, 
      // but utils.ts explicitly handles error.name === 'AbortError' if it looks like an error
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const result = handleProviderError(abortError, 'test-db');
      expect(result.code).toBe(ProviderErrorCode.TIMEOUT);
      expect(result.databaseId).toBe('test-db');
    });

    it('should translate ZodError to ProviderErrorCode.VALIDATION_ERROR', () => {
      const schema = z.object({ name: z.string() });
      const zodError = schema.safeParse({ name: 123 }).error!;
      const result = handleProviderError(zodError, 'test-db');
      expect(result.code).toBe(ProviderErrorCode.VALIDATION_ERROR);
      expect(result.message).toContain('expected string, received number');
    });

    it('should translate a standard Error object to an INTERNAL_ERROR', () => {
      const error = new Error('Something went wrong');
      const result = handleProviderError(error, 'test-db');
      expect(result.code).toBe(ProviderErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe('Something went wrong');
    });

    it('should map standard HTTP status codes correctly', () => {
      expect(handleProviderError({ status: 401 }, 'db').code).toBe(ProviderErrorCode.AUTH_ERROR);
      expect(handleProviderError({ status: 404 }, 'db').code).toBe(ProviderErrorCode.NOT_FOUND);
      expect(handleProviderError({ status: 429 }, 'db').code).toBe(ProviderErrorCode.RATE_LIMIT);
      expect(handleProviderError({ status: 503 }, 'db').code).toBe(ProviderErrorCode.SERVICE_UNAVAILABLE);
    });
  });

  describe('applyFilters', () => {
    const definitions: FilterDefinition<unknown>[] = [
      { id: 'search', type: 'text', label: 'Search', mapTo: 'q', testCases: [] },
      { id: 'status', type: 'select', label: 'Status', options: [], transform: (val) => ({ fq: `status:${val}` }), testCases: [] },
      { id: 'isActive', type: 'boolean', label: 'Active', mapTo: 'active', transform: (val) => val ? '1' : '0', testCases: [] }
    ];

    it('should map basic fields to a new object', () => {
      const filters = { search: 'test query' };
      const result = applyFilters(filters, definitions);
      expect(result).toEqual({ q: 'test query' });
    });

    it('should ignore undefined, null, or empty string values', () => {
      const filters = { search: '', status: undefined, isActive: null as unknown as string };
      const result = applyFilters(filters, definitions);
      expect(result).toEqual({});
    });

    it('should handle complex object transforms', () => {
      const filters = { status: 'published' };
      const result = applyFilters(filters, definitions);
      expect(result).toEqual({ fq: 'status:published' });
    });

    it('should handle boolean transforms mapped to specific keys', () => {
      const filters = { isActive: 'true' }; // URL search params are often strings
      const result = applyFilters(filters, definitions);
      expect(result).toEqual({ active: '1' });
    });

    it('should properly parse boolean false', () => {
       const filters = { isActive: 'false' };
       const result = applyFilters(filters, definitions);
       expect(result).toEqual({ active: '0' });
    });

    it('should drop malformed number payloads safely without crashing', () => {
      const numberDef: FilterDefinition<unknown>[] = [
        { id: 'year', type: 'number', label: 'Year', mapTo: 'y', testCases: [] }
      ];
      const filters = { year: 'not-a-number' };
      const result = applyFilters(filters, numberDef);
      
      // Invalid numbers should fail Zod coercion and be safely ignored
      expect(result).toEqual({});
    });

    it('should drop malformed range payloads safely without crashing', () => {
      const rangeDef: FilterDefinition<unknown>[] = [
        { id: 'score', type: 'range', label: 'Score', mapTo: 's', transform: val => val?.min || undefined, testCases: [] }
      ];
      // Pass a string instead of the expected { min, max } object
      const filters = { score: 'just-string' };
      const result = applyFilters(filters, rangeDef);
      
      // Invalid range objects should fail Zod parsing and be ignored
      expect(result).toEqual({});
    });
  });

  describe('extractTags', () => {
    it('should return an empty array if source is null/undefined', () => {
      expect(extractTags(null, (t: { name: string }) => t.name)).toEqual([]);
      expect(extractTags(undefined, (t: { name: string }) => t.name)).toEqual([]);
    });

    it('should extract unique tags and limit to 10', () => {
      const source = Array.from({ length: 15 }, (_, i) => ({ name: `Tag ${i % 12}` })); // 12 unique tags
      const result = extractTags(source, (t) => t.name);
      
      expect(result.length).toBe(10);
      expect(result).toContain('Tag 0');
      expect(result).toContain('Tag 9');
      // Should be unique
      expect(new Set(result).size).toBe(10);
    });

    it('should apply an optional filter function before extraction', () => {
      const source = [
        { name: 'Tag A', type: 'genre' },
        { name: 'Tag B', type: 'theme' },
        { name: 'Tag C', type: 'genre' },
      ];
      
      const result = extractTags(source, (t) => t.name, (t) => t.type === 'genre');
      expect(result).toEqual(['Tag A', 'Tag C']);
    });
  });

  describe('extractRelatedEntities', () => {
    it('should return an empty array if source is null/undefined', () => {
      expect(extractRelatedEntities(null, () => ({} as EntityLink))).toEqual([]);
      expect(extractRelatedEntities(undefined, () => ({} as EntityLink))).toEqual([]);
    });

    it('should map entities correctly to EntityLink objects', () => {
      const source = [
        { id: 1, name: 'Dev 1' },
        { id: 2, name: 'Dev 2' },
      ];
      
      const mappingFn = (item: { id: number, name: string }): EntityLink => ({
        label: 'Developer',
        name: item.name,
        identity: { dbId: String(item.id), databaseId: 'test-db', entityId: 'dev' }
      });

      const result = extractRelatedEntities(source, mappingFn);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'Developer',
        name: 'Dev 1',
        identity: { dbId: '1', databaseId: 'test-db', entityId: 'dev' }
      });
    });
  });
});
