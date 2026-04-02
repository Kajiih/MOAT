import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/core/ui/ToastProvider';
import { Entity, Provider } from '@/domain/providers/types';
import { TierListProvider } from '@/features/board/context';
import TierListApp from '@/features/board/TierListApp';
import { registry } from '@/infra/providers/registry';
import { storage } from '@/infra/storage/storage';

// Mock dependencies
vi.mock('@/infra/storage/storage');
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infra/providers/registry', () => ({
  registry: {
    getEntity: vi.fn().mockReturnValue({
      branding: {
        label: 'Item',
        labelPlural: 'Items',
        icon: () => <div data-testid="mock-icon" />,
        colorClass: 'text-primary',
      },
    }),
    getProvider: vi.fn().mockReturnValue({
      label: 'Test Provider',
    }),
  },
}));

// Mock fetch to prevent unmocked network request fatal error
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

vi.mock('leva', () => ({
  Leva: () => null,
  useControls: () => [{}, vi.fn()],
}));

vi.mock('@/app/_components/Header', () => ({
  Header: () => <div data-testid="mock-header" />,
}));

vi.mock('@/infra/providers/registry', () => ({
  registry: {
    getProvider: vi.fn(),
    getEntity: vi.fn(),
    getStatus: vi.fn().mockReturnValue('ready'),
    register: vi.fn(),
  },
  RegistryStatus: {
    READY: 'ready',
    INITIALIZING: 'initializing',
    IDLE: 'idle',
  },
}));

vi.mock('@/presentation/hooks/useRegistry', () => ({
  useRegistry: () => ({
    availableProviders: [
      {
        id: 'test-provider',
        label: 'Test Provider',
        entities: [
          {
            id: 'item',
            branding: {
              label: 'Item',
              labelPlural: 'Items',
              icon: () => <div data-testid="mock-icon" />,
            },
          },
        ],
      },
    ],
    status: 'ready',
  }),
}));

vi.mock('@/features/items/useItemResolver', () => ({
  useItemResolver: (item: unknown) => ({
    resolvedItem: item,
    isLoading: false,
    error: null,
  }),
}));

describe('TierListApp Integration', () => {
  const mockProvider = {
    id: 'test-provider',
    label: 'Test Provider',
    resolveSearch: vi.fn().mockResolvedValue([]),
    resolveImage: vi.fn().mockResolvedValue('http://example.com/image.jpg'),
  };

  const mockEntity = {
    id: 'item',
    branding: {
      label: 'Item',
      labelPlural: 'Items',
      colorClass: 'text-blue-500',
      icon: () => <div data-testid="mock-icon" />,
    },
    capabilities: {
      supportsEmptyQueryBrowsing: true,
    },
    getInitialParams: () => ({ query: '', filters: {}, limit: 20 }),
    getNextParams: () => null,
    getPreviousParams: () => null,
    sortOptions: [],
    filters: [],
    searchOptions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.get).mockResolvedValue(null); // Fresh board
    vi.mocked(registry.getProvider).mockReturnValue(mockProvider as unknown as Provider);
    vi.mocked(registry.getEntity).mockReturnValue(mockEntity as unknown as Entity);

    // Default fetch mock (empty items)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], pagination: {} }),
    });
  });

  const renderApp = () => {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ToastProvider>
          <TierListProvider boardId="test-board">
            <TierListApp />
          </TierListProvider>
        </ToastProvider>
      </SWRConfig>
    );
  };

  it('should render the app and allow searching', async () => {
    const mockResults = [
      {
        id: 'item-1',
        title: 'Result 1',
        identity: { providerId: 'test-provider', entityId: 'item', providerItemId: '1' },
        images: [],
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockResults, pagination: {} }),
    });

    renderApp();

    // Wait for hydration/loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading application...')).toBeNull();
    });

    // Find search input
    const input = screen.getByPlaceholderText('Search Items...');
    expect(input).toBeTruthy();

    // Type query
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    });
});
