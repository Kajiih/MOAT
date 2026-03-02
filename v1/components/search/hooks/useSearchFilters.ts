/**
 * @file useSearchFilters.ts
 * @description A simple hook to manage the visibility state of the expanded filters section
 * within the Search Panel. Persists the state per media type (Album/Artist/Song).
 * @module useSearchFilters
 */

import { useCallback } from 'react';

import { usePersistentState } from '@/lib/hooks';
import { MediaType } from '@/lib/types';

/**
 * Custom hook to manage the UI state of search filters.
 * @param type - The type of media being searched.
 * @returns An object containing the visibility state and toggle function for the filters.
 */
export function useSearchFilters(type: MediaType) {
  const [showFilters, setShowFilters] = usePersistentState<boolean>(
    `moat-search-ui-${type}-showFilters`,
    false,
  );

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, [setShowFilters]);

  return {
    showFilters,
    setShowFilters,
    toggleFilters,
  };
}
