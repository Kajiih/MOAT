/**
 * @file TierSettings.tsx
 * @description A popover menu for configuring a specific tier.
 * Allows changing the tier's color theme and deleting the tier.
 * Handles click-outside detection for auto-closing.
 * @module TierSettings
 */

'use client';

import { useRef, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { TIER_COLORS } from '@/lib/colors';

interface TierSettingsProps {
  color: string;
  onUpdateColor: (colorId: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  isAnyDragging?: boolean;
}

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
          'absolute bottom-1 right-1 p-1 transition-opacity bg-black/20 hover:bg-black/40 rounded text-black',
          isAnyDragging ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/row:opacity-100',
        )}
        title="Tier Settings"
      >
        <Settings size={14} />
      </button>

      {isOpen && (
        <div
          ref={settingsRef}
          className="absolute top-0 left-0 w-[280px] z-50 bg-neutral-900 border border-neutral-700 shadow-2xl rounded-lg p-3 flex flex-col gap-3"
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
            <div className="text-xs text-neutral-500 mb-1">Color</div>
            <div className="flex flex-wrap gap-1">
              {TIER_COLORS.map((c) => (
                <button
                  key={c.id}
                  title={c.label}
                  className={twMerge(
                    'w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform',
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
                className="flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded p-1 text-xs mt-1"
              >
                <Trash2 size={14} /> Delete Tier
              </button>
            )}
            <div className="text-[10px] text-neutral-600 text-center mt-2">
              Tip: Drag the grip handle on the left to reorder
            </div>
          </div>
        </div>
      )}
    </>
  );
}
