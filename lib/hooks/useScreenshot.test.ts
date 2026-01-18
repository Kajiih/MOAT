import { act,renderHook } from '@testing-library/react';
import download from 'downloadjs';
import { toPng } from 'html-to-image';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { INITIAL_STATE } from '@/lib/initial-state';

import { useScreenshot } from './useScreenshot';

// Mock dependencies
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

vi.mock('downloadjs', () => ({
  default: vi.fn(),
}));

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// Mock react-dom/client for createRoot
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn().mockImplementation((container: HTMLElement) => ({
    render: vi.fn().mockImplementation(() => {
      const div = document.createElement('div');
      div.id = 'export-board-surface';
      div.innerHTML =
        'Mocked Export Board Content with enough length to pass the 50 characters threshold check.';
      Object.defineProperty(div, 'scrollHeight', { value: 800 });
      Object.defineProperty(div, 'offsetHeight', { value: 800 });
      container.appendChild(div);
    }),
    unmount: vi.fn(),
  })),
}));

describe('useScreenshot', () => {
  const mockState = { ...INITIAL_STATE, title: 'Test Board' };
  const mockColors = ['#ff0000'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful screenshot capture', async () => {
    const { result } = renderHook(() => useScreenshot());

    // Patch setTimeout to be immediate for parts of the test
    vi.useFakeTimers();

    await act(async () => {
      const p = result.current.takeScreenshot(mockState, mockColors);
      await vi.advanceTimersByTimeAsync(2000);
      await p;
    });

    expect(toPng).toHaveBeenCalled();
    expect(download).toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);

    vi.useRealTimers();
  });

  it('should handle capture failure gracefully', async () => {
    vi.mocked(toPng).mockRejectedValueOnce(new Error('Capture failed'));
    const { result } = renderHook(() => useScreenshot());

    vi.useFakeTimers();

    await act(async () => {
      const p = result.current.takeScreenshot(mockState, mockColors);
      await vi.advanceTimersByTimeAsync(2000);
      await p;
    });

    expect(result.current.isCapturing).toBe(false);
    vi.useRealTimers();
  });
});
