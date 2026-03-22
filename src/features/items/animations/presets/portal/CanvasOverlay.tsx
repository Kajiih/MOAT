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
  const PORTAL_DURATION = 1.2; 
  const TRAVEL_DURATION = 0.6;
  const TRAVEL_DELAY = 0.3;

  // 1. Calculate Traversal Direction Vector
  const deltaX = end.left - start.left;
  const deltaY = end.top - start.top;
  const travelX = deltaX;
  const travelY = deltaY;

  let direction: 'right' | 'left' | 'down' | 'up' = 'right';
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    direction = deltaX >= 0 ? 'right' : 'left';
  } else {
    direction = deltaY >= 0 ? 'down' : 'up';
  }

  // 2. Resolve Portal Styles & Anchor Coordinates
  let startPortalStyle: React.CSSProperties = {};
  let endPortalStyle: React.CSSProperties = {};

  if (direction === 'right') {
    startPortalStyle = { top: start.top + start.height / 2, left: start.left + start.width };
    endPortalStyle = { top: end.top + end.height / 2, left: end.left };
  } else if (direction === 'left') {
    startPortalStyle = { top: start.top + start.height / 2, left: start.left };
    endPortalStyle = { top: end.top + end.height / 2, left: end.left + end.width };
  } else if (direction === 'down') {
    startPortalStyle = { top: start.top + start.height, left: start.left + start.width / 2 };
    endPortalStyle = { top: end.top, left: end.left + end.width / 2 };
  } else if (direction === 'up') {
    startPortalStyle = { top: start.top, left: start.left + start.width / 2 };
    endPortalStyle = { top: end.top + end.height, left: end.left + end.width / 2 };
  }

  // 3. Resolve Traveling Card Clone Keyframes
  let animateProps: any = {};
  if (direction === 'right') {
    animateProps = {
      x: [0, 40, travelX - 40, travelX, travelX],
      y: [0, 0, travelY, travelY, travelY],
      scaleX: [1, 0, 0, 1, 1],
      scaleY: [1, 0.8, 0.8, 1, 1],
    };
  } else if (direction === 'left') {
    animateProps = {
      x: [0, -40, travelX + 40, travelX, travelX],
      y: [0, 0, travelY, travelY, travelY],
      scaleX: [1, 0, 0, 1, 1],
      scaleY: [1, 0.8, 0.8, 1, 1],
    };
  } else if (direction === 'down') {
    animateProps = {
      x: [0, 0, travelX, travelX, travelX],
      y: [0, 40, travelY - 40, travelY, travelY],
      scaleX: [1, 0.8, 0.8, 1, 1],
      scaleY: [1, 0, 0, 1, 1],
    };
  } else if (direction === 'up') {
    animateProps = {
      x: [0, 0, travelX, travelX, travelX],
      y: [0, -40, travelY + 40, travelY, travelY],
      scaleX: [1, 0.8, 0.8, 1, 1], // squeeze opposite axis
      scaleY: [1, 0, 0, 1, 1],
    };
  }

  const portalBaseClass = "absolute -translate-x-1/2 -translate-y-1/2 rounded-full";
  const portalOrientationClass = direction === 'right' || direction === 'left' 
    ? "h-24 w-[6px]" 
    : "w-24 h-[6px]";

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-visible">
      {/* 1. Start Portal */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{
          scaleY: [0, 1.2, 1, 0],
          opacity: [0, 1, 1, 0],
          scaleX: [1, 1.5, 1, 1],
        }}
        transition={{ duration: 0.8, ease: 'easeOut', times: [0, 0.25, 0.6, 1] }}
        style={startPortalStyle}
        className={`${portalBaseClass} ${portalOrientationClass} bg-cyan-400 shadow-[0_0_20px_4px_rgba(34,211,238,0.7)]`}
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
          ...animateProps,
          opacity: [1, 1, 1, 1, 0],
        }}
        transition={{
          duration: TRAVEL_DURATION + 0.2,
          delay: TRAVEL_DELAY,
          times: [0, 0.15, 0.5, 0.85, 1], 
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
        <div className="bg-surface shadow-card absolute inset-1 overflow-hidden rounded-md">
          <ItemImage item={activeEpic.item} TypeIcon={Info} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-end">
            <p className="text-caption font-bold text-white line-clamp-1">
              {activeEpic.item.title}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 3. End Portal */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, scaleX: 1 }}
        animate={{
          scaleY: [0, 0, 1.2, 1, 0],
          opacity: [0, 0, 1, 1, 0],
          scaleX: [1, 1, 1.5, 1, 1],
        }}
        transition={{
          duration: PORTAL_DURATION,
          ease: 'easeOut',
          times: [0, 0.5, 0.65, 0.85, 1],
        }}
        style={endPortalStyle}
        className={`${portalBaseClass} ${portalOrientationClass} bg-amber-500 shadow-[0_0_20px_4px_rgba(245,158,11,0.7)]`}
      />
    </div>
  );
}
