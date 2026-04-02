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
const ExportItemSchema = z
  .object({
    id: z.string(),
    identity: z.object({
      providerId: z.string(),
      entityId: z.string(),
      providerItemId: z.string(),
    }),
  })
  .passthrough();

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

type ExportData = z.infer<typeof ExportDataSchema>;

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

interface LegacyItem {
  id: string;
  imageUrl?: string;
  mbid?: string;
  type?: string;
  identity?: {
    providerId: string;
    entityId: string;
    providerItemId: string;
  };
}

interface LegacyTier {
  label: string;
  color: string;
  items?: LegacyItem[];
}

interface LegacyExportData {
  version?: number;
  createdAt?: string;
  title?: string;
  tiers?: LegacyTier[];
}

/**
 * Migrates legacy data to conform to the strict modern schema.
 * This is only called if initial strict parsing fails.
 * @param raw - The raw JSON data to migrate.
 * @returns The migrated JSON data.
 */
function migrateLegacyData(raw: unknown): unknown {
  console.log('migrateLegacyData raw input:', JSON.stringify(raw));
  if (typeof raw !== 'object' || raw === null) return raw;

  const data = { ...(raw as LegacyExportData) };

  // 1. Synthesize createdAt if missing
  if (!data.createdAt) {
    data.createdAt = new Date().toISOString();
  }

  // 2. Synthesize title if missing
  if (!data.title) {
    data.title = 'Untitled Board';
  }

  // 3. Synthesize identity for items inside tiers if missing
  if (Array.isArray(data.tiers)) {
    data.tiers = data.tiers.map((tier: LegacyTier) => {
      const migratedTier = { ...tier };
      if (Array.isArray(migratedTier.items)) {
        migratedTier.items = migratedTier.items.map((item: LegacyItem) => {
          if (!item.identity && item.mbid && item.type) {
            let entityId = item.type;

            const images = [];
            if (item.imageUrl) {
              images.push({ type: 'url' as const, url: item.imageUrl });
            }

            return {
              ...item,
              images, // Ensure images array exists
              identity: {
                providerId: 'musicbrainz',
                entityId,
                providerItemId: item.mbid,
              },
            };
          }
          return item;
        });
      }
      return migratedTier;
    });
  }

  return data;
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
  
  let result = ExportDataSchema.safeParse(parsedJson);

    if (!result.success) {
      // Attempt migration for legacy formats
      const migratedJson = migrateLegacyData(parsedJson);
      result = ExportDataSchema.safeParse(migratedJson);
    
    if (!result.success) {
      console.error('Migration failed validation Zod message:', result.error.message);
      throw result.error;
    }
  }

  const data = result.data;

  const newTierDefs: TierDefinition[] = [];
  const itemEntities: Record<string, Item> = {};
  const tierLayout: Record<string, string[]> = {
    unranked: [],
  };

  data.tiers.forEach((tier) => {
    const tierId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : ('uuid-' + Math.random().toString(36).slice(2, 11));
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

