/**
 * @file factory.test.ts
 * @description Tests for the MediaServiceRegistry, verifying multi-service
 * lookup, fallback behavior, and service metadata retrieval.
 */

import { describe, expect, it } from 'vitest';

import { getMediaService, getServicesForCategory } from './factory';

describe('MediaServiceRegistry', () => {
  describe('getMediaService', () => {
    it('returns the first service for a category when no serviceId is given', () => {
      const service = getMediaService('game');
      expect(service.category).toBe('game');
      expect(service.id).toBeDefined();
    });

    it('returns the correct service when a valid serviceId is given', () => {
      const rawg = getMediaService('game', 'rawg');
      expect(rawg.id).toBe('rawg');

      const igdb = getMediaService('game', 'igdb');
      expect(igdb.id).toBe('igdb');
    });

    it('falls back to the first service when an invalid serviceId is given', () => {
      const service = getMediaService('game', 'nonexistent');
      expect(service.category).toBe('game');
      // Should return first registered game service rather than crashing
      expect(service.id).toBeDefined();
    });

    it('returns the single service for categories with only one provider', () => {
      expect(getMediaService('music').id).toBe('musicbrainz');
      expect(getMediaService('cinema').id).toBe('tmdb');
      expect(getMediaService('book').id).toBe('openlibrary');
    });
  });

  describe('getServicesForCategory', () => {
    it('returns multiple services for the game category', () => {
      const services = getServicesForCategory('game');
      expect(services.length).toBeGreaterThanOrEqual(2);

      const ids = services.map((s) => s.id);
      expect(ids).toContain('rawg');
      expect(ids).toContain('igdb');
    });

    it('includes supported types for each service', () => {
      const services = getServicesForCategory('game');

      const rawg = services.find((s) => s.id === 'rawg');
      expect(rawg?.types).toContain('game');
      expect(rawg?.types).toContain('developer');
      expect(rawg?.types).not.toContain('franchise');

      const igdb = services.find((s) => s.id === 'igdb');
      expect(igdb?.types).toContain('game');
      expect(igdb?.types).toContain('franchise');
      expect(igdb?.types).not.toContain('developer');
    });

    it('returns a single service for categories with one provider', () => {
      const services = getServicesForCategory('music');
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('musicbrainz');
    });

    it('includes human-readable labels', () => {
      const services = getServicesForCategory('game');
      const rawg = services.find((s) => s.id === 'rawg');
      expect(rawg?.label).toBe('RAWG');
    });
  });
});
