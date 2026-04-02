import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Entity } from '@/domain/providers/types';
import { registry } from '@/infra/providers/registry';

import { SearchTab } from './SearchTab';
import { useItemSearch } from './useItemSearch';

// Mock useItemSearch
vi.mock('./useItemSearch');

// Mock registry singleton
vi.mock('@/infra/providers/registry', () => ({
  registry: {
    getEntity: vi.fn(),
    getProvider: vi.fn(),
  },
}));

// Mock useTierListContext
vi.mock('@/features/board/context', () => ({
  useTierListContext: () => ({
    state: {
      tierDefs: [{ id: 'tier-1', label: 'S', color: 'red' }],
    },
    ui: {
      activeKeyboardDragId: null,
      setActiveKeyboardDragId: () => {},
      cardPrefs: { showProviderLogo: true, showCompactCards: false },
    },
    actions: {
      moveItem: () => {},
    },
  }),
}));

describe('SearchTab Pagination', () => {
  const mockProviderId = 'test-provider';
  const mockEntityId = 'item';
  const mockAddedItemIds = new Set<string>();

  const defaultMockEntity = {
    branding: {
      labelPlural: 'Items',
      icon: () => null,
      colorClass: 'text-primary',
    },
    getInitialParams: () => ({ limit: 10, query: '', filters: {} }),
    getNextParams: vi.fn(),
    getPreviousParams: vi.fn(),
    sortOptions: [],
    filters: [],
    searchOptions: [],
    capabilities: {
      supportsEmptyQueryBrowsing: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(registry.getEntity).mockReturnValue(defaultMockEntity as unknown as Entity);
    vi.mocked(useItemSearch).mockReturnValue({
      results: [],
      pagination: { totalPages: 1 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
  });

  it('should disable previous button on page 1', () => {
    vi.mocked(useItemSearch).mockReturnValue({
      results: [
        {
          id: '1',
          title: 'Item 1',
          identity: { providerId: 'test-provider', entityId: 'item', providerItemId: '1' },
          images: [],
        },
      ],
      pagination: { totalPages: 2 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    defaultMockEntity.getNextParams.mockReturnValue({ page: 2, limit: 10, query: '', filters: {} });

    render(
      <SearchTab
        providerId={mockProviderId}
        entityId={mockEntityId}
        addedItemIds={mockAddedItemIds}
        onLocate={() => {}}
        isHidden={false}
        showAdded={true}
        onInfo={() => {}}
      />
    );

    const prevButton = screen.getByTitle('Previous Page');
    expect(prevButton.hasAttribute('disabled')).toBe(true);
    
    const nextButton = screen.getByTitle('Next Page');
    expect(nextButton.hasAttribute('disabled')).toBe(false);
  });

  it('should call getNextParams when next is clicked', () => {
    vi.mocked(useItemSearch).mockReturnValue({
      results: [
        {
          id: '1',
          title: 'Item 1',
          identity: { providerId: 'test-provider', entityId: 'item', providerItemId: '1' },
          images: [],
        },
      ],
      pagination: { totalPages: 2 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    const mockNextParams = { page: 2, limit: 10, query: '', filters: {} };
    defaultMockEntity.getNextParams.mockReturnValue(mockNextParams);

    render(
      <SearchTab
        providerId={mockProviderId}
        entityId={mockEntityId}
        addedItemIds={mockAddedItemIds}
        onLocate={() => {}}
        isHidden={false}
        showAdded={true}
        onInfo={() => {}}
      />
    );

    const nextButton = screen.getByTitle('Next Page');
    fireEvent.click(nextButton);

    expect(defaultMockEntity.getNextParams).toHaveBeenCalled();
  });

  it('should reset scroll to top on page change (TDD)', () => {
    vi.mocked(useItemSearch).mockReturnValue({
      results: [
        {
          id: '1',
          title: 'Item 1',
          identity: { providerId: 'test-provider', entityId: 'item', providerItemId: '1' },
          images: [],
        },
      ],
      pagination: { totalPages: 2 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    const mockNextParams = { page: 2, limit: 10, query: '', filters: {} };
    defaultMockEntity.getNextParams.mockReturnValue(mockNextParams);

    render(
      <SearchTab
        providerId={mockProviderId}
        entityId={mockEntityId}
        addedItemIds={mockAddedItemIds}
        onLocate={() => {}}
        isHidden={false}
        showAdded={true}
        onInfo={() => {}}
      />
    );

    const container = screen.getByTestId('search-results-scroll-container');
    
    // Simulate scrolling down
    Object.defineProperty(container, 'scrollTop', { value: 100, writable: true });
    container.scrollTop = 100;
    expect(container.scrollTop).toBe(100);

    const nextButton = screen.getByTitle('Next Page');
    fireEvent.click(nextButton);

    // Verify scroll reset
    expect(container.scrollTop).toBe(0);
  });
});
