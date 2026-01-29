/**
 * @file TierHeader.tsx
 * @description Encapsulated header component for a Tier Row.
 * Manages the "Left Column" of the tier, including:
 * - The colored background.
 * - The Label (with inline editing).
 * - The Settings (delete, change color).
 * - Drag handles.
 * Isolating this into a separate component ensures that local state changes (like opening the settings menu)
 * do not trigger a re-render of the entire TierRow (and thus the heavy item grid).
 * @module TierHeader
 */

'use client';

import { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { memo } from 'react';
import { twMerge } from 'tailwind-merge';

import { getColorTheme } from '@/lib/colors';
import { TierDefinition } from '@/lib/types';

import { TierLabel } from './TierLabel';
import { TierSettings } from './TierSettings';

interface TierHeaderProps {
  tier: TierDefinition;
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  onDeleteTier: (id: string) => void;
  canDelete: boolean;
  isAnyDragging?: boolean;
  isExport?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isSettingsOpen: boolean;
  onSettingsOpen: (open: boolean) => void;
}

export const TierHeader = memo(function TierHeader({
  tier,
  onUpdateTier,
  onDeleteTier,
  canDelete,
  isAnyDragging,
  isExport = false,
  dragAttributes,
  dragListeners,
  isSettingsOpen,
  onSettingsOpen,
}: TierHeaderProps) {
  const tierTheme = getColorTheme(tier.color);

  return (
    <div
      className={twMerge(
        'group/row relative flex w-24 shrink-0 flex-col items-center justify-center rounded-l-lg p-2 transition-colors md:w-32',
        tierTheme.bg,
      )}
    >
      <TierLabel
        label={tier.label}
        onUpdate={(newLabel) => onUpdateTier(tier.id, { label: newLabel })}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
        isAnyDragging={isAnyDragging}
        isExport={isExport}
      />

      {!isExport && (
        <TierSettings
          color={tier.color}
          onUpdateColor={(colorId) => onUpdateTier(tier.id, { color: colorId })}
          onDelete={() => onDeleteTier(tier.id)}
          canDelete={canDelete}
          isOpen={isSettingsOpen}
          onToggle={() => onSettingsOpen(!isSettingsOpen)}
          onClose={() => onSettingsOpen(false)}
          isAnyDragging={isAnyDragging}
        />
      )}
    </div>
  );
});
