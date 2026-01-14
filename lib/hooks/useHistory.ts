import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  future: T[];
}

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
