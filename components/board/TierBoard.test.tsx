import { DndContext } from '@dnd-kit/core';
import { fireEvent,render, screen } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import { TierListProvider } from '@/components/TierListContext';
import { ToastProvider } from '@/components/ui/ToastProvider';

import { TierBoard } from './TierBoard';

// Mock ResizeObserver for dnd-kit
global.ResizeObserver = class ResizeObserver {
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
        <MediaRegistryProvider>
          <TierListProvider>
            <DndContext>{ui}</DndContext>
          </TierListProvider>
        </MediaRegistryProvider>
      </ToastProvider>,
    );
  };

  it('should render a list of tiers using real components', () => {
    renderWithProviders(<TierBoard {...defaultProps} />);

    const labels = screen.getAllByTestId('tier-row-label');
    expect(labels).toHaveLength(6);
    expect(labels[0].textContent).toBe('S');
    expect(labels[1].textContent).toBe('A');
  });

  it('should call handleAddTier when the button is clicked', () => {
    renderWithProviders(<TierBoard {...defaultProps} />);
    const button = screen.getByText(/Add Tier/i);
    fireEvent.click(button);
    
    // Expect a new tier to be added (default is 6, so now 7)
    const labels = screen.getAllByTestId('tier-row-label');
    expect(labels).toHaveLength(7);
  });
});
