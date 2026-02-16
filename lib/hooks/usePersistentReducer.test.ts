import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storage } from '@/lib/storage';

import { usePersistentReducer } from './usePersistentReducer';

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Simple reducer for testing
const testReducer = (state: { count: number }, action: { type: 'increment' }) => {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    default:
      return state;
  }
};

describe('usePersistentReducer', () => {
  it('should initialize with initialState and hydrate from storage', async () => {
    // Mock storage return value for hydration
    const storedState = { count: 10 };
    vi.mocked(storage.get).mockResolvedValue(storedState);

    const { result } = renderHook(() =>
      usePersistentReducer(testReducer, { count: 0 }, 'test-reducer-key'),
    );

    // Initial state before hydration
    expect(result.current[0]).toEqual({ count: 0 });
    expect(result.current[2]).toBe(false); // isHydrated

    // Wait for hydration effect
    await waitFor(() => {
      expect(result.current[2]).toBe(true);
    });

    // Should now reflect stored state
    expect(result.current[0]).toEqual(storedState);
    expect(storage.get).toHaveBeenCalledWith('test-reducer-key');
  });

  it('should persist state changes after debounce', async () => {
    vi.mocked(storage.get).mockResolvedValue(null);
    vi.mocked(storage.set).mockClear();

    // Use a short delay for testing
    const TEST_DELAY = 100;

    const { result } = renderHook(() =>
      usePersistentReducer(testReducer, { count: 0 }, 'test-reducer-key', {
        persistenceDelay: TEST_DELAY,
      }),
    );

    // Wait for hydration
    await waitFor(() => {
      expect(result.current[2]).toBe(true);
    });

    // Hydration triggers a save of initial state (since it wasn't in DB)
    // We wait for that first save to happen or clear it
    await waitFor(() => expect(storage.set).toHaveBeenCalled(), { timeout: 1000 });
    vi.mocked(storage.set).mockClear();

    // Dispatch an action
    act(() => {
      result.current[1]({ type: 'increment' });
    });

    // State should update immediately in React
    expect(result.current[0]).toEqual({ count: 1 });

    // Should NOT have called immediately
    expect(storage.set).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(storage.set).toHaveBeenCalledWith('test-reducer-key', { count: 1 });
      },
      { timeout: 1000 },
    );
  });

  it('should NOT persist state before hydration completes', async () => {
    // Simulate slow storage read
    let resolveStorage: (val: any) => void;
    const storagePromise = new Promise((resolve) => {
      resolveStorage = resolve;
    });
    vi.mocked(storage.get).mockReturnValue(storagePromise as any);
    vi.mocked(storage.set).mockClear();

    const { result } = renderHook(() =>
      usePersistentReducer(testReducer, { count: 0 }, 'test-reducer-key', {
        persistenceDelay: 50,
      }),
    );

    // Not hydrated yet
    expect(result.current[2]).toBe(false);

    // Dispatch action while hydrating
    act(() => {
      result.current[1]({ type: 'increment' });
    });

    expect(result.current[0]).toEqual({ count: 1 });

    // Wait a bit - longer than delay
    await new Promise((r) => setTimeout(r, 100));

    // Should NOT invoke storage.set because !isHydrated
    expect(storage.set).not.toHaveBeenCalled();

    // Now finish hydration
    await act(async () => {
      resolveStorage(null);
    });

    await waitFor(() => {
      expect(result.current[2]).toBe(true);
    });
  });
});
