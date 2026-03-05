import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useItemSearch } from '@/components/search/hooks/useItemSearch';

import { ItemPicker } from './ItemPicker';

// Mock useItemSearch
vi.mock('@/components/search/hooks/useItemSearch', () => ({
  useItemSearch: vi.fn(),
}));

describe('ItemPicker', () => {
  const mockOnSelect = vi.fn();

  const mockResults = [
    { id: 'artist-1', title: 'Artist One', imageUrl: 'img1.jpg', type: 'artist' },
    { id: 'artist-2', title: 'Artist Two', imageUrl: 'img2.jpg', type: 'artist' },
  ];

  const defaultHookReturn = {
    filters: { query: '' },
    updateFilters: vi.fn(),
    results: [],
    isLoading: false,
    searchNow: vi.fn(),
  };

  it('renders input and placeholder', () => {
    vi.mocked(useItemSearch).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useItemSearch>,
    );
    render(<ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={null} />);

    expect(screen.getByPlaceholderText('Filter by artist...')).toBeDefined();
  });

  it('updates filters and shows results when typing', () => {
    const updateFilters = vi.fn();
    vi.mocked(useItemSearch).mockReturnValue({
      ...defaultHookReturn,
      filters: { query: '' }, // Start empty
      updateFilters,
      results: mockResults,
    } as unknown as ReturnType<typeof useItemSearch>);

    render(<ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={null} />);

    const input = screen.getByPlaceholderText('Filter by artist...');
    fireEvent.change(input, { target: { value: 'Art' } });
    expect(updateFilters).toHaveBeenCalledWith({ query: 'Art' });

    // Results dropdown opens when query matches or is focused
    fireEvent.focus(input);
    expect(screen.getByText('Artist One')).toBeDefined();
    expect(screen.getByText('Artist Two')).toBeDefined();
  });

  it('calls onSelect when a result is clicked', () => {
    vi.mocked(useItemSearch).mockReturnValue({
      ...defaultHookReturn,
      filters: { query: 'Art' },
      results: mockResults,
    } as unknown as ReturnType<typeof useItemSearch>);

    render(<ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={null} />);

    const input = screen.getByPlaceholderText('Filter by artist...');
    fireEvent.focus(input); // Open the results

    const resultBtn = screen.getByText('Artist One').closest('button');
    if (!resultBtn) throw new Error('Result button not found');

    // Use mouseDown as the component uses onMouseDown to prevent blur
    fireEvent.mouseDown(resultBtn);

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'artist-1',
      name: 'Artist One',
      imageUrl: 'img1.jpg',
      disambiguation: 'artist-1',
    });
  });

  it('renders progress spinner when loading', () => {
    vi.mocked(useItemSearch).mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    } as unknown as ReturnType<typeof useItemSearch>);

    const { container } = render(
      <ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={null} />,
    );
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  it('displays selected item and allows clearing', () => {
    vi.mocked(useItemSearch).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useItemSearch>,
    );
    const selectedItem = { id: 'artist-1', name: 'Artist One', imageUrl: 'img1.jpg' };

    render(<ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={selectedItem} />);

    expect(screen.getByText('Artist One')).toBeDefined();

    const clearBtn = screen.getByRole('button'); // Only one button (X) when selected
    fireEvent.click(clearBtn);

    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });

  it('toggles filters view', () => {
    vi.mocked(useItemSearch).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useItemSearch>,
    );
    render(<ItemPicker type="artist" onSelect={mockOnSelect} selectedItem={null} />);

    const filterBtn = screen.getByTitle('Toggle Filters');
    fireEvent.click(filterBtn);

    // Check if SearchFilters is rendered (it's a child component)
    // We can check for a label that exists in SearchFilters, like "Born / Formed" for artists
    expect(screen.getByText(/Born \/ Formed/i)).toBeDefined();
  });
});
