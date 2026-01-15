/**
 * @file useEscapeKey.ts
 * @description Custom hook to handle Escape key press events.
 * @module useEscapeKey
 */

import { useEffect } from 'react';

/**
 * Hook that executes a callback when the Escape key is pressed.
 * 
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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback, isListening]);
}
