/**
 * @file colors.ts
 * @description Defines the semantic color palette used throughout the application.
 * Maps abstract color IDs (e.g., 'red') to concrete Tailwind CSS classes and Hex values.
 * Used for Tier backgrounds, text colors, and dynamic branding generation.
 * @module ColorSystem
 */

/**
 * Represents a single color theme in the application's semantic palette.
 */
export interface ColorTheme {
  /** Unique ID for the color (e.g., 'red'). */
  id: string;
  /** Human-readable label for the color. */
  label: string;
  /** Tailwind CSS class for background color. */
  bg: string;
  /** Tailwind CSS class for text color. */
  text: string;
  /** Hexadecimal value for dynamic generation (Favicon, Logo). */
  hex: string;
  /** Optional Tailwind CSS class for focus rings. */
  ring?: string;
}

export const COLOR_PALETTE: Record<string, ColorTheme> = {
  red: { id: 'red', label: 'Red', bg: 'bg-red-500', text: 'text-red-500', hex: '#ef4444' },
  orange: {
    id: 'orange',
    label: 'Orange',
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    hex: '#f97316',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    bg: 'bg-amber-400',
    text: 'text-amber-400',
    hex: '#fbbf24',
  },
  yellow: {
    id: 'yellow',
    label: 'Yellow',
    bg: 'bg-yellow-300',
    text: 'text-yellow-300',
    hex: '#fde047',
  },
  lime: { id: 'lime', label: 'Lime', bg: 'bg-lime-400', text: 'text-lime-400', hex: '#a3e635' },
  green: {
    id: 'green',
    label: 'Green',
    bg: 'bg-green-500',
    text: 'text-green-500',
    hex: '#22c55e',
  },
  // emerald: { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981' },
  teal: { id: 'teal', label: 'Teal', bg: 'bg-teal-400', text: 'text-teal-400', hex: '#2dd4bf' },
  cyan: { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-400', text: 'text-cyan-400', hex: '#22d3ee' },
  // sky: { id: 'sky', label: 'Sky', bg: 'bg-sky-500', text: 'text-sky-500', hex: '#0ea5e9' },
  blue: { id: 'blue', label: 'Blue', bg: 'bg-blue-500', text: 'text-blue-400', hex: '#3b82f6' },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
    hex: '#6366f1',
  },
  // violet: { id: 'violet', label: 'Violet', bg: 'bg-violet-500', text: 'text-violet-500', hex: '#8b5cf6' },
  purple: {
    id: 'purple',
    label: 'Purple',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    hex: '#a855f7',
  },
  // fuchsia: { id: 'fuchsia', label: 'Fuchsia', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', hex: '#d946ef' },
  pink: { id: 'pink', label: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400', hex: '#ec4899' },
  rose: { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-rose-500', hex: '#f43f5e' },
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    bg: 'bg-neutral-500',
    text: 'text-neutral-500',
    hex: '#737373',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    bg: 'bg-slate-700',
    text: 'text-slate-600',
    hex: '#475569',
  },
};

// Ordered list for pickers
export const TIER_COLORS = Object.values(COLOR_PALETTE);

/**
 * The default brand color palette, used when the board is empty or on the dashboard.
 * Derived from the first 5 colors of the default tier list.
 */
export const DEFAULT_BRAND_COLORS = ['red', 'orange', 'amber', 'green', 'blue'] as const;

export const DEFAULT_COLOR = COLOR_PALETTE.neutral;

/**
 * Retrieves the full color theme object by its ID.
 * Falls back to 'neutral' if the ID is not found.
 * @param id - The ID of the color theme to retrieve.
 * @returns The full color theme object.
 */
export const getColorTheme = (id?: string): ColorTheme => {
  if (!id) return DEFAULT_COLOR;
  return COLOR_PALETTE[id] || DEFAULT_COLOR;
};
