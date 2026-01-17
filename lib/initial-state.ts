/**
 * @file initial-state.ts
 * @description Defines the default/initial state for the Tier List application.
 * Acts as the single source of truth for the empty board state used during hydration and clearing.
 * @module InitialState
 */

import { TierListState } from '@/lib/types';
import { DEFAULT_BRAND_COLORS } from '@/lib/colors';

export const INITIAL_STATE: TierListState = {
  title: 'Untitled Tier List',
  tierDefs: [
    { id: 'tier-1', label: 'S', color: DEFAULT_BRAND_COLORS[0] },
    { id: 'tier-2', label: 'A', color: DEFAULT_BRAND_COLORS[1] },
    { id: 'tier-3', label: 'B', color: DEFAULT_BRAND_COLORS[2] },
    { id: 'tier-4', label: 'C', color: DEFAULT_BRAND_COLORS[3] },
    { id: 'tier-5', label: 'D', color: DEFAULT_BRAND_COLORS[4] },
    { id: 'tier-6', label: 'Unranked', color: 'neutral' },
  ],
  items: { 
    'tier-1': [], 
    'tier-2': [], 
    'tier-3': [], 
    'tier-4': [], 
    'tier-5': [], 
    'tier-6': [] 
  }
};
