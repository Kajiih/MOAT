/**
 * @file variants.ts
 * @description Card variants for the Portal animation preset.
 */

import { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  initial: { x: -60, scaleX: 0, opacity: 0 },
  animate: {
    x: 0,
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  exit: {
    x: 60,
    scaleX: 0,
    opacity: 0,
    transition: { duration: 0.4, ease: 'easeIn' },
  },
};
