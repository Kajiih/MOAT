import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

setupMSW(igdbHandlers);

import { setupMSW } from '@/lib/test/msw-test-utils';

import { IGDBService } from './IGDBService';
import { igdbHandlers } from './mocks/igdb-handlers';

describe('IGDBService Integration (Fake Server)', () => {
  const service = new IGDBService();

  beforeAll(() => {
    vi.stubEnv('IGDB_CLIENT_ID', 'fake-client-id');
    vi.stubEnv('IGDB_CLIENT_SECRET', 'fake-client-secret');
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
    expect(result.results[0].id).toBe('igdb-1942');
  });

  it('should find franchises by title', async () => {
    const result = await service.search('The Witcher', 'franchise');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Witcher');
    expect(result.results[0].type).toBe('franchise');
    expect('gameCount' in result.results[0] && result.results[0].gameCount).toBe(3);
  });

  it('should fetch game details correctly', async () => {
    const details = await service.getDetails('1942', 'game');

    expect(details.id).toBe('1942');
    expect(details.type).toBe('game');
    expect(details.developer).toBe('CD PROJEKT RED');
    expect(details.description).toBe('The best game ever.');
    expect(details.urls?.[0].url).toContain('the-witcher-3');
  });

  it('should fetch franchise details correctly', async () => {
    const details = await service.getDetails('1', 'franchise');

    expect(details.id).toBe('1');
    expect(details.type).toBe('franchise');
    expect(details.description).toContain('franchise with 3 games');
    expect(details.urls?.[0].url).toContain('franchises/the-witcher');
  });
});
