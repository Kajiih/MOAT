/**
 * @file initial-state.ts
 * @description Defines the default/initial state for the Tier List application.
 * Acts as the single source of truth for the empty board state used during hydration and clearing.
 * @module InitialState
 */

import { TierListState } from '@/lib/types';

export const INITIAL_STATE: TierListState = {
  title: 'My Tier List',
  tierDefs: [
    { id: 'tier-1', label: 'S', color: 'red' },
    { id: 'tier-2', label: 'A', color: 'orange' },
    { id: 'tier-3', label: 'B', color: 'amber' },
    { id: 'tier-4', label: 'C', color: 'green' },
    { id: 'tier-5', label: 'D', color: 'blue' },
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
