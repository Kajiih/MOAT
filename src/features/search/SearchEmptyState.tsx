/**
 * @file SearchEmptyState.tsx
 * @description Renders a rich empty state with mesh-gradient ambient effects, illustrations, and call-to-actions.
 */

'use client';

import { motion } from 'framer-motion';
import { Compass, SearchX } from 'lucide-react';

interface SearchEmptyStateProps {
  /** The type of empty state to render. */
  type: 'initial' | 'no-results';
  /** Optional custom hex colors from the active board theme for ambient clouds. */
  tierColors?: string[];
}

const CONFIG = {
  initial: {
    Icon: Compass,
    title: 'Discover Items',
    description: 'Type in the search bar above or apply filters to find items for your board.',
    buttonText: null,
    // Hex with transparency (approx 15-20% Alpha: 26 or 33)
    colors: ['#3b82f633', '#6366f133'],
  },
  'no-results': {
    Icon: SearchX,
    title: 'No Results Found',
    description:
      "We couldn't find anything matching your search. Try adjusting filters or typing something else.",
    buttonText: 'Clear Filters',
    colors: ['#ef444426', '#a855f726'],
  },
};

/**
 * A rich placeholder view with mesh-gradient effects for search boundaries.
 * @param props - Component props.
 * @param props.type - The type of empty state to render.
 * @param props.tierColors - Optional custom hex colors from the active board theme for ambient clouds.
 * @returns The rendered empty state view.
 */
export function SearchEmptyState({ type, tierColors }: SearchEmptyStateProps) {
  const { Icon, title, description, colors: configColors } = CONFIG[type];

  // Derive final ambient colors, adding translucent opacity to tier colors if provided
  const finalColors =
    tierColors && tierColors.length >= 2
      ? [`${tierColors[0]}33`, `${tierColors[1] || tierColors[0]}33`]
      : configColors;

  return (
    <div className="relative flex h-full min-h-[16rem] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 px-6 text-center">
      {/* 1. Ambient Blur Clouds (Mesh Gradient Layout Nodes) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 15, -10, 0],
            y: [0, -20, 10, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: finalColors[0] }}
          className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -15, 15, 0],
            y: [0, 20, -10, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{ backgroundColor: finalColors[1] }}
          className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full blur-3xl"
        />
      </div>

      {/* 2. Visual Layer & Messaging (Static for headless/E2E stability checks) */}
      <div className="relative z-10 flex max-w-sm flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/10 shadow-sm backdrop-blur-md">
          <Icon size={22} className="text-foreground/90" />
        </div>

        <h3 className="mb-1.5 text-base font-bold text-white">{title}</h3>
        <p className="text-secondary text-xs leading-normal">{description}</p>
      </div>
    </div>
  );
}
