import { useMemo } from 'react';
import { getColorTheme } from '@/lib/colors';

/**
 * Generates the 4-color brand palette based on the provided tier colors.
 * Handles defaults (Red/Orange/Amber/Green) and cycling logic to ensure 4 colors.
 * 
 * @param sourceColors Array of color IDs (e.g. ['red', 'blue'])
 * @returns Array of 4 hex color strings
 */
export function useBrandColors(sourceColors: string[]) {
  return useMemo(() => {
    // Default brand colors if no input
    const defaults = ['red', 'orange', 'amber', 'green'];
    
    // Use provided colors or fallback
    const validColors = sourceColors.length > 0 ? sourceColors : defaults;

    // Ensure we always have 4 colors by cycling
    return Array(4).fill(0).map((_, i) => {
       const colorId = validColors[i % validColors.length];
       return getColorTheme(colorId).hex;
    });
  }, [sourceColors]);
}
