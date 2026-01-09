import { renderHook, act } from '@testing-library/react';
import { useMediaSearch } from './useMediaSearch';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useSWR from 'swr';
import { useState } from 'react';

// Mock SWR - we need this to track calls
vi.mock('swr', () => ({
  default: vi.fn(),
  preload: vi.fn(),
}));

// Mock persistent state to avoid localstorage issues in tests
vi.mock('./usePersistentState', () => ({
  usePersistentState: vi.fn((_key, initial) => {
    const [state, setState] = useState(initial);
    return [state, setState];
  }),
}));

describe('useMediaSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default return for useSWR
    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: null,
      isLoading: false,
      isValidating: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default active search due to default types', () => {
    const { result } = renderHook(() => useMediaSearch('artist'));
    expect(result.current.query).toBe('');
    // By default it searches for Album/EP types even without query
    expect(useSWR).toHaveBeenCalledWith(
        expect.stringContaining('type=artist'), 
        expect.any(Function), 
        expect.any(Object)
    );
  });

  it('should debounce typing and only trigger search after it timeout', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    
    // Clear initial call
    vi.mocked(useSWR).mockClear();

    // Type "Abbey"
    act(() => {
      result.current.setQuery('Abbey');
    });

    // Advance 150ms - should NOT have triggered searchUrl update with query yet
    act(() => {
      vi.advanceTimersByTime(150);
    });
    
    // Should still be the old URL or not called again if nothing changed except query
    // In our implementation, since query didn't update debouncedQuery, URL hasn't changed.
    const callsAfterType = vi.mocked(useSWR).mock.calls;
    const hasAbbeyEarly = callsAfterType.some(call => (call[0] as string)?.includes('query=Abbey'));
    expect(hasAbbeyEarly).toBe(false);

    // Advance to 350ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now it should be called with Abbey
    expect(useSWR).toHaveBeenCalledWith(expect.stringContaining('query=Abbey'), expect.any(Function), expect.any(Object));
  });

  it('should debounce deleting and only trigger search after it timeout', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    
    // 1. Set initial query and wait for it to settle
    act(() => { result.current.setQuery('Queen'); });
    act(() => { vi.advanceTimersByTime(350); });
    expect(useSWR).toHaveBeenCalledWith(expect.stringContaining('query=Queen'), expect.any(Function), expect.any(Object));
    vi.mocked(useSWR).mockClear();

    // 2. Clear the query (deleting)
    act(() => { result.current.setQuery(''); });
    
    // Advance 150ms - should still have Queen in the active SWR call if we check it
    act(() => { vi.advanceTimersByTime(150); });
    const callsAfterDelete = vi.mocked(useSWR).mock.calls;
    // Actually, SWR isn't called again if the URL doesn't change.
    // Our check should be that it hasn't been called WITH NONE (empty query) yet.
    const hasEmptyQuery = callsAfterDelete.some(call => !(call[0] as string)?.includes('query='));
    expect(hasEmptyQuery).toBe(false);

    // Advance to 350ms
    act(() => { vi.advanceTimersByTime(200); });
    // Now it should be called without the query param
    const finalCalls = vi.mocked(useSWR).mock.calls;
    const hasNoQuery = finalCalls.some(call => !(call[0] as string)?.includes('query='));
    expect(hasNoQuery).toBe(true);
  });

  it('should trigger search IMMEDIATELY when searchNow is called', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    vi.mocked(useSWR).mockClear();

    act(() => {
      result.current.setQuery('Thriller');
    });

    // Immediately call searchNow without waiting
    act(() => {
      result.current.searchNow();
    });

    // Should be triggered now even if timers haven't advanced
    expect(useSWR).toHaveBeenCalledWith(expect.stringContaining('query=Thriller'), expect.any(Function), expect.any(Object));
  });

  it('should reset debounce timer if user continues typing', () => {
    const { result } = renderHook(() => useMediaSearch('album'));
    vi.mocked(useSWR).mockClear();

    act(() => { result.current.setQuery('B'); });
    act(() => { vi.advanceTimersByTime(200); });
    
    act(() => { result.current.setQuery('Bee'); });
    act(() => { vi.advanceTimersByTime(200); });
    
    // Total 400ms passed, but only 200ms since last keystroke. 
    // Should NOT have searched for 'Bee' yet.
    const calls = vi.mocked(useSWR).mock.calls;
    const hasBee = calls.some(call => (call[0] as string)?.includes('query=Bee'));
    expect(hasBee).toBe(false);

    // Wait for the remaining 100ms
    act(() => { vi.advanceTimersByTime(100); });
    expect(useSWR).toHaveBeenCalledWith(expect.stringContaining('query=Bee'), expect.any(Function), expect.any(Object));
  });

  it('should return error when SWR fails with status 503', () => {
    const mockError = new Error('MusicBrainz is busy');
    (mockError as any).status = 503;
    
    // @ts-expect-error - simplified mock for test
    vi.mocked(useSWR).mockReturnValue({
      data: null,
      error: mockError,
      isLoading: false,
      isValidating: false,
    });

    const { result } = renderHook(() => useMediaSearch('album'));
    expect(result.current.error?.status).toBe(503);
  });
});
