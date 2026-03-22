/**
 * @file variants.ts
 * @description Card variants for the Portal animation preset.
 */

import { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut', delay: 0.94 }, // Instant take-over
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};
