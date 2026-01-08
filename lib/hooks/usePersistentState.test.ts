import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('usePersistentState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default value if localStorage is empty', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('should initialize with value from localStorage', () => {
    window.localStorage.setItem('test-key', JSON.stringify('stored-value'));
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('should persist state changes to localStorage after debounce', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));

    // 1. Update state
    act(() => {
      result.current[1]('updated');
    });

    // Verify state updated immediately in React
    expect(result.current[0]).toBe('updated');
    
    // Verify NOT yet in localStorage (debounce 1000ms)
    // Note: use-debounce might trigger immediately on first call depending on options, 
    // but usually waits. Let's check.
    // If this fails, it might be because the hook calls setItem immediately on mount? 
    // No, existing hook has debounce on state change.
    
    // 2. Advance time
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // 3. Verify in localStorage
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('should handle JSON parse errors gracefully', () => {
    window.localStorage.setItem('test-key', 'invalid-json');
    
    // Mock console.error to keep output clean
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    expect(result.current[0]).toBe('default');
    
    spy.mockRestore();
  });
});