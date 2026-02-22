/**
 * @file tierlist.ts
 * @description Custom Vitest matchers for TierListState.
 */

import { expect } from 'vitest';

import { TierListState } from '@/lib/types';

/**
 * Custom Vitest matchers for TierListState.
 */
export const tierListMatchers = {
  /**
   * Asserts that the state has a tier with the given label.
   * @param received - The TierListState object.
   * @param label - The label of the tier (e.g., 'S').
   * @returns Matcher result.
   */
  toHaveTier(received: TierListState, label: string) {
    const tier = received.tierDefs.find((t) => t.label === label);
    const pass = tier !== undefined;

    return {
      pass,
      message: () =>
        pass
          ? `Expected state NOT to have tier with label "${label}"`
          : `Expected state to have tier with label "${label}", but it was not found. Available: ${received.tierDefs
              .map((t) => t.label)
              .join(', ')}`,
    };
  },

  /**
   * Asserts that an item exists in the state, optionally in a specific tier.
   * @param received - The TierListState object.
   * @param itemId - ID of the item.
   * @param tierLabel - Optional label of the tier.
   * @returns Matcher result.
   */
  toContainItem(received: TierListState, itemId: string, tierLabel?: string) {
    let pass = false;

    if (tierLabel) {
      const tier = received.tierDefs.find((t) => t.label === tierLabel);
      if (tier) {
        pass = (received.items[tier.id] || []).some((item) => item.id === itemId);
      }
    } else {
      // Search all tiers
      for (const tierDef of received.tierDefs) {
        if ((received.items[tierDef.id] || []).some((item) => item.id === itemId)) {
          pass = true;
          break;
        }
      }
    }

    return {
      pass,
      message: () => {
        if (pass) {
          const suffix = tierLabel ? ` in tier "${tierLabel}"` : '';
          return `Expected state NOT to contain item "${itemId}"${suffix}`;
        }
        const suffix = tierLabel ? ` in tier "${tierLabel}"` : '';
        return `Expected state to contain item "${itemId}"${suffix}, but it was not found.`;
      },
    };
  },

  /**
   * Asserts that a tier has the expected number of items.
   * @param received - The TierListState object.
   * @param count - Expected number of items.
   * @param tierLabel - The label of the tier.
   * @returns Matcher result.
   */
  toHaveItemCount(received: TierListState, count: number, tierLabel: string) {
    const tier = received.tierDefs.find((t) => t.label === tierLabel);
    if (!tier) {
      return {
        pass: false,
        message: () => `Tier with label "${tierLabel}" not found in state.`,
      };
    }

    const actualCount = (received.items[tier.id] || []).length;
    const pass = actualCount === count;

    return {
      pass,
      message: () =>
        pass
          ? `Expected tier "${tierLabel}" NOT to have exactly ${count} items`
          : `Expected tier "${tierLabel}" to have ${count} items, but found ${actualCount}.`,
    };
  },

  /**
   * Asserts that the board title matches.
   * @param received - The TierListState object.
   * @param title - The expected title.
   * @returns Matcher result.
   */
  toHaveTitle(received: TierListState, title: string) {
    const pass = received.title === title;
    return {
      pass,
      message: () =>
        pass
          ? `Expected board title NOT to be "${title}"`
          : `Expected board title to be "${title}", but found "${received.title}"`,
    };
  },
};

// Register matchers globally if this file is imported
expect.extend(tierListMatchers);
