/**
 * @file useBrandColors.ts
 * @description Hook that derives the application's "Brand Colors" from the current tier list state.
 * These colors are used to dynamically theme the Header Logo and Favicon.
 * @module useBrandColors
 */

'use client';

import { useMemo } from 'react';
import { getColorTheme } from '@/lib/colors';

/**
 * Generates the 5-color brand palette based on the provided tier colors.
 * Handles defaults (Red/Orange/Amber/Green/Blue) and cycling logic to ensure 5 colors.
 *
 * @param sourceColors Array of color IDs (e.g. ['red', 'blue'])
 * @returns Array of 5 hex color strings
 */
export function useBrandColors(sourceColors?: string[]) {
  return useMemo(() => {
    // Fallback to defaults if empty
    const activeIds = sourceColors || [];
    // Slice to exactly 5 and map to hex
    return activeIds.slice(0, 5).map((id) => getColorTheme(id).hex);
  }, [sourceColors]);
}
