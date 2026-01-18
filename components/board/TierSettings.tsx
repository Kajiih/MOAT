/**
 * @file TierSettings.tsx
 * @description A popover menu for configuring a specific tier.
 * Allows changing the tier's color theme and deleting the tier.
 * Handles click-outside detection for auto-closing.
 * @module TierSettings
 */

'use client';

import { Settings, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { TIER_COLORS } from '@/lib/colors';

/**
 * Props for the TierSettings component.
 */
interface TierSettingsProps {
  /** The current color ID of the tier. */
  color: string;
  /** Callback fired when a new color is selected. */
  onUpdateColor: (colorId: string) => void;
  /** Callback fired to delete the tier. */
  onDelete: () => void;
  /** Whether the tier can be deleted in the current context. */
  canDelete: boolean;
  /** Whether the settings popover is currently open. */
  isOpen: boolean;
  /** Toggles the popover open/closed. */
  onToggle: () => void;
  /** Forces the popover to close. */
  onClose: () => void;
  /** Global dragging state. */
  isAnyDragging?: boolean;
}

/**
 * Renders a settings popover for a tier row, allowing color selection and deletion.
 */
export function TierSettings({
  color,
  onUpdateColor,
  onDelete,
  canDelete,
  isOpen,
  onToggle,
  onClose,
  isAnyDragging,
}: TierSettingsProps) {
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <>
      <button
        onClick={onToggle}
        className={twMerge(
          'absolute right-1 bottom-1 rounded bg-black/20 p-1 text-black transition-opacity hover:bg-black/40',
          isAnyDragging ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/row:opacity-100',
        )}
        title="Tier Settings"
      >
        <Settings size={14} />
      </button>

      {isOpen && (
        <div
          ref={settingsRef}
          className="absolute top-0 left-0 z-50 flex w-[280px] flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-2xl"
          style={{ transform: 'translate(10px, 10px)' }}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase">Tier Settings</span>
            <button onClick={onClose} className="text-neutral-500 hover:text-white">
              ✕
            </button>
          </div>

          {/* Colors */}
          <div>
            <div className="mb-1 text-xs text-neutral-500">Color</div>
            <div className="flex flex-wrap gap-1">
              {TIER_COLORS.map((c) => (
                <button
                  key={c.id}
                  title={c.label}
                  className={twMerge(
                    'h-6 w-6 rounded-full border border-transparent transition-transform hover:scale-110',
                    c.bg,
                    color === c.id && 'border-white ring-1 ring-white',
                  )}
                  onClick={() => onUpdateColor(c.id)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm('Delete tier?')) onDelete();
                }}
                className="mt-1 flex items-center justify-center gap-2 rounded bg-red-900/30 p-1 text-xs text-red-200 hover:bg-red-900/50"
              >
                <Trash2 size={14} /> Delete Tier
              </button>
            )}
            <div className="mt-2 text-center text-[10px] text-neutral-600">
              Tip: Drag the grip handle on the left to reorder
            </div>
          </div>
        </div>
      )}
    </>
  );
}
