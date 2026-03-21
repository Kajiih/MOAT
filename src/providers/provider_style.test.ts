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
          const isRelated = filter.type === 'async-select' || filter.type === 'async-multiselect';

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

  it('should have unique colors, icons, and labels for each entity within a provider', () => {
    const providers = registry.getAllProviders();

    for (const provider of providers) {
      const labels = new Set<string>();
      const icons = new Set<unknown>();
      const colors = new Set<string>();

      for (const entity of provider.entities) {
        const { label, icon, colorClass } = entity.branding;

        // Label Uniqueness
        expect(
          labels.has(label),
          `Provider: "${provider.id}" - Duplicate entity label: "${label}"`,
        ).toBe(false);
        labels.add(label);

        // Icon Uniqueness
        expect(
          icons.has(icon),
          `Provider: "${provider.id}" - Duplicate entity icon on: "${label}"`,
        ).toBe(false);
        icons.add(icon);

        // Color Uniqueness
        expect(
          colors.has(colorClass),
          `Provider: "${provider.id}" - Duplicate entity colorClass: "${colorClass}" on "${label}"`,
        ).toBe(false);
        colors.add(colorClass);
      }
    }
  });
});
