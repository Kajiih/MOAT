/**
 * @file useBrandColors.ts
 * @description Hook that derives the application's "Brand Colors" from the current tier list state.
 * These colors are used to dynamically theme the Header Logo and Favicon.
 * @module useBrandColors
 */

import { useMemo } from 'react';
import { getColorTheme } from '@/lib/colors';

/**
 * Generates the 4-color brand palette based on the provided tier colors.
 * Handles defaults (Red/Orange/Amber/Green) and cycling logic to ensure 4 colors.
 * 
 * @param sourceColors Array of color IDs (e.g. ['red', 'blue'])
 * @returns Array of 4 hex color strings
 */
export function useBrandColors(sourceColors?: string[]) {
  return useMemo(() => {
    const colors = sourceColors || [];
    return [
        colors[0] ? getColorTheme(colors[0]).hex : undefined,
        colors[1] ? getColorTheme(colors[1]).hex : undefined,
        colors[2] ? getColorTheme(colors[2]).hex : undefined,
        colors[3] ? getColorTheme(colors[3]).hex : undefined,
    ];
  }, [sourceColors]);
}
