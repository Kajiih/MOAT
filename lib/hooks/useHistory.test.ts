import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useHistory<number>());
    expect(result.current.past).toEqual([]);
    expect(result.current.future).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should push state to history', () => {
    const { result } = renderHook(() => useHistory<number>());
    act(() => {
      result.current.push(1);
    });
    expect(result.current.past).toEqual([1]);
    expect(result.current.canUndo).toBe(true);
  });

  it('should undo state', () => {
    const { result } = renderHook(() => useHistory<number>());
    const setState = vi.fn();

    act(() => {
      result.current.push(1);
      result.current.push(2);
    });

    act(() => {
      result.current.undo(3, setState);
    });

    expect(setState).toHaveBeenCalledWith(2);
    expect(result.current.past).toEqual([1]);
    expect(result.current.future).toEqual([3]);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo state', () => {
    const { result } = renderHook(() => useHistory<number>());
    const setState = vi.fn();

    act(() => {
      result.current.push(1);
      result.current.undo(2, setState);
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo(2, setState);
    });

    expect(setState).toHaveBeenCalledWith(1);
    expect(result.current.past).toEqual([2]);
    expect(result.current.future).toEqual([]);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear history when pushing after undo', () => {
    const { result } = renderHook(() => useHistory<number>());
    const setState = vi.fn();

    act(() => {
      result.current.push(1);
      result.current.undo(2, setState);
    });

    expect(result.current.future).toEqual([2]);

    act(() => {
      result.current.push(3);
    });

    expect(result.current.future).toEqual([]);
  });
});
