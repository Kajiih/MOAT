/**
 * @file useHistory.ts
 * @description Generic hook for managing undo/redo history for any state.
 * Maintains past, present, and future stacks.
 * @module useHistory
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * Interface defining the structure of the history state.
 * @template T - The type of the state being tracked.
 */
interface HistoryState<T> {
  past: T[];
  future: T[];
}

/**
 * Custom hook to manage state history for Undo/Redo functionality.
 *
 * Maintains two stacks: `past` and `future`.
 * - `push`: Saves the current state to `past` and clears `future`.
 * - `undo`: Moves current state to `future` and restores the last state from `past`.
 * - `redo`: Moves current state to `past` and restores the next state from `future`.
 *
 * @template T - The type of the state object.
 */
export function useHistory<T>() {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    future: [],
  });

  const push = useCallback((currentState: T) => {
    setHistory((prev) => ({
      past: [...prev.past, currentState],
      future: [],
    }));
  }, []);

  const undo = useCallback((currentState: T, setState: (state: T) => void) => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      setState(previous);

      return {
        past: newPast,
        future: [currentState, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback((currentState: T, setState: (state: T) => void) => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      setState(next);

      return {
        past: [...prev.past, currentState],
        future: newFuture,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setHistory({ past: [], future: [] });
  }, []);

  return {
    past: history.past,
    future: history.future,
    push,
    undo,
    redo,
    clear,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
