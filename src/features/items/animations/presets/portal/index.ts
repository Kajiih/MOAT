/**
 * @file index.ts
 * @description Bundle index for the Portal animation preset.
 */

import { EpicAnimationPreset } from '../../types';
import { CanvasOverlay } from './CanvasOverlay';
import { cardVariants } from './variants';

export const PortalPreset: EpicAnimationPreset = {
  id: 'portal',
  duration: 1000, // 1 second
  cardVariants,
  CanvasOverlay,
};
