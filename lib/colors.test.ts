import { describe, it, expect } from 'vitest';
import { getColorTheme, COLOR_PALETTE, DEFAULT_COLOR } from './colors';

describe('colors utilities', () => {
  describe('getColorTheme', () => {
    it('should return correct theme for valid id', () => {
      const theme = getColorTheme('red');
      expect(theme).toBe(COLOR_PALETTE.red);
      expect(theme.hex).toBe('#ef4444');
    });

    it('should return default color for undefined id', () => {
      expect(getColorTheme(undefined)).toBe(DEFAULT_COLOR);
    });

    it('should return default color for invalid id', () => {
      expect(getColorTheme('invalid-color')).toBe(DEFAULT_COLOR);
    });
  });
});
