/**
 * @file useEscapeKey.ts
 * @description Hook that executes a callback when the Escape key is pressed.
 * Useful for closing modals, clearing selections, or canceling actions.
 * @module useEscapeKey
 */

'use client';

import { useEffect } from 'react';

/**
 * Hook that executes a callback when the Escape key is pressed.
 * @param callback - Function to call on Escape key press.
 * @param isListening - Whether the listener should be active. Defaults to true.
 */
export function useEscapeKey(callback: () => void, isListening: boolean = true) {
  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, isListening]);
}
