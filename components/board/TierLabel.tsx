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

import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { DraggableSyntheticListeners, DraggableAttributes } from '@dnd-kit/core';

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
 */
export function TierLabel(props: TierLabelProps) {
  const { label, onUpdate, dragListeners, dragAttributes, isAnyDragging, isExport = false } = props;
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
          className={twMerge(
            'absolute top-1 left-1 p-1 transition-opacity cursor-grab active:cursor-grabbing text-black/40 hover:text-black',
            isAnyDragging
              ? 'opacity-0 pointer-events-none'
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
          className="w-full h-full bg-white/20 text-black placeholder-black/50 text-center font-bold rounded resize-none focus:outline-none text-sm p-1 overflow-hidden"
          style={{ minHeight: '60px' }}
        />
      ) : (
        <div
          data-testid="tier-row-label"
          onDoubleClick={!isExport ? handleDoubleClick : undefined}
          className={twMerge(
            'w-full h-full flex items-center justify-center text-center font-black text-black select-none transition-colors break-words overflow-hidden',
            !isExport && 'cursor-pointer hover:bg-black/5 rounded',
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
