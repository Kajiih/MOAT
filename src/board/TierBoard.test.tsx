
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TierListProvider } from '@/board/context';
import { ToastProvider } from '@/lib/ui/ToastProvider';

import { TierBoard } from './TierBoard';

// Mock storage to avoid indexedDB errors
vi.mock('@/storage/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockImplementation(() => Promise.resolve()),
    del: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TierBoard', () => {
  const defaultProps = {
    screenshotRef: { current: null },
    isAnyDragging: false,
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ToastProvider>
        <TierListProvider boardId="test-board">
          {ui}
        </TierListProvider>
      </ToastProvider>,
    );
  };

  it('should render a list of tiers using real components', async () => {
    renderWithProviders(<TierBoard {...defaultProps} />);

    await waitFor(() => {
      const labels = screen.getAllByTestId('tier-row-label');
      expect(labels).toHaveLength(6);
      expect(labels[0].textContent).toBe('S');
      expect(labels[1].textContent).toBe('A');
    });
  });

  it('should call handleAddTier when the button is clicked', async () => {
    renderWithProviders(<TierBoard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('tier-row-label')).toHaveLength(6);
    });

    const button = screen.getByText(/Add Tier/i);
    fireEvent.click(button);

    // Expect a new tier to be added (default is 6, so now 7)
    await waitFor(() => {
      const labels = screen.getAllByTestId('tier-row-label');
      expect(labels).toHaveLength(7);
    });
  });
});
