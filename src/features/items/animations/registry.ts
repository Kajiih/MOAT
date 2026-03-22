import { CARD_ANIMATION_VARIANTS } from '@/core/ui/animations';

import { PortalPreset } from './presets/portal';
import { EpicAnimationPreset } from './types';

/**
 * @file registry.ts
 * @description Global registry dictionary for looking up Epic animations.
 */
export const DefaultPreset: EpicAnimationPreset = {
  id: 'default',
  duration: 400, // Default duration for fallback
  cardVariants: CARD_ANIMATION_VARIANTS,
  CanvasOverlay: () => null,
};

export const EPIC_ANIMATION_PRESETS: Record<string, EpicAnimationPreset> = {
  default: DefaultPreset,
  portal: PortalPreset,
};
