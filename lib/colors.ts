export interface ColorTheme {
  id: string;
  label: string;
  bg: string;
  text: string;
  ring?: string; // For focus/active states if needed
}

export const COLOR_PALETTE: Record<string, ColorTheme> = {
  red: { id: 'red', label: 'Red', bg: 'bg-red-500', text: 'text-red-500' },
  orange: { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-orange-500' },
  amber: { id: 'amber', label: 'Amber', bg: 'bg-amber-400', text: 'text-amber-400' },
  yellow: { id: 'yellow', label: 'Yellow', bg: 'bg-yellow-300', text: 'text-yellow-300' },
  lime: { id: 'lime', label: 'Lime', bg: 'bg-lime-400', text: 'text-lime-400' },
  green: { id: 'green', label: 'Green', bg: 'bg-green-500', text: 'text-green-500' },
  teal: { id: 'teal', label: 'Teal', bg: 'bg-teal-400', text: 'text-teal-400' },
  cyan: { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-400', text: 'text-cyan-400' },
  blue: { id: 'blue', label: 'Blue', bg: 'bg-blue-500', text: 'text-blue-400' },
  indigo: { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-400' },
  purple: { id: 'purple', label: 'Purple', bg: 'bg-purple-500', text: 'text-purple-400' },
  pink: { id: 'pink', label: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400' },
  rose: { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-rose-500' },
  neutral: { id: 'neutral', label: 'Neutral', bg: 'bg-neutral-500', text: 'text-neutral-500' },
  slate: { id: 'slate', label: 'Slate', bg: 'bg-slate-700', text: 'text-slate-600' },
};

// Ordered list for pickers
export const TIER_COLORS = Object.values(COLOR_PALETTE);

export const DEFAULT_COLOR = COLOR_PALETTE.neutral;

/**
 * Retrieves the full color theme object by its ID.
 * Falls back to 'neutral' if the ID is not found.
 */
export const getColorTheme = (id: string | undefined): ColorTheme => {
  if (!id) return DEFAULT_COLOR;
  return COLOR_PALETTE[id] || DEFAULT_COLOR;
};
