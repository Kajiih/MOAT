/**
 * @file FilterPrimitives.tsx
 * @description Layout primitives and shared styles for the filter system.
 * Ensures consistent spacing and responsive behavior (Grid vs Flex) for all filter components.
 * @module FilterPrimitives
 */

import { ReactNode } from 'react';

export const FILTER_INPUT_STYLES =
  'w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]';

interface FilterRowProps {
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * A layout primitive that switches between a Grid (full) and Flex (compact) layout.
 * Use with FilterCol to ensure children behave correctly in both modes.
 */
export function FilterRow({ compact, children, className = '' }: FilterRowProps) {
  if (compact) {
    return <div className={`flex gap-2 ${className}`}>{children}</div>;
  }
  return <div className={`grid grid-cols-2 gap-2 ${className}`}>{children}</div>;
}

interface FilterColProps {
  children: ReactNode;
  className?: string;
}

/**
 * A column wrapper that ensures content expands in Flex mode (compact)
 * and behaves normally in Grid mode.
 */
export function FilterCol({ children, className = '' }: FilterColProps) {
  return <div className={`min-w-0 flex-1 ${className}`}>{children}</div>;
}
