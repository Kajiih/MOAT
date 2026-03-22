/**
 * @file PortalCanvas.tsx
 * @description Renders the global canvas overlay for the Portal animation preset.
 */

import { motion } from 'framer-motion';

import { EpicAnimationEvent } from '@/features/board/context';
import { ITEM_CARD_BASE_CLASSES } from '@/features/items/ItemCard';
import { ItemImage } from '@/features/items/ItemImage';
import { Info } from 'lucide-react';

/**
 * Renders the global canvas overlay for the Portal animation preset.
 * @param props - Component props.
 * @param props.activeEpic - The active epic animation event details.
 * @returns The rendered canvas overlay or null.
 */
export function CanvasOverlay({ activeEpic }: { activeEpic: EpicAnimationEvent | null }) {
  if (!activeEpic) return null;

  const { start, end } = activeEpic;

  // Animation Timings (in seconds)
  const PORTAL_DURATION = 1.2; // Extended portal lifespan to cover sequence
  const TRAVEL_DURATION = 0.6;
  const TRAVEL_DELAY = 0.3; // Starts moving at 0.3s

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-visible">
      {/* 1. Start Portal (Right edge of source) */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{
          scaleY: [0, 1.2, 1, 0],
          opacity: [0, 1, 1, 0],
          scaleX: [1, 1.5, 1, 1],
        }}
        // Opens 0 to 0.2s. Stays open fill 0.5s. Closes by 0.6s.
        transition={{ duration: 0.8, ease: 'easeOut', times: [0, 0.25, 0.6, 1] }}
        style={{
          top: start.top + start.height / 2,
          left: start.left + start.width,
        }}
        className="absolute h-24 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_20px_4px_rgba(34,211,238,0.7)]"
      />

      {/* 2. Traveling Card Clone */}
      <motion.div
        initial={{
          top: start.top,
          left: start.left,
          scale: 1,
          opacity: 1,
        }}
        animate={{
          x: [0, 40, end.left - start.left - 40, end.left - start.left, end.left - start.left],
          y: [0, 0, end.top - start.top, end.top - start.top, end.top - start.top],
          scaleX: [1, 0, 0, 1, 1], 
          scaleY: [1, 0.8, 0.8, 1, 1],
          opacity: [1, 1, 1, 1, 0], // Continuous hold, then fade out
        }}
        transition={{
          duration: TRAVEL_DURATION + 0.2, // 0.8s total
          delay: TRAVEL_DELAY, // 0.3s
          times: [0, 0.2, 0.5, 0.8, 1], // Staggered timelines ensuring hold expands
          ease: 'easeInOut',
        }}
        style={{
          top: start.top,
          left: start.left,
          width: start.width,
          height: start.height,
        }}
        className="absolute p-1 overflow-visible"
      >
        {/* Inner Card bounding matching ItemCard.tsx absolute inset-1 */}
        <div className="bg-surface shadow-card absolute inset-1 overflow-hidden rounded-md">
          <ItemImage item={activeEpic.item} TypeIcon={Info} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-end">
            <p className="text-caption font-bold text-white line-clamp-1">
              {activeEpic.item.title}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 3. End Portal (Left edge of target) */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{
          scaleY: [0, 0, 1.2, 1, 0],
          opacity: [0, 0, 1, 1, 0],
          scaleX: [1, 1, 1.5, 1, 1],
        }}
        transition={{
          duration: PORTAL_DURATION, // 1.2s total
          ease: 'easeOut',
          // Opens at 0.6s (when first portal closes). 
          // Stays open til 1.0s (after card emerges at 0.9s).
          // Closes by 1.2s.
          times: [0, 0.5, 0.65, 0.85, 1],
        }}
        style={{
          top: end.top + end.height / 2,
          left: end.left,
        }}
        className="absolute h-24 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 shadow-[0_0_20px_4px_rgba(245,158,11,0.7)]"
      />
    </div>
  );
}
