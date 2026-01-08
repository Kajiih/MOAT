import { useMemo } from 'react';
import { getColorTheme } from '@/lib/colors';

/**
 * Generates the 4-color brand palette based on the provided tier colors.
 * Handles defaults (Red/Orange/Amber/Green) and cycling logic to ensure 4 colors.
 * 
 * @param sourceColors Array of color IDs (e.g. ['red', 'blue'])
 * @returns Array of 4 hex color strings
 */
const DEFAULT_BRAND_IDS = ['red', 'orange', 'amber', 'green'];

export function useBrandColors(sourceColors: string[]): (string | undefined)[] {
  return useMemo(() => {
    // If no colors provided, use all 4 defaults
    if (!sourceColors || sourceColors.length === 0) {
      return DEFAULT_BRAND_IDS.map(id => getColorTheme(id).hex);
    }

    // Otherwise, return strictly what's provided (up to 4)
    return [
        sourceColors[0] ? getColorTheme(sourceColors[0]).hex : undefined,
        sourceColors[1] ? getColorTheme(sourceColors[1]).hex : undefined,
        sourceColors[2] ? getColorTheme(sourceColors[2]).hex : undefined,
        sourceColors[3] ? getColorTheme(sourceColors[3]).hex : undefined,
    ];
  }, [sourceColors]);
}
