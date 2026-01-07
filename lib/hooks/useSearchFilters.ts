import { useCallback } from 'react';
import { MediaType } from '@/lib/types';
import { usePersistentState } from './usePersistentState';

/**
 * Custom hook to manage the UI state of search filters.
 */
export function useSearchFilters(type: MediaType) {
  const [showFilters, setShowFilters] = usePersistentState<boolean>(`moat-search-ui-${type}-showFilters`, false);
  
  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, [setShowFilters]);

  return {
    showFilters,
    setShowFilters,
    toggleFilters
  };
}
