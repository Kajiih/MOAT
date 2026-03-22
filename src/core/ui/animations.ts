/**
 * @file animations.ts
 * @description Centralized Framer Motion configuration and variants for uniform UI transitions.
 */

/**
 * Variants for ItemCard entry, exit, and scale scaling setups.
 */
export const CARD_ANIMATION_VARIANTS = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
} as const;

/**
 * Transition timings supporting snappy and intuitive responses.
 */
export const CARD_ANIMATION_TRANSITION = {
  duration: 0.1, // Snappy responses
  ease: 'easeOut',
} as const;
