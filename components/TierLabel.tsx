'use client';

import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { DraggableSyntheticListeners, DraggableAttributes } from '@dnd-kit/core';

interface TierLabelProps {
  label: string;
  onUpdate: (newLabel: string) => void;
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: DraggableAttributes;
  isAnyDragging?: boolean;
}

export function TierLabel({
  label,
  onUpdate,
  dragListeners,
  dragAttributes,
  isAnyDragging
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
      <div
          {...dragAttributes}
          {...dragListeners}
          className={twMerge(
              "absolute top-1 left-1 p-1 transition-opacity cursor-grab active:cursor-grabbing text-black/40 hover:text-black",
              isAnyDragging ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/row:opacity-100"
          )}
      >
          <GripVertical size={16} />
      </div>

      {isEditing ? (
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
              onDoubleClick={handleDoubleClick}
              className="w-full h-full flex items-center justify-center text-center font-black text-black select-none cursor-pointer hover:bg-black/5 rounded transition-colors break-words overflow-hidden"
              title="Double click to rename"
              style={{ fontSize: label.length > 5 ? '1rem' : '1.75rem', lineHeight: '1.1' }}
          >
              {label}
          </div>
      )}
    </>
  );
}
