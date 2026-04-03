import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storage } from '@/infra/storage/storage';
import { createPopulatedBoardScenario } from '@/test/factories';
import { simulateElementDrop } from '@/test/helpers/dnd-helper';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '@/test/utils';

import { TierBoard } from './TierBoard';

vi.mock('@/infra/providers/registry', () => ({
  registry: {
    getProvider: () => ({
      resolveSearch: vi.fn().mockResolvedValue([]),
      resolveImage: vi.fn().mockResolvedValue('http://example.com/image.jpg'),
    }),
    getEntity: () => ({
      branding: {
        icon: null,
        colorClass: 'bg-blue-500',
      },
    }),
  },
}));

vi.mock('@/infra/providers/useItemRegistry', () => ({
  useItemRegistry: () => ({
    syncItems: vi.fn().mockResolvedValue([]),
    registerItems: vi.fn(),
  }),
}));

// Auto-mock storage
vi.mock('@/infra/storage/storage');

describe('TierBoard', () => {
  const defaultProps = {
    screenshotRef: { current: null },
    isAnyDragging: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.get).mockResolvedValue(null);
  });


  it('should render a list of tiers using real components', async () => {
    renderWithProviders(<TierBoard {...defaultProps} />, { boardId: 'test-board' });

    await waitFor(() => {
      const labels = screen.getAllByTestId('tier-row-label');
      expect(labels).toHaveLength(6);
      expect(labels[0].textContent).toBe('S');
      expect(labels[1].textContent).toBe('A');
    });
  });

  it('should call handleAddTier when the button is clicked', async () => {
    renderWithProviders(<TierBoard {...defaultProps} />, { boardId: 'test-board' });

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

  it('should respond to simulated drag and drop', async () => {
    const scenario = createPopulatedBoardScenario();
    vi.mocked(storage.get).mockResolvedValueOnce(scenario);

    renderWithProviders(<TierBoard {...defaultProps} />, { boardId: 'test-board' });

    await waitFor(() => {
      expect(screen.getAllByTestId('tier-row-label')).toHaveLength(6);
    });

    const sourceElement = document.createElement('div');
    const targetElement = document.createElement('div');

    act(() => {
      simulateElementDrop({
        source: {
          element: sourceElement,
          data: {
            type: 'item',
            item: scenario.itemEntities['item-s-1'],
            tierId: 'tier-s',
          },
        },
        location: {
          current: {
            dropTargets: [
              {
                element: targetElement,
                data: {
                  type: 'tier',
                  tierId: 'tier-a',
                },
              },
            ],
          },
        },
      });
    });

    // Verification: It should not crash, and state should update.
    // For now we just verify it runs without error in the component tree.
  });
});
