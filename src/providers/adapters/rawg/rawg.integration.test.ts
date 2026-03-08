import { beforeAll, describe, expect, it } from 'vitest';
import { BaseItem } from '@/items/items';
import { RAWGDatabase, RAWGGame, RAWGDeveloper } from './rawg';
import { SortDirection } from '@/search/schemas';
import { DatabaseEntity } from '@/providers/types';
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
describe.runIf(!!process.env.RAWG_API_KEY)('RAWGDatabaseProvider Live API Integration', { timeout: 15000 }, () => {
  const gameEntity = RAWGDatabase.entities.find(e => e.id === 'game')! as DatabaseEntity<RAWGGame, 'page'>;
  const devEntity = RAWGDatabase.entities.find(e => e.id === 'developer')! as DatabaseEntity<RAWGDeveloper, 'page'>;

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
});
