/**
 * @file index.ts
 * @description Bundle index for the Portal animation preset.
 */

import { EpicAnimationPreset } from '../../types';
import { CanvasOverlay } from './CanvasOverlay';
import { cardVariants } from './variants';

export const PortalPreset: EpicAnimationPreset = {
  id: 'portal',
  duration: 1500, // Sync with absolute delay + expands buffer sizes
  cardVariants,
  CanvasOverlay,
};
