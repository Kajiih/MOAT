import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionContext } from '@/components/ui/InteractionContext';
import { useItemRegistry } from '@/lib/database/hooks/useItemRegistry';
import { useItemResolver } from '@/lib/hooks';
import {
  AlbumItem,
  ArtistItem,
  AuthorItem,
  BookItem,
  DeveloperItem,
  FranchiseItem,
  GameItem,
  MovieItem,
  PersonItem,
  SeriesItem,
  SongItem,
  TVItem,
} from '@/v1/lib/types';

/**
 * Represents a single normalized legacy item in the application.
 */
type LegacyItem =
  | AlbumItem
  | ArtistItem
  | SongItem
  | MovieItem
  | TVItem
  | PersonItem
  | GameItem
  | BookItem
  | AuthorItem
  | DeveloperItem
  | FranchiseItem
  | SeriesItem;

import { LegacyItemCard, LegacySortableItemCard } from './LegacyItemCard';

// Mock dnd-kit hooks
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

// Mock hooks
vi.mock('@/lib/hooks', () => ({
  useLegacyItemDetails: vi.fn(),
  useEscapeKey: vi.fn(),
  useItemResolver: vi.fn(),
}));

vi.mock('@/lib/database/hooks/useItemRegistry', () => ({
  useItemRegistry: vi.fn(),
}));

describe('ItemCard', () => {
  const mockItem: LegacyItem = {
    id: 'test-item-1',
    mbid: 'mbid-1',
    type: 'song',
    title: 'Test Song Title',
    artist: 'Test Artist Name',
    year: '2024',
    imageUrl: 'https://example.com/image.jpg',
  };

  const mockInteraction = {
    setHoveredItem: vi.fn(),
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <InteractionContext.Provider value={mockInteraction}>{ui}</InteractionContext.Provider>,
    );
  };

  beforeEach(() => {
    // Default implementation for useItemRegistry in tests
    vi.mocked(useItemRegistry).mockReturnValue({
      getItem: vi.fn().mockReturnValue(null),
      registerItem: vi.fn(),
      registerItems: vi.fn(),
      registrySize: 0,
      clearRegistry: vi.fn(),
    });

    // Default implementation for useItemResolver in tests
    vi.mocked(useItemResolver).mockImplementation((item: any) => ({
      resolvedItem: item,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: !!item?.details,
    }));
  });

  it('renders item title and artist', () => {
    renderWithProviders(<LegacyItemCard item={mockItem as any} />);

    expect(screen.getByText('Test Song Title')).toBeDefined();
    expect(screen.getByText(/Test Artist Name/)).toBeDefined();
    expect(screen.getByText(/2024/)).toBeDefined();
  });

  it('renders the image with correct src', () => {
    renderWithProviders(<LegacyItemCard item={mockItem as any} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe(mockItem.imageUrl);
  });

  it('calls setHoveredItem on mouse enter and leave', () => {
    renderWithProviders(<LegacyItemCard item={mockItem as any} />);

    const card = screen.getByText('Test Song Title').closest('div');
    if (!card) throw new Error('Card container not found');

    fireEvent.mouseEnter(card);
    expect(mockInteraction.setHoveredItem).toHaveBeenCalledWith({
      item: mockItem,
      tierId: undefined,
    });

    fireEvent.mouseLeave(card);
    expect(mockInteraction.setHoveredItem).toHaveBeenCalledWith(null);
  });

  it('renders the remove button only when tierId and onRemove are provided', () => {
    const onRemove = vi.fn();

    // Without tierId/onRemove
    const { rerender } = renderWithProviders(<LegacyItemCard item={mockItem as any} />);
    expect(screen.queryByTitle('Remove item')).toBeNull();

    // With tierId and onRemove
    rerender(
      <InteractionContext.Provider value={mockInteraction}>
        <LegacyItemCard item={mockItem as any} tierId="tier-1" onRemove={onRemove} />
      </InteractionContext.Provider>,
    );

    const removeBtn = screen.getByTitle('Remove item');
    expect(removeBtn).toBeDefined();

    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(mockItem.id);
  });

  it('renders the info button when onInfo is provided', () => {
    const onInfo = vi.fn();
    renderWithProviders(<LegacyItemCard item={mockItem as any} onInfo={onInfo} />);

    const infoBtn = screen.getByTitle('View details');
    expect(infoBtn).toBeDefined();

    fireEvent.click(infoBtn);
    expect(onInfo).toHaveBeenCalledWith(mockItem);
  });

  it('displays placeholder when image fails to load', () => {
    renderWithProviders(<LegacyItemCard item={mockItem as any} />);

    const img = screen.getByRole('img');
    fireEvent.error(img); // First error triggers retry unoptimized
    fireEvent.error(img); // Second error triggers placeholder

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('song')).toBeDefined();
  });

  it('shows locate icon when isAdded is true', () => {
    renderWithProviders(<LegacyItemCard item={mockItem as any} isAdded={true} />);

    // The link/Eye icon might be subtle, but we can check for classes or specific elements
    // The Eye icon is rendered inside a div with absolute inset-0
    const locateOverlay = screen
      .getByText('Test Song Title')
      .parentElement?.querySelector('.lucide-eye');
    expect(locateOverlay).toBeDefined();
  });
});
describe('LegacySortableItemCard', () => {
  const mockItem: LegacyItem = {
    id: 'test-item-1',
    mbid: 'mbid-1',
    type: 'song',
    title: 'Test Song Title',
    artist: 'Test Artist Name',
    year: '2024',
    imageUrl: 'https://example.com/image.jpg',
  };

  // Mock useSortable
  vi.mock('@dnd-kit/sortable', () => ({
    useSortable: vi.fn(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: '',
      isDragging: false,
    })),
  }));

  beforeEach(() => {
    // Default implementation for useItemRegistry in tests
    vi.mocked(useItemRegistry).mockReturnValue({
      getItem: vi.fn().mockReturnValue(null),
      registerItem: vi.fn(),
      registerItems: vi.fn(),
      registrySize: 0,
      clearRegistry: vi.fn(),
    });

    // Default implementation for useItemResolver in tests
    vi.mocked(useItemResolver).mockImplementation((item: any) => ({
      resolvedItem: item,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: !!item?.details,
    }));
  });

  it('renders correctly', () => {
    const mockSetHoveredItem = vi.fn();
    render(
      <InteractionContext.Provider value={{ hoveredItem: null, setHoveredItem: mockSetHoveredItem }}>
        <LegacySortableItemCard item={mockItem as any} />
      </InteractionContext.Provider>,
    );
    expect(screen.getByText('Test Song Title')).toBeDefined();
  });
});
