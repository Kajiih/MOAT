/**
 * @file factories.ts
 * @description Centralized factories for generating mock domain objects for testing.
 * Provides sensible defaults while allowing easy overrides for specific test cases.
 */

import { faker } from '@faker-js/faker';

import { Item, TierDefinition, TierListState } from '@/board/types';

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
