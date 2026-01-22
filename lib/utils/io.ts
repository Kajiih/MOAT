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
      items: state.items[tier.id] || [],
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
  const data = JSON.parse(jsonString);

  // 1. Handle ExportData Format
  if (data.tiers && Array.isArray(data.tiers)) {
    const newTierDefs: TierDefinition[] = [];
    const newItems: Record<string, MediaItem[]> = {};

    data.tiers.forEach((tier: { label: string; color: string; items: MediaItem[] }) => {
      const id = crypto.randomUUID();
      newTierDefs.push({
        id,
        label: tier.label,
        color: tier.color,
      });
      newItems[id] = tier.items || [];
    });

    return {
      title: data.title || fallbackTitle,
      tierDefs: newTierDefs,
      items: newItems,
    };
  }

  throw new Error('Invalid tier list file format.');
}
