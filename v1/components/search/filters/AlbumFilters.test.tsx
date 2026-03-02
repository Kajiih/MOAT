import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SECONDARY_TYPES } from '@/lib/types';

import { AlbumFilters } from './AlbumFilters';

describe('AlbumFilters', () => {
  const mockTogglePrimary = vi.fn();
  const mockToggleSecondary = vi.fn();
  const mockResetSecondary = vi.fn();
  const mockSelectAllSecondary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Select All" when not all secondary types are selected', () => {
    render(
      <AlbumFilters
        primaryTypes={['Album']}
        secondaryTypes={[]}
        onTogglePrimary={mockTogglePrimary}
        onToggleSecondary={mockToggleSecondary}
        onResetSecondary={mockResetSecondary}
        onSelectAllSecondary={mockSelectAllSecondary}
      />,
    );

    expect(screen.getByText('Select All')).toBeDefined();
  });

  it('calls onSelectAllSecondary when "Select All" is clicked', () => {
    render(
      <AlbumFilters
        primaryTypes={['Album']}
        secondaryTypes={[]}
        onTogglePrimary={mockTogglePrimary}
        onToggleSecondary={mockToggleSecondary}
        onResetSecondary={mockResetSecondary}
        onSelectAllSecondary={mockSelectAllSecondary}
      />,
    );

    fireEvent.click(screen.getByText('Select All'));
    expect(mockSelectAllSecondary).toHaveBeenCalled();
    expect(mockResetSecondary).not.toHaveBeenCalled();
  });

  it('renders "Deselect All" when all secondary types are selected', () => {
    render(
      <AlbumFilters
        primaryTypes={['Album']}
        secondaryTypes={[...SECONDARY_TYPES]}
        onTogglePrimary={mockTogglePrimary}
        onToggleSecondary={mockToggleSecondary}
        onResetSecondary={mockResetSecondary}
        onSelectAllSecondary={mockSelectAllSecondary}
      />,
    );

    expect(screen.getByText('Deselect All')).toBeDefined();
  });

  it('calls onResetSecondary when "Deselect All" is clicked', () => {
    render(
      <AlbumFilters
        primaryTypes={['Album']}
        secondaryTypes={[...SECONDARY_TYPES]}
        onTogglePrimary={mockTogglePrimary}
        onToggleSecondary={mockToggleSecondary}
        onResetSecondary={mockResetSecondary}
        onSelectAllSecondary={mockSelectAllSecondary}
      />,
    );

    fireEvent.click(screen.getByText('Deselect All'));
    expect(mockResetSecondary).toHaveBeenCalled();
    expect(mockSelectAllSecondary).not.toHaveBeenCalled();
  });
});
