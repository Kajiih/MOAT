import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { setupMSW } from '@/lib/test/msw-test-utils';

import { handlers } from './mocks/handlers';
import { RAWGService } from './RAWGService';

describe('RAWGService Integration (Fake Server)', () => {
  const service = new RAWGService();

  setupMSW(handlers);

  beforeAll(() => {
    vi.stubEnv('RAWG_API_KEY', 'fake-key');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('should find games by title', async () => {
    const result = await service.search('Witcher', 'game');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Witcher 3: Wild Hunt');
    expect(result.results[0].year).toBe('2015');
    expect(result.results[0].type).toBe('game');
  });

  it('should return all games when no query is provided', async () => {
    const result = await service.search('', 'game');

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.totalCount).toBe(result.results.length);
  });

  it('should map game-specific fields', async () => {
    const result = await service.search('Portal', 'game');

    expect(result.results).toHaveLength(1);
    const game = result.results[0];
    expect(game.type).toBe('game');
    expect(game.title).toBe('Portal 2');
    expect('developer' in game && game.developer).toBe('Valve Software');
    expect('platforms' in game && game.platforms).toContain('PC');
  });

  it('should fetch details correctly', async () => {
    const details = await service.getDetails('3498', 'game');

    expect(details.id).toBe('3498');
    expect(details.type).toBe('game');
    expect(details.developer).toBe('Rockstar North');
    expect(details.publisher).toBe('Rockstar Games');
    expect(details.metacritic).toBe(92);
    expect(details.platforms).toContain('PC');
    expect(details.description).toBe('An open-world action-adventure game.');
    expect(details.tags).toContain('Action');
  });

  it('should throw if API key is missing', async () => {
    vi.stubEnv('RAWG_API_KEY', '');
    await expect(service.search('test', 'game')).rejects.toThrow('RAWG_API_KEY is missing');
    vi.stubEnv('RAWG_API_KEY', 'fake-key');
  });

  describe('Discovery and Sorting', () => {
    it('should support sorting by name A-Z', async () => {
      const result = await service.search('', 'game', { sort: 'title_asc' });
      expect(result.results[0].title).toBe('A Game');
      expect(result.isServerSorted).toBe(true);
    });

    it('should support sorting by name Z-A', async () => {
      const result = await service.search('', 'game', { sort: 'title_desc' });
      expect(result.results[0].title).toBe('Z Game');
      expect(result.isServerSorted).toBe(true);
    });

    it('should filter by year range', async () => {
      const result = await service.search('', 'game', {
        filters: { minYear: '2020', maxYear: '2023' },
      });
      expect(result.results.every((r) => Number(r.year) >= 2020 && Number(r.year) <= 2023)).toBe(
        true,
      );
    });
  });
});
