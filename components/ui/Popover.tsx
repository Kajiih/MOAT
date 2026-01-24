/**
 * @file Popover.tsx
 * @description A reusable dropdown/popover component that manages visibility,
 * click-outside detection, and Escape key handling.
 */

'use client';

import React, { useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface PopoverProps {
  /** The element that triggers the popover. */
  trigger: React.ReactNode;
  /** The content to display inside the popover. */
  children: React.ReactNode;
  /** Optional class name for the content container. */
  contentClassName?: string;
  /** Optional class name for the root container. */
  className?: string;
  /** External control for visibility. */
  isOpen?: boolean;
  /** Callback for visibility changes. */
  onOpenChange?: (open: boolean) => void;
  /** Whether to close the popover when the content is clicked. */
  closeOnContentClick?: boolean;
  /** Whether to disable the trigger. */
  disabled?: boolean;
}

/**
 * A reusable popover component.
 * @param props - Component props.
 * @param props.trigger - The element that triggers the popover.
 * @param props.children - The content to display inside the popover.
 * @param props.contentClassName - Optional class name for the content container.
 * @param props.className - Optional class name for the root container.
 * @param props.isOpen - External control for visibility.
 * @param props.onOpenChange - Callback for visibility changes.
 * @param props.closeOnContentClick - Whether to close the popover when the content is clicked.
 * @param props.disabled - Whether to disable the trigger.
 * @returns The rendered popover.
 */
export function Popover({
  trigger,
  children,
  contentClassName,
  className,
  isOpen: controlledIsOpen,
  onOpenChange,
  closeOnContentClick = false,
  disabled = false,
}: PopoverProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(value);
    }
    onOpenChange?.(value);
  };

  const toggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const close = () => setIsOpen(false);

  useEscapeKey(close, isOpen);
  useClickOutside(containerRef, close, isOpen);

  return (
    <div className={twMerge('relative inline-block', className)} ref={containerRef}>
      <div onClick={toggle} className="inline-block outline-none cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={twMerge(
            'absolute z-50 mt-2',
            contentClassName
          )}
          onClick={closeOnContentClick ? close : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}
