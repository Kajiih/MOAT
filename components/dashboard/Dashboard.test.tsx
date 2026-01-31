/**
 * @file Dashboard.test.tsx
 * @description Tests for the Dashboard component, focusing on user interactions
 * including creating and deleting boards, and keyboard shortcuts.
 * @module Dashboard.test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dashboard } from './Dashboard';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the hooks and dependencies
vi.mock('@/lib/hooks/useBoardRegistry', () => ({
  useBoardRegistry: () => ({
    boards: [],
    isLoading: false,
    createBoard: vi.fn((title: string, category: string) => 'new-id'),
    deleteBoard: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/useBrandColors', () => ({
  useBrandColors: () => ({
    headerColors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
    favicon: '',
  }),
}));

vi.mock('@/lib/hooks', () => ({
  useDynamicFavicon: vi.fn(),
}));

vi.mock('@/components/ui/BrandLogo', () => ({
  BrandLogo: () => <div data-testid="brand-logo">MOAT</div>,
}));

vi.mock('@/components/ui/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

describe('Dashboard - Create Board Card', () => {
  it('should display the create button initially', () => {
    render(<Dashboard />);

    const createButton = screen.getByTitle('New Tier List');
    expect(createButton).toBeDefined();
  });

  it('should show category selection when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const createButton = screen.getByTitle('New Tier List');
    await user.click(createButton);

    // Should show the category selection UI
    expect(screen.getByText('Select Type')).toBeDefined();
    expect(screen.getByText('Music')).toBeDefined();
    expect(screen.getByText('Cinema')).toBeDefined();
    expect(screen.getByText('Books')).toBeDefined();
  });

  it('should close category selection when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Open the creation form
    const createButton = screen.getByTitle('New Tier List');
    await user.click(createButton);
    expect(screen.getByText('Select Type')).toBeDefined();

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Should return to the create button state
    expect(screen.getByTitle('New Tier List')).toBeDefined();
    expect(screen.queryByText('Select Type')).toBeNull();
  });

  it('should close category selection when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Open the creation form
    const createButton = screen.getByTitle('New Tier List');
    await user.click(createButton);
    expect(screen.getByText('Select Type')).toBeDefined();

    // Press Escape
    await user.keyboard('{Escape}');

    // Should return to the create button state
    expect(screen.getByTitle('New Tier List')).toBeDefined();
    expect(screen.queryByText('Select Type')).toBeNull();
  });

  it('should not respond to Escape when creation form is not open', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Verify initial state
    expect(screen.getByTitle('New Tier List')).toBeDefined();

    // Press Escape (should do nothing)
    await user.keyboard('{Escape}');

    // Should still show the create button
    expect(screen.getByTitle('New Tier List')).toBeDefined();
  });
});
