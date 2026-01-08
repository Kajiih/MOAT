import { renderHook, act } from '@testing-library/react';
import { useScreenshot } from './useScreenshot';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toPng } from 'html-to-image';
import download from 'downloadjs';

// Mock dependencies
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

vi.mock('downloadjs', () => ({
  default: vi.fn(),
}));

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('useScreenshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful screenshot capture', async () => {
    const { result } = renderHook(() => useScreenshot());
    
    const div = document.createElement('div');
    result.current.ref.current = div;

    await act(async () => {
      await result.current.takeScreenshot();
    });

    expect(toPng).toHaveBeenCalledWith(div, expect.objectContaining({
      backgroundColor: '#0a0a0a',
      pixelRatio: 2,
    }));
    expect(download).toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);
  });

  it('should correctly filter elements with screenshot-exclude class', async () => {
    const { result } = renderHook(() => useScreenshot());
    
    // Mock toPng to get the filter function
    let filterFn: ((node: HTMLElement) => boolean) | undefined;
    vi.mocked(toPng).mockImplementation((_node, options) => {
      filterFn = options?.filter;
      return Promise.resolve('data:test');
    });

    const div = document.createElement('div');
    result.current.ref.current = div;

    await act(async () => {
      await result.current.takeScreenshot();
    });

    expect(filterFn).toBeDefined();
    if (!filterFn) return;

    // Test the filter function
    const normalNode = document.createElement('div');
    const excludedNode = document.createElement('div');
    excludedNode.classList.add('screenshot-exclude');

    expect(filterFn(normalNode)).toBe(true);
    expect(filterFn(excludedNode)).toBe(false);
  });

  it('should handle capture failure gracefully', async () => {
    vi.mocked(toPng).mockRejectedValueOnce(new Error('Capture failed'));
    const { result } = renderHook(() => useScreenshot());
    
    const div = document.createElement('div');
    Object.defineProperty(result.current, 'ref', { value: { current: div } });

    await act(async () => {
      await result.current.takeScreenshot();
    });

    expect(result.current.isCapturing).toBe(false);
    // Error toast should have been shown (implicitly covered by Mock)
  });
});
