/**
 * @file DropIndicator.tsx
 * @description Single source of truth for drag-and-drop placement feedback outlines.
 */

import { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import React from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Props for the DropIndicator component.
 */
interface DropIndicatorProps {
  /** The edge to align coordinates onto ('left' or 'right'). */
  edge?: Edge | null;
  /** Optional class overrides for the outer absolute sizing layer. */
  className?: string;
}

/**
 * Single source of truth for drag-and-drop insertion visual indicators.
 * @param props - Component props.
 * @param props.edge - The edge to align coordinates onto ('left' or 'right').
 * @param props.className - Optional class overrides for the outer absolute sizing layer.
 * @returns React Element layout.
 */
export function DropIndicator({ edge, className }: DropIndicatorProps) {
  return (
    <div
      data-testid="drop-indicator"
      className={twMerge(
        'absolute top-1 bottom-1 z-50 w-[3px] rounded-full bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.400)]',
        edge === 'left' && 'left-0 -translate-x-1/2',
        edge === 'right' && 'right-0 translate-x-1/2',
        className,
      )}
    />
  );
}
