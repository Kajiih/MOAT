import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaRegistry } from '@/components/providers/MediaRegistryProvider';
import { useMediaResolver } from '@/lib/hooks';
import { MediaItem } from '@/lib/types';

import { DetailsModal } from './DetailsModal';

// Mock hooks
vi.mock('@/lib/hooks', () => ({
  useMediaDetails: vi.fn(),
  useEscapeKey: vi.fn(),
  useMediaResolver: vi.fn(),
}));

vi.mock('@/components/providers/MediaRegistryProvider', () => ({
  useMediaRegistry: vi.fn(),
}));

// Mock child views
vi.mock('./details/AlbumView', () => ({ AlbumView: () => <div data-testid="album-view" /> }));
vi.mock('./details/ArtistView', () => ({ ArtistView: () => <div data-testid="artist-view" /> }));
vi.mock('./details/SongView', () => ({ SongView: () => <div data-testid="song-view" /> }));

describe('DetailsModal', () => {
  const mockItem = {
    id: 'item-1',
    mbid: 'mbid-1',
    type: 'album' as const,
    title: 'Test Album',
    artist: 'Test Artist',
  };

  const mockOnClose = vi.fn();
  const mockOnUpdateItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaRegistry).mockReturnValue({
      getItem: vi.fn().mockReturnValue(null),
      registerItem: vi.fn(),
      registerItems: vi.fn(),
      registrySize: 0,
      clearRegistry: vi.fn(),
    });

    // Default implementation for tests
    vi.mocked(useMediaResolver).mockImplementation((item) => ({
      resolvedItem: item,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: !!item?.details,
    }));
  });

  it('renders nothing when closed', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: false,
    });
    render(<DetailsModal item={mockItem} isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Test Album')).toBeNull();
  });

  it('renders title and artist when open', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      isLoading: true,
      isFetching: true,
      error: null,
      isEnriched: false,
    });
    render(<DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Test Album')).toBeDefined();
    expect(screen.getByText('Test Artist')).toBeDefined();
  });

  it('shows loading state', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      isLoading: true,
      isFetching: true,
      error: null,
      isEnriched: false,
    });
    const { container } = render(
      <DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />,
    );

    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });

  it('shows error state', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      error: new Error('Failed'),
      isLoading: false,
      isFetching: false,
      isEnriched: false,
    });
    render(<DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Failed to load additional details/i)).toBeDefined();
  });

  it('renders AlbumView when album details are loaded', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: {
        ...mockItem,
        details: { id: mockItem.id, type: 'album' },
      } as unknown as MediaItem,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: true,
    });
    render(<DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('album-view')).toBeDefined();
  });

  it('calls onUpdateItem when details are successfully fetched', async () => {
    const details = {
      id: mockItem.id,
      mbid: mockItem.mbid,
      type: 'album' as const,
      tracks: [],
      imageUrl: 'new-img.jpg',
    };
    vi.mocked(useMediaResolver).mockImplementation((item, options) => {
      // Simulate detail arrival
      if (options?.onUpdate) {
        options.onUpdate(item!.id, { details, imageUrl: 'new-img.jpg' });
      }
      return {
        resolvedItem: { ...item, details } as unknown as MediaItem,
        isLoading: false,
        isFetching: false,
        error: null,
        isEnriched: true,
      } as unknown as ReturnType<typeof useMediaResolver>;
    });

    render(
      <DetailsModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onUpdateItem={mockOnUpdateItem}
      />,
    );

    await waitFor(() => {
      expect(mockOnUpdateItem).toHaveBeenCalledWith(mockItem.id, {
        details,
        imageUrl: 'new-img.jpg',
      });
    });
  });

  it('calls onClose when X button is clicked', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: false,
    });
    render(<DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    vi.mocked(useMediaResolver).mockReturnValue({
      resolvedItem: mockItem,
      isLoading: false,
      isFetching: false,
      error: null,
      isEnriched: false,
    });
    render(<DetailsModal item={mockItem} isOpen={true} onClose={mockOnClose} />);

    // The backdrop is the outermost div with onClick={onClose}
    const backdrop = screen.getByText('Test Album').closest('.fixed');
    if (!backdrop) throw new Error('Backdrop not found');

    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
