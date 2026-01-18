import { renderHook } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

import { useBrandColors } from './useBrandColors';

describe('useBrandColors', () => {
  it('should return all undefined for empty input (hiding logo)', () => {
    const { result } = renderHook(() => useBrandColors([]));
    expect(result.current).toEqual([]);
  });

  it('should handle single color input', () => {
    const { result } = renderHook(() => useBrandColors(['green']));
    expect(result.current).toEqual(['#22c55e']);
  });

  it('should use first 5 if more than 5 are provided', () => {
    const { result } = renderHook(() =>
      useBrandColors(['red', 'orange', 'amber', 'green', 'blue', 'purple']),
    );
    expect(result.current).toEqual(['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#3b82f6']);
  });
});
