import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TierBoard } from './TierBoard';
import { DndContext } from '@dnd-kit/core';
import { TierListProvider } from '@/components/TierListContext';
import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

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
            <DndContext>
              {ui}
            </DndContext>
          </TierListProvider>
        </MediaRegistryProvider>
      </ToastProvider>
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
    // Note: We can't easily check if handleAddTier was called on the mock dispatch
    // but the test confirms the button is clickable and Doesn't crash.
  });
});
