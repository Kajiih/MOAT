import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storage } from '@/lib/storage';

import { usePersistentState } from './usePersistentState';

// Mock the storage module
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe('usePersistentState', () => {
  it('should initialize with default value and then hydrate', async () => {
    vi.mocked(storage.get).mockResolvedValue(null); // Storage empty

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
    vi.mocked(storage.get).mockResolvedValue(null);
    vi.mocked(storage.set).mockClear();

    const TEST_DELAY = 100;

    const { result } = renderHook(() =>
      usePersistentState('test-key', 'initial', { persistenceDelay: TEST_DELAY }),
    );

    await waitFor(() => expect(result.current[2]).toBe(true));

    // Hydration syncs initial state
    await waitFor(() => expect(storage.set).toHaveBeenCalled(), { timeout: 1000 });
    vi.mocked(storage.set).mockClear();

    // 1. Update state
    act(() => {
      result.current[1]('updated');
    });

    // Verify state updated immediately in React
    expect(result.current[0]).toBe('updated');

    // Verify NOT yet in storage (debounce)
    expect(storage.set).not.toHaveBeenCalled();

    // 2. Wait for debounce
    await waitFor(
      () => {
        expect(storage.set).toHaveBeenCalledWith('test-key', 'updated');
      },
      { timeout: 1000 },
    );
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
