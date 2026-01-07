import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TierBoard } from './TierBoard';
import { TierListState } from '@/lib/types';

// Mock child components to isolate TierBoard logic
vi.mock('@/components/TierRow', () => ({
  TierRow: ({ tier }: { tier: { label: string } }) => (
    <div data-testid="tier-row">{tier.label}</div>
  ),
}));

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

  it('should render a list of tiers', () => {
    render(<TierBoard {...defaultProps} />);
    const rows = screen.getAllByTestId('tier-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toBe('S');
    expect(rows[1].textContent).toBe('A');
  });

  it('should call handleAddTier when the button is clicked', () => {
    render(<TierBoard {...defaultProps} />);
    const button = screen.getByText(/Add Tier/i);
    fireEvent.click(button);
    expect(mockHandleAddTier).toHaveBeenCalledTimes(1);
  });
});
