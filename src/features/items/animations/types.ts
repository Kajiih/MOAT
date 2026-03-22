import { Variants } from 'framer-motion';

import { EpicAnimationEvent } from '@/features/board/context';

/**
 * @file types.ts
 * @description Interfaces for extending Epic animation presets modularly.
 */
export interface EpicAnimationPreset {
  id: string;
  /**
   * Duration of the animation in milliseconds.
   * Used to drive the timeout for clearing the active state.
   */
  duration: number;
  /**
   * Variants applied to the ItemCard during the transition.
   */
  cardVariants: Variants;
  /**
   * The Overlay Canvas component responsible for particle/glowing effects.
   */
  CanvasOverlay: React.ComponentType<{ activeEpic: EpicAnimationEvent | null }>;
}
