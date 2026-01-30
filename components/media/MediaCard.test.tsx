import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaCard } from './MediaCard';
import { MediaItem } from '@/lib/types';
import { InteractionContext } from '@/components/ui/InteractionContext';

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

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, sizes, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('MediaCard', () => {
  const mockItem: MediaItem = {
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

  it('renders item title and artist', () => {
    renderWithProviders(<MediaCard item={mockItem} />);

    expect(screen.getByText('Test Song Title')).toBeDefined();
    expect(screen.getByText(/Test Artist Name/)).toBeDefined();
    expect(screen.getByText(/2024/)).toBeDefined();
  });

  it('renders the image with correct src', () => {
    renderWithProviders(<MediaCard item={mockItem} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe(mockItem.imageUrl);
  });

  it('calls setHoveredItem on mouse enter and leave', () => {
    renderWithProviders(<MediaCard item={mockItem} />);

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
    const { rerender } = renderWithProviders(<MediaCard item={mockItem} />);
    expect(screen.queryByTitle('Remove item')).toBeNull();

    // With tierId and onRemove
    rerender(
      <InteractionContext.Provider value={mockInteraction}>
        <MediaCard item={mockItem} tierId="tier-1" onRemove={onRemove} />
      </InteractionContext.Provider>,
    );

    const removeBtn = screen.getByTitle('Remove item');
    expect(removeBtn).toBeDefined();

    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(mockItem.id);
  });

  it('renders the info button when onInfo is provided', () => {
    const onInfo = vi.fn();
    renderWithProviders(<MediaCard item={mockItem} onInfo={onInfo} />);

    const infoBtn = screen.getByTitle('View details');
    expect(infoBtn).toBeDefined();

    fireEvent.click(infoBtn);
    expect(onInfo).toHaveBeenCalledWith(mockItem);
  });

  it('displays placeholder when image fails to load', () => {
    renderWithProviders(<MediaCard item={mockItem} />);

    const img = screen.getByRole('img');
    fireEvent.error(img); // First error triggers retry unoptimized
    fireEvent.error(img); // Second error triggers placeholder

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('song')).toBeDefined();
  });

  it('shows locate icon when isAdded is true', () => {
    renderWithProviders(<MediaCard item={mockItem} isAdded={true} />);

    // The link/Eye icon might be subtle, but we can check for classes or specific elements
    // The Eye icon is rendered inside a div with absolute inset-0
    const locateOverlay = screen
      .getByText('Test Song Title')
      .parentElement?.querySelector('.lucide-eye');
    expect(locateOverlay).toBeDefined();
  });
});

import { SortableMediaCard } from './MediaCard';

describe('SortableMediaCard', () => {
  const mockItem: MediaItem = {
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

  it('renders correctly', () => {
    render(
      <InteractionContext.Provider value={{ setHoveredItem: vi.fn() }}>
        <SortableMediaCard item={mockItem} />
      </InteractionContext.Provider>,
    );
    expect(screen.getByText('Test Song Title')).toBeDefined();
  });
});
