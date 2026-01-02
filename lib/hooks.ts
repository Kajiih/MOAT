import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import useSWR, { preload } from 'swr';
import { getSearchUrl } from '@/lib/api';
import { MediaType, MediaItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMediaSearch(type: MediaType) {
  const [query, setQuery] = useState('');
  const [artistId, setArtistId] = useState<string | undefined>(undefined);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [page, setPage] = useState(1);

  // Debounce text inputs to avoid excessive API calls
  const [debouncedQuery] = useDebounce(query, 500);
  const [debouncedMinYear] = useDebounce(minYear, 500);
  const [debouncedMaxYear] = useDebounce(maxYear, 500);
  
  // Wrappers to reset page on filter change
  const handleSetQuery = (val: string) => { setQuery(val); setPage(1); };
  const handleSetArtistId = (val: string | undefined) => { setArtistId(val); setPage(1); };
  const handleSetMinYear = (val: string) => { setMinYear(val); setPage(1); };
  const handleSetMaxYear = (val: string) => { setMaxYear(val); setPage(1); };

  const reset = () => {
    setQuery('');
    setArtistId(undefined);
    setMinYear('');
    setMaxYear('');
    setPage(1);
  };

  const searchUrl = useMemo(() => {
    const hasFilters = debouncedQuery || artistId || debouncedMinYear || debouncedMaxYear;
    if (!hasFilters) return null;

    return getSearchUrl({
      type,
      page,
      query: debouncedQuery,
      artistId,
      minYear: debouncedMinYear,
      maxYear: debouncedMaxYear
    });
  }, [type, page, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear]);

  const { data, isLoading, isValidating } = useSWR<{ results: MediaItem[], page: number, totalPages: number }>(
    searchUrl,
    fetcher,
    { keepPreviousData: true }
  );
  
  // Pagination Prefetching
  useEffect(() => {
      if (data && page < data.totalPages) {
          const nextUrl = getSearchUrl({
            type,
            page: page + 1,
            query: debouncedQuery,
            artistId,
            minYear: debouncedMinYear,
            maxYear: debouncedMaxYear
          });
          preload(nextUrl, fetcher);
      }
  }, [data, page, type, debouncedQuery, artistId, debouncedMinYear, debouncedMaxYear]);

  return {
    // State
    query, setQuery: handleSetQuery,
    artistId, setArtistId: handleSetArtistId,
    minYear, setMinYear: handleSetMinYear,
    maxYear, setMaxYear: handleSetMaxYear,
    page, setPage,
    reset,
    
    // Data
    results: data?.results || [],
    totalPages: data?.totalPages || 0,
    isLoading,
    isValidating
  };
}
