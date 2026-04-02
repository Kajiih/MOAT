/**
 * @file factories.ts
 * @description Centralized factories for generating mock domain objects for testing.
 * Provides sensible defaults while allowing easy overrides for specific test cases.
 */

import { faker } from '@faker-js/faker';

import { Item, TierDefinition, TierListState } from '@/features/board/types';

/**
 * Creates a mock TierDefinition.
 * @param overrides - Optional overrides for the tier definition.
 * @returns A tier definition object.
 */
export function createTierDef(overrides: Partial<TierDefinition> = {}): TierDefinition {
  return {
    id: faker.string.uuid(),
    label: faker.helpers.arrayElement(['S', 'A', 'B', 'C', 'D', 'F']),
    color: faker.helpers.arrayElement(['red', 'blue', 'green', 'yellow', 'purple']),
    ...overrides,
  };
}

/**
 * Creates a mock Item.
 * @param overrides - Optional overrides for the item.
 * @returns An Item object.
 */
export function createMockItem(overrides: Partial<Item> = {}): Item {
  const id = overrides.id || faker.string.uuid();
  return {
    id,
    title: faker.commerce.productName(),
    identity: {
      providerItemId: id,
      providerId: 'mock-provider',
      entityId: id,
    },
    images: [{ type: 'url', url: faker.image.url() }],
    ...overrides,
  };
}

/**
 * Creates a list of mock Items of a given type.
 * @param count - Number of items to create.
 * @param factory - Factory function to use.
 * @returns Array of items.
 */
export function createMany<T extends Item>(
  count: number,
  factory: (overrides?: Partial<T>) => T,
): T[] {
  return Array.from({ length: count }, () => factory());
}

/**
 * Creates a mock TierListState.
 * @param overrides - Optional overrides for the state.
 * @returns A tier list state object.
 */
export function createTierListState(overrides: Partial<TierListState> = {}): TierListState {
  const tier1 = createTierDef({ id: 'tier-1', label: 'S' });
  const tier2 = createTierDef({ id: 'tier-2', label: 'A' });

  return {
    title: faker.word.words(3),
    tierDefs: [tier1, tier2],
    itemEntities: {},
    tierLayout: {
      [tier1.id]: [],
      [tier2.id]: [],
    },
    ...overrides,
  };
}

/**
 * Creates a populated TierListState scenario with predictable, realistic data.
 * Useful for tests that require a non-empty board without random Faker noise.
 * @returns A populated TierListState.
 */
export function createPopulatedBoardScenario(): TierListState {
  const item1 = createMockItem({ id: 'item-s-1', title: 'The Legend of Zelda' });
  const item2 = createMockItem({ id: 'item-a-1', title: 'Super Mario Odyssey' });
  const item3 = createMockItem({ id: 'item-a-2', title: 'Metroid Dread' });

  const tierS = createTierDef({ id: 'tier-s', label: 'S' });
  const tierA = createTierDef({ id: 'tier-a', label: 'A' });

  return {
    title: 'Top Nintendo Games',
    tierDefs: [tierS, tierA],
    itemEntities: {
      [item1.id]: item1,
      [item2.id]: item2,
      [item3.id]: item3,
    },
    tierLayout: {
      [tierS.id]: [item1.id],
      [tierA.id]: [item2.id, item3.id],
    },
  };
}

