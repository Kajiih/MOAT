/**
 * @file BoardTitle.tsx
 * @description A shared component for the board title, supporting both editable and export modes.
 * Ensures visual consistency between the main application and the export view.
 * @module BoardTitle
 */

'use client';

import { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface BoardTitleProps {
  /** The current title text */
  title: string;
  /** Whether the component is being rendered for export (non-editable h1) */
  isExport?: boolean;
  /** Callback for title changes (only used if not isExport) */
  onChange?: (newTitle: string) => void;
  /** Callback for when the title gains focus (only used if not isExport) */
  onFocus?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders the board title.
 * In the main application, it's an auto-resizing textarea.
 * In the export board, it's a static h1 with identical styling.
 */
export function BoardTitle({
  title,
  isExport = false,
  onChange,
  onFocus,
  className,
}: BoardTitleProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (!isExport && titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [title, isExport]);

  const baseStyles =
    'text-neutral-200 text-4xl font-black tracking-tighter italic text-center leading-[1.1]';

  if (isExport) {
    return (
      <h1 className={twMerge(baseStyles, 'w-full max-w-[85%]', className)}>
        {title || 'Untitled Tier List'}
      </h1>
    );
  }

  return (
    <textarea
      ref={titleRef}
      value={title}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      placeholder="Tier List Title"
      aria-label="Tier List Title"
      rows={1}
      className={twMerge(
        baseStyles,
        'bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-md resize-none overflow-hidden py-1 px-2 w-full md:w-auto md:min-w-[300px] md:max-w-[600px]',
        className,
      )}
    />
  );
}
