import { renderHook } from '@testing-library/react';
import { useBrandColors } from './useBrandColors';
import { describe, it, expect } from 'vitest';

describe('useBrandColors', () => {
  it('should return 4 colors even with empty input', () => {
    const { result } = renderHook(() => useBrandColors([]));
    expect(result.current).toHaveLength(4);
    // Should use defaults (red, orange, amber, green)
    expect(result.current).toEqual(['#ef4444', '#f97316', '#fbbf24', '#22c55e']);
  });


  it('should handle single color input', () => {
    const { result } = renderHook(() => useBrandColors(['green']));
    expect(result.current).toEqual(['#22c55e', undefined, undefined, undefined]);
  });

  it('should use first 4 if more than 4 are provided', () => {
    const { result } = renderHook(() => useBrandColors(['red', 'orange', 'amber', 'green', 'blue']));
    expect(result.current).toEqual(['#ef4444', '#f97316', '#fbbf24', '#22c55e']);
  });

  it('should handle undefined sourceColors', () => {
    // @ts-expect-error - testing runtime resilience
    const { result } = renderHook(() => useBrandColors(undefined));
    expect(result.current).toHaveLength(4);
    expect(result.current[0]).toBe('#ef4444'); // First default
  });
});
