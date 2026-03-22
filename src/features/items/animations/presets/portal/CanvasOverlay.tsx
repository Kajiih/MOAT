/**
 * @file PortalCanvas.tsx
 * @description Renders the global canvas overlay for the Portal animation preset.
 */

import { motion } from 'framer-motion';

import { EpicAnimationEvent } from '@/features/board/context';

/**
 * Renders the global canvas overlay for the Portal animation preset.
 * @param props - Component props.
 * @param props.activeEpic - The active epic animation event details.
 * @returns The rendered canvas overlay or null.
 */
export function CanvasOverlay({ activeEpic }: { activeEpic: EpicAnimationEvent | null }) {
  if (!activeEpic) return null;

  const { start, end } = activeEpic;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-visible">
      {/* 1. Start Portal (Right edge of source) */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{ 
          scaleY: [0, 1.2, 1], 
          opacity: [0, 1, 0], 
          scaleX: [1, 1.5, 1] 
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ 
          top: start.top + start.height / 2, 
          left: start.left + start.width 
        }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-[6px] h-24 bg-cyan-400 rounded-full shadow-[0_0_20px_4px_rgba(34,211,238,0.7)]"
      />
      
      {/* 2. End Portal (Left edge of target) */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{ 
          scaleY: [0, 1.2, 1], 
          opacity: [0, 1, 0], 
          scaleX: [1, 1.5, 1] 
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ 
          top: end.top + end.height / 2, 
          left: end.left 
        }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-[6px] h-24 bg-amber-500 rounded-full shadow-[0_0_20px_4px_rgba(245,158,11,0.7)]"
      />
    </div>
  );
}
