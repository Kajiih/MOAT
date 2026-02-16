/**
 * @file useDebouncedEffect.ts
 * @description A custom hook that combines useEffect with useDebouncedCallback.
 * It ensures that the side effect is debounced and automatically flushed on unmount.
 * @module useDebouncedEffect
 */

'use client';

import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * Executes a debounced side effect when dependencies change.
 * Automatically flushes the effect on unmount.
 * @param callback - The function to execute (debounced).
 * @param delay - The debounce delay in milliseconds.
 * @param deps - The dependency array.
 * @returns The debounced callback function.
 */
export function useDebouncedEffect(
  callback: () => void,
  delay: number,
  deps: React.DependencyList,
) {
  const debouncedCallback = useDebouncedCallback(callback, delay);

  // Trigger the debounced callback whenever dependencies change
  useEffect(() => {
    debouncedCallback();
  }, [debouncedCallback, ...deps]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.flush();
    };
  }, [debouncedCallback]);

  return debouncedCallback;
}
