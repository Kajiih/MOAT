/**
 * @file Dashboard.test.tsx
 * @description Tests for the Dashboard component, focusing on user interactions
 * including creating boards and keyboard shortcuts.
 * @module Dashboard.test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dashboard } from './Dashboard';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the hooks and dependencies
const mockCreateBoard = vi.fn(() => 'new-id');
vi.mock('@/presentation/board/hooks/useBoardRegistry', () => ({
  useBoardRegistry: () => ({
    boards: [],
    isLoading: false,
    createBoard: mockCreateBoard,
    deleteBoard: vi.fn(),
  }),
}));

vi.mock('@/presentation/board/hooks/useBrandColors', () => ({
  useBrandColors: () => ({
    headerColors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
    favicon: '',
  }),
}));

vi.mock('@/presentation/board/hooks', () => ({
  useDynamicFavicon: vi.fn(),
}));

vi.mock('@/app/_components/BrandLogo', () => ({
  BrandLogo: () => <div data-testid="brand-logo">MOAT</div>,
}));

vi.mock('@/app/_components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

describe('Dashboard - Create Board Card', () => {
  it('should display the create button', () => {
    render(<Dashboard />);

    const createButton = screen.getByTitle('New Tier List');
    expect(createButton).toBeDefined();
  });

  it('should create a board immediately when the create button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const createButton = screen.getByTitle('New Tier List');
    await user.click(createButton);

    // Should immediately create a board and navigate
    expect(mockCreateBoard).toHaveBeenCalledWith('Untitled Board');
    expect(mockPush).toHaveBeenCalledWith('/board/new-id');
  });
});
