/**
 * @file io.ts
 * @description Utilities for importing and exporting Tier List data.
 * Handles JSON parsing, validation, and file generation.
 * @module IO
 */

import { MediaItem, TierDefinition, TierListState } from '@/lib/types';

const CURRENT_VERSION = 1;

/**
 * Schema for the exported JSON file.
 * Designed to be portable and independent of internal IDs (which are regenerated on import).
 */
interface ExportData {
  /** Schema version for future compatibility migrations. */
  version: number;
  /** ISO timestamp of when the export was created. */
  createdAt: string;
  /** The user-defined title of the tier list. */
  title: string;
  /** The ordered list of tiers containing their metadata and items. */
  tiers: {
    label: string;
    color: string;
    items: MediaItem[];
  }[];
}

/**
 * Generates the exportable JSON object from the current state.
 */
export function generateExportData(state: TierListState): ExportData {
  return {
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    title: state.title,
    tiers: state.tierDefs.map((tier) => ({
      label: tier.label,
      color: tier.color,
      items: state.items[tier.id] || [],
    })),
  };
}

/**
 * Triggers a browser download for the given data.
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
 */
export function parseImportData(jsonString: string, fallbackTitle: string): TierListState {
  const parsed = JSON.parse(jsonString);

  // 1. Handle New Nested Format (ExportData)
  if (parsed.tiers && Array.isArray(parsed.tiers)) {
    const newTierDefs: TierDefinition[] = [];
    const newItems: Record<string, MediaItem[]> = {};

    parsed.tiers.forEach((tier: { label: string; color: string; items: MediaItem[] }) => {
      const id = crypto.randomUUID();
      newTierDefs.push({
        id,
        label: tier.label,
        color: tier.color,
      });
      newItems[id] = tier.items || [];
    });

    return {
      title: parsed.title || fallbackTitle,
      tierDefs: newTierDefs,
      items: newItems,
    };
  }

  // 2. Handle Legacy Format (Raw State Dump)
  if (parsed && 'tierDefs' in parsed) {
    return {
      ...parsed,
      title: parsed.title || fallbackTitle,
    };
  }

  throw new Error('Invalid tier list format');
}
