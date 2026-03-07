import { beforeAll, describe, expect, it } from 'vitest';
import { BaseItem } from '@/items/items';
import { RAWGDatabaseProvider } from './rawg';
import { SortDirection } from '@/search/schemas';
import { 
  expectContainsCanonical, 
  expectExcludesAnchors, 
  expectSorted, 
  expectDistinctPages 
} from '../../test-utils';

/**
 * RAWG Database Provider Integration Tests (Live API)
 * 
 * These tests verify the contract between our provider and the real RAWG API.
 * They are gated by the presence of RAWG_API_KEY in the environment.
 */
describe.runIf(!!process.env.RAWG_API_KEY)('RAWGDatabaseProvider Live API Integration', () => {
  const provider = new RAWGDatabaseProvider();
  const gameEntity = provider.entities.find(e => e.id === 'game')!;
  const devEntity = provider.entities.find(e => e.id === 'developer')!;

  interface AnchorGame {
    query: string;
    expectedId: string;
    id: string; // resolved at runtime
    year?: number;
    typo?: string;
    platforms?: { id: string, name: string, shouldBePresent: boolean }[];
  }

  // Single Source of Truth for test data
  const ANCHORS: Record<string, AnchorGame> = {
    WITCHER_3: { 
      query: 'The Witcher 3: Wild Hunt', 
      expectedId: '3328', 
      id: '', 
      typo: 'The Watcher 3'
    },
    ELDEN_RING: { 
      query: 'Elden Ring', 
      expectedId: '326243', 
      id: '', 
      typo: 'Elder Ring'
    },
    BG2: { 
      query: 'Baldur\'s Gate II: Enhanced Edition', 
      expectedId: '16003', 
      id: '', 
      year: 2013 
    },
    CLAIR_OBSCUR: { 
      query: 'Clair Obscur: Expedition 33', 
      expectedId: '983210', 
      id: '', 
      year: 2025 
    },
    BOTW: { 
      query: 'The Legend of Zelda: Breath of the Wild', 
      expectedId: '22511', 
      id: '', 
      platforms: [
        { id: '7', name: 'Switch', shouldBePresent: true },
        { id: '4', name: 'PC', shouldBePresent: false }
      ]
    },
    MARIO_ODYSSEY: { 
      query: 'Super Mario Odyssey', 
      expectedId: '28026', 
      id: '', 
      platforms: [
        { id: '7', name: 'Switch', shouldBePresent: true },
        { id: '4', name: 'PC', shouldBePresent: false }
      ]
    },
  };

  /**
   * Resolves a canonical ID by title to avoid hardcoding magic numbers.
   */
  async function resolveId(query: string): Promise<string> {
    const result = await gameEntity.search({ query, filters: {}, limit: 1 });
    if (!result.items.length) throw new Error(`Could not resolve anchor item: ${query}`);
    return result.items[0].identity.dbId;
  }

  beforeAll(async () => {
    // Resolve all canonical IDs at once
    const game_names = Object.keys(ANCHORS);
    const ids = await Promise.all(game_names.map(k => resolveId(ANCHORS[k].query)));
    game_names.forEach((k, i) => { ANCHORS[k].id = ids[i]; });
  });

  describe('Game Entity: Anchor Stability & ID Verification', () => {
    const game_names = Object.keys(ANCHORS) as Array<keyof typeof ANCHORS>;

    it.each(game_names)('should verify that resolved ID for %s matches expected value', (game_name) => {
      const { id, expectedId } = ANCHORS[game_name];
      expect(id).toBe(expectedId);
    });

    it.each(game_names)('should find "%s", verify its ID, and exclude all other anchors', async (game_name) => {
      const { query, id } = ANCHORS[game_name];
      const otherAnchorIds = game_names
        .filter(name => name !== game_name)
        .map(name => ANCHORS[name].id);

      const result = await gameEntity.search({
        query,
        filters: {},
        limit: 10
      });
      
      expectContainsCanonical(result.items, id);
      expectExcludesAnchors(result.items, otherAnchorIds);
    });
  });

  describe('Game Entity: Precise Search', () => {
    const typoGameNames = Object.keys(ANCHORS).filter(k => !!ANCHORS[k].typo) as Array<keyof typeof ANCHORS>;

    it.each(typoGameNames)('should NOT find %s when searching for its typo with precise: true', async (game_name) => {
      const { typo, id } = ANCHORS[game_name];
      const result = await gameEntity.search({
        query: typo!,
        filters: { precise: true },
        limit: 10
      });
      expect(result.items.map(i => i.identity.dbId)).not.toContain(id);
    });

    it.each(typoGameNames)('should FIND %s when searching for its typo with precise: false', async (game_name) => {
      const { typo, id } = ANCHORS[game_name];
      const result = await gameEntity.search({
        query: typo!,
        filters: { precise: false },
        limit: 10
      });
      expectContainsCanonical(result.items, id);
    });
  });

  describe('Game Entity: Filtering', () => {
    const yearGameNames = Object.keys(ANCHORS).filter(k => ANCHORS[k].year !== undefined) as Array<keyof typeof ANCHORS>;

    it.each(yearGameNames)('should include %s when year filter matches exactly', async (game_name) => {
      const { query, id, year } = ANCHORS[game_name];
      const result = await gameEntity.search({
        query,
        filters: { yearRange: { min: year!.toString(), max: year!.toString() } },
        limit: 5
      });
      expectContainsCanonical(result.items, id);
    });

    it.each(yearGameNames)('should exclude %s when year filter is strictly after release', async (game_name) => {
      const { query, id, year } = ANCHORS[game_name];
      const result = await gameEntity.search({
        query,
        filters: { yearRange: { min: (year! + 1).toString() } },
        limit: 5
      });
      expect(result.items.map(i => i.identity.dbId)).not.toContain(id);
    });

    it.each(yearGameNames)('should exclude %s when year filter is strictly before release', async (game_name) => {
      const { query, id, year } = ANCHORS[game_name];
      const result = await gameEntity.search({
        query,
        filters: { yearRange: { max: (year! - 1).toString() } },
        limit: 5
      });
      expect(result.items.map(i => i.identity.dbId)).not.toContain(id);
    });

    const platformTests = Object.keys(ANCHORS)
      .filter(k => !!ANCHORS[k].platforms)
      .flatMap(key => ANCHORS[key].platforms!.map(p => ({ key, ...p })));

    it.each(platformTests)('should handle platform $name for $key (present: $shouldBePresent)', async ({ key, id, shouldBePresent }) => {
      const result = await gameEntity.search({
        query: ANCHORS[key].query,
        filters: { platform: id },
        limit: 10
      });
      
      const foundIds = result.items.map(i => i.identity.dbId);
      if (shouldBePresent) {
        expect(foundIds).toContain(ANCHORS[key].id);
      } else {
        expect(foundIds).not.toContain(ANCHORS[key].id);
      }
    });
  });

  describe('Game Entity: Sorting', () => {
    const sortQueries = ['Baldur\'s Gate', 'RPG'];

    it.each(sortQueries)('should sort by Release Date bidirectionally for query "%s"', async (query) => {
      const descRes = await gameEntity.search({
        query,
        filters: {},
        sort: 'released',
        sortDirection: SortDirection.DESC,
        limit: 10
      });
      const ascRes = await gameEntity.search({
        query,
        filters: {},
        sort: 'released',
        sortDirection: SortDirection.ASC,
        limit: 10
      });

      const extractYear = (item: BaseItem) => {
        const match = item.subtitle?.match(/\d{4}/);
        return match ? parseInt(match[0]) : '';
      };

      expectSorted(descRes.items, extractYear, SortDirection.DESC, 'subtitle year');
      expectSorted(ascRes.items, extractYear, SortDirection.ASC, 'subtitle year');
    });
  });

  describe('Game Entity: Pagination', () => {
    it.each(['Action', 'Adventure'])('should verify pagination for query "%s"', async (query) => {
      const p1 = await gameEntity.search({ query, filters: {}, limit: 5, page: 1 });
      const p2 = await gameEntity.search({ query, filters: {}, limit: 5, page: 2 });
      
      expectDistinctPages(p1.items, p2.items);
    });
  });

  describe('Developer Entity', () => {
    it('should correctly find "FromSoftware"', async () => {
      const result = await devEntity.search({
        query: 'FromSoftware',
        filters: {},
        limit: 5
      });
      expect(result.items.some(i => i.title === 'FromSoftware')).toBe(true);
    });

    it('should fetch developer details for FromSoftware (ID 6763)', async () => {
      const details = await devEntity.getDetails('6763');
      expect(details.title).toBe('FromSoftware');
    });
  });
});
