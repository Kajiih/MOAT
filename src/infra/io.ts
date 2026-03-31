/**
 * @file io.ts
 * @description Utilities for importing and exporting Tier List data.
 * Handles JSON parsing, validation, and file generation.
 * @module IO
 */

import { z } from 'zod';

import { Item, TierDefinition, TierListState } from '@/features/board/types';

const CURRENT_VERSION = 1;

/**
 * Zod Schema for the exported JSON file.
 * We pass-through items to avoid tight coupling with heavy domain models,
 * but enforce presence of an 'id'.
 */
const ExportItemSchema = z.object({
  id: z.string(),
}).passthrough();

const ExportDataSchema = z.object({
  version: z.number(),
  createdAt: z.string(),
  title: z.string(),
  tiers: z.array(
    z.object({
      label: z.string(),
      color: z.string(),
      items: z.array(ExportItemSchema),
    })
  ),
});

interface ExportData extends z.infer<typeof ExportDataSchema> {}

/**
 * Generates the exportable JSON object from the current state.
 * @param state - The current state of the tier list.
 * @returns An `ExportData` object suitable for JSON serialization.
 */
export function generateExportData(state: TierListState): ExportData {
  return {
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    title: state.title,
    tiers: state.tierDefs.map((tier) => ({
      label: tier.label,
      color: tier.color,
      items: (state.tierLayout[tier.id] || [])
        .map((id) => state.itemEntities[id])
        .filter(Boolean) as Item[],
    })),
  };
}

/**
 * Triggers a browser download for the given data.
 * @param data - The JSON object to download.
 * @param filename - The name of the file to download.
 */
export function downloadJson(data: object, filename: string) {
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = filename;
  a.click();
}

/**
 * Parses and validates imported JSON data.
 * Returns a normalized TierListState or throws an error.
 * @param jsonString - The JSON string to parse.
 * @param fallbackTitle - The title to use if the imported data has no title.
 * @returns A normalized TierListState object.
 */
export function parseImportData(jsonString: string, fallbackTitle: string): TierListState {
  const parsedJson = JSON.parse(jsonString);
  const data = ExportDataSchema.parse(parsedJson);

  const newTierDefs: TierDefinition[] = [];
  const itemEntities: Record<string, Item> = {};
  const tierLayout: Record<string, string[]> = {
    unranked: [],
  };

  data.tiers.forEach((tier) => {
    const tierId = crypto.randomUUID();
    newTierDefs.push({
      id: tierId,
      label: tier.label,
      color: tier.color,
    });

    const itemIds: string[] = [];
    tier.items.forEach((item) => {
      itemEntities[item.id] = item as Item;
      itemIds.push(item.id);
    });
    tierLayout[tierId] = itemIds;
  });

  return {
    title: data.title || fallbackTitle,
    tierDefs: newTierDefs,
    itemEntities,
    tierLayout,
  } as TierListState;
}

