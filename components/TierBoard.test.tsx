import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TierBoard } from './TierBoard';
import { TierListState } from '@/lib/types';
import { DndContext } from '@dnd-kit/core';

// Mock ResizeObserver for dnd-kit
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TierBoard', () => {
  const mockState: TierListState = {
    tierDefs: [
      { id: '1', label: 'S', color: 'red' },
      { id: '2', label: 'A', color: 'blue' },
    ],
    items: { '1': [], '2': [] },
  };

  const mockHandleAddTier = vi.fn();
  const defaultProps = {
    state: mockState,
    screenshotRef: { current: null },
    handleAddTier: mockHandleAddTier,
    handleUpdateTier: vi.fn(),
    handleDeleteTier: vi.fn(),
    removeItemFromTier: vi.fn(),
    handleShowDetails: vi.fn(),
    isAnyDragging: false,
    colors: mockState.tierDefs.map(t => t.color),
  };

  it('should render a list of tiers using real components', () => {
    render(
      <DndContext>
        <TierBoard {...defaultProps} />
      </DndContext>
    );
    
    // Check for labels using data-testid to avoid conflict with logo text
    const labels = screen.getAllByTestId('tier-row-label');
    expect(labels).toHaveLength(2);
    expect(labels[0].textContent).toBe('S');
    expect(labels[1].textContent).toBe('A');
  });

  it('should call handleAddTier when the button is clicked', () => {
    render(
      <DndContext>
        <TierBoard {...defaultProps} />
      </DndContext>
    );
    const button = screen.getByText(/Add Tier/i);
    fireEvent.click(button);
    expect(mockHandleAddTier).toHaveBeenCalledTimes(1);
  });
});
