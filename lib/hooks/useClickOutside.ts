/**
 * @file useClickOutside.ts
 * @description Hook that executes a callback when a click occurs outside the specified element ref.
 * Useful for closing dropdowns, popovers, and menus.
 */

'use client';

import { useEffect } from 'react';

/**
 * Hook that executes a callback when a click occurs outside the specified element ref.
 * @param ref - The React ref of the element to watch.
 * @param callback - Function to call on outside click.
 * @param isActive - Whether the listener should be active. Defaults to true.
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback, isActive]);
}
