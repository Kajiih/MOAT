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
  };

  it('should render a list of tiers using real components', () => {
    render(
      <DndContext>
        <TierBoard {...defaultProps} />
      </DndContext>
    );
    
    // We check for the labels which are rendered inside TierLabel inside TierRow
    // TierLabel renders as a div by default (editable on click), so we use getByText.
    expect(screen.getByText('S')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
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
