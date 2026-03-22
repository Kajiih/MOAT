/**
 * @file animations.ts
 * @description Centralized Framer Motion configuration and variants for uniform UI transitions.
 */

/**
 * Variants for ItemCard entry, exit, and scale scaling setups.
 */
export const CARD_ANIMATION_VARIANTS = {
  initial: { x: -40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: {
    x: 40,
    opacity: 0,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
} as const;

/**
 * Spring-based physics supporting snappy and weighted responses.
 */
export const CARD_ANIMATION_TRANSITION = {
  type: 'spring',
  stiffness: 1200,
  damping: 60,
} as const;

/**
 * Micro-animations on interactive frames.
 */
export const CARD_ANIMATION_HOVER = {
  scale: 1.04,
  y: -3,
  transition: { duration: 0.1, ease: 'easeOut' },
} as const;

export const CARD_ANIMATION_TAP = {
  scale: 0.97,
  y: 0,
} as const;
