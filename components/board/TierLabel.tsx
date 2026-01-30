/**
 * @file TierLabel.tsx
 * @description The interactive header for a Tier Row.
 * Features:
 * - Double-click to rename the tier.
 * - Drag handle for reordering tiers.
 * - Dynamic text sizing based on label length.
 * @module TierLabel
 */

'use client';

import { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Props for the TierLabel component.
 */
interface TierLabelProps {
  /** The current text of the tier label. */
  label: string;
  /** Callback fired when the label is renamed. */
  onUpdate: (newLabel: string) => void;
  /** Synthetic listeners from dnd-kit for tier reordering. */
  dragListeners?: DraggableSyntheticListeners;
  /** Draggable attributes from dnd-kit for tier reordering. */
  dragAttributes?: DraggableAttributes;
  /** Global dragging state. */
  isAnyDragging?: boolean;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
}

/**
 * Renders the label of a tier row, supporting inline editing and drag handling.
 * Automatically scales font size based on the length of the label.
 * @param props - The props for the component.
 * @param props.label - The current text of the tier label.
 * @param props.onUpdate - Callback fired when the label is renamed.
 * @param props.dragListeners - Synthetic listeners from dnd-kit for tier reordering.
 * @param props.dragAttributes - Draggable attributes from dnd-kit for tier reordering.
 * @param props.isAnyDragging - Global dragging state.
 * @param props.isExport - Whether the component is being rendered for a screenshot export.
 * @returns The rendered TierLabel component.
 */
export function TierLabel({
  label,
  onUpdate,
  dragListeners,
  dragAttributes,
  isAnyDragging,
  isExport = false,
}: TierLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(label);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setInputValue(label);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== label) {
      onUpdate(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <>
      {/* Drag Handle */}
      {!isExport && (
        <div
          {...dragAttributes}
          {...dragListeners}
          data-testid="tier-row-drag-handle"
          className={twMerge(
            'absolute top-1 left-1 cursor-grab p-1 text-black/40 transition-opacity hover:text-black active:cursor-grabbing',
            isAnyDragging
              ? 'pointer-events-none opacity-0'
              : 'opacity-0 group-hover/row:opacity-100',
          )}
        >
          <GripVertical size={16} />
        </div>
      )}

      {isEditing && !isExport ? (
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-full w-full resize-none overflow-hidden rounded bg-white/20 p-1 text-center text-sm font-bold text-black placeholder-black/50 focus:outline-none"
          style={{ minHeight: '60px' }}
        />
      ) : (
        <div
          data-testid="tier-row-label"
          onDoubleClick={!isExport ? handleDoubleClick : undefined}
          className={twMerge(
            'flex h-full w-full items-center justify-center overflow-hidden text-center font-black break-words text-black transition-colors select-none',
            !isExport && 'cursor-pointer rounded hover:bg-black/5',
          )}
          title={!isExport ? 'Double click to rename' : undefined}
          style={{ fontSize: label.length > 5 ? '1rem' : '1.75rem', lineHeight: '1.1' }}
        >
          {label}
        </div>
      )}
    </>
  );
}
