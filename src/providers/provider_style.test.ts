import '@/providers/bootstrap';

import { describe, expect, it } from 'vitest';

import { registry } from './registry';

describe('Provider Style Guidelines', () => {
  it('should place related item filters first in filter lists', () => {
    const providers = registry.getAllProviders();

    for (const provider of providers) {
      for (const entity of provider.entities) {
        let foundNonRelated = false;

        entity.filters.forEach((filter) => {
          const isRelated =
            filter.type === 'async-select' || filter.type === 'async-multiselect';

          if (isRelated) {
            // If we already found a non-related filter, then this related filter is in the wrong place.
            expect(
              foundNonRelated,
              `Provider: "${provider.id}", Entity: "${entity.id}" - Related filter "${filter.id}" (${filter.label}) must appear BEFORE non-related filters.`,
            ).toBe(false);
          } else {
            foundNonRelated = true;
          }
        });
      }
    }
  });
});
