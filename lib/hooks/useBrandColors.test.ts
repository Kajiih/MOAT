import { renderHook } from '@testing-library/react';
import { useBrandColors } from './useBrandColors';
import { describe, it, expect } from 'vitest';

describe('useBrandColors', () => {
  it('should return all undefined for empty input (hiding logo)', () => {
    const { result } = renderHook(() => useBrandColors([]));
    expect(result.current).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('should handle single color input', () => {
    const { result } = renderHook(() => useBrandColors(['green']));
    expect(result.current).toEqual(['#22c55e', undefined, undefined, undefined]);
  });

  it('should use first 4 if more than 4 are provided', () => {
    const { result } = renderHook(() => useBrandColors(['red', 'orange', 'amber', 'green', 'blue']));
    expect(result.current).toEqual(['#ef4444', '#f97316', '#fbbf24', '#22c55e']);
  });
});
