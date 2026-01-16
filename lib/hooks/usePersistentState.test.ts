import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storage } from '@/lib/storage';

// Mock the storage module
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe('usePersistentState', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default value and then hydrate', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined); // Storage empty

    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    
    // Initial render is default
    expect(result.current[0]).toBe('default');
    expect(result.current[2]).toBe(false); // isHydrated false

    // Wait for hydration
    await waitFor(() => {
        expect(result.current[2]).toBe(true);
    });
    
    expect(storage.get).toHaveBeenCalledWith('test-key');
    expect(result.current[0]).toBe('default');
  });

  it('should hydrate with value from storage', async () => {
    vi.mocked(storage.get).mockResolvedValue('stored-value');

    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    
    expect(result.current[0]).toBe('default');

    await waitFor(() => {
        expect(result.current[2]).toBe(true);
    });

    expect(result.current[0]).toBe('stored-value');
  });

  it('should persist state changes to storage after debounce', async () => {
    vi.mocked(storage.get).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));

    await waitFor(() => expect(result.current[2]).toBe(true));

    // Clear initial sync save
    vi.mocked(storage.set).mockClear();

    // Enable fake timers AFTER hydration to avoid messing with waitFor/Promises during setup
    vi.useFakeTimers();

    // 1. Update state
    act(() => {
      result.current[1]('updated');
    });

    // Verify state updated immediately in React
    expect(result.current[0]).toBe('updated');
    
    // Verify NOT yet in storage (debounce)
    expect(storage.set).not.toHaveBeenCalled();

    // 2. Advance time
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // 3. Verify in storage
    expect(storage.set).toHaveBeenCalledWith('test-key', 'updated');
  });

  it('should handle storage errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(storage.get).mockRejectedValue(new Error('Storage failure'));

    const { result } = renderHook(() => usePersistentState('test-key', 'default'));

    await waitFor(() => expect(result.current[2]).toBe(true));

    expect(result.current[0]).toBe('default');
    consoleSpy.mockRestore();
  });
});

  