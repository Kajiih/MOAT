import { renderHook, act, waitFor } from '@testing-library/react';
import { useTierList } from './useTierList';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn(), toastCount: 0 })
}));

// Mock useTierListDnD to avoid dnd-kit complexity in this logic test
vi.mock('@/lib/hooks/useTierListDnD', () => ({
  useTierListDnD: () => ({
    sensors: [],
    activeItem: null,
    activeTier: null,
    overId: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
  })
}));

vi.mock('@/components/MediaRegistryProvider', () => ({
  useMediaRegistry: () => ({
    registerItems: vi.fn(),
    registerItem: vi.fn(),
    getItem: vi.fn()
  })
}));

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('useTierList', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTierList());
    
    // Check default tiers
    expect(result.current.state.tierDefs).toHaveLength(6);
    expect(result.current.state.tierDefs[0].label).toBe('S');
    expect(result.current.state.tierDefs[5].label).toBe('Unranked');
  });

  it('should add and delete tiers', () => {
    const { result } = renderHook(() => useTierList());

    // Add Tier
    act(() => {
      result.current.handleAddTier();
    });
    
    expect(result.current.state.tierDefs).toHaveLength(7);
    const newTier = result.current.state.tierDefs[result.current.state.tierDefs.length - 1]; 
    expect(newTier.label).toBe('New Tier');

    // Delete Tier
    act(() => {
      result.current.handleDeleteTier(newTier.id);
    });

    expect(result.current.state.tierDefs).toHaveLength(6);
  });

  it('should update tier properties', () => {
    const { result } = renderHook(() => useTierList());
    const tierId = result.current.state.tierDefs[0].id;

    act(() => {
      result.current.handleUpdateTier(tierId, { label: 'Super S' });
    });

    expect(result.current.state.tierDefs[0].label).toBe('Super S');
  });

  it('should import from valid JSON', async () => {
    const { result } = renderHook(() => useTierList());
    
    const validImportData = {
      version: 1,
      tiers: [
        { label: 'Imported S', color: 'red', items: [] },
        { label: 'Imported A', color: 'blue', items: [] }
      ]
    };

    const file = new File([JSON.stringify(validImportData)], 'import.json', { type: 'application/json' });
    const event = { target: { files: [file], value: 'fakepath' } } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImport(event);
    });

    // Wait for FileReader async
    await waitFor(() => {
      expect(result.current.state.tierDefs).toHaveLength(2);
    });

    expect(result.current.state.tierDefs[0].label).toBe('Imported S');
    expect(result.current.state.tierDefs[1].label).toBe('Imported A');
  });

  it('should handle invalid JSON import gracefully', async () => {
    const { result } = renderHook(() => useTierList());
    const initialCount = result.current.state.tierDefs.length;

    const file = new File(['invalid json'], 'bad.json', { type: 'application/json' });
    const event = { target: { files: [file], value: 'fakepath' } } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      result.current.handleImport(event);
    });

    // Wait for potential async failure handling
    await new Promise(r => setTimeout(r, 100));

    // State should not change
    expect(result.current.state.tierDefs).toHaveLength(initialCount);
    
    spy.mockRestore();
  });

  it('should clear the board', () => {
    const { result } = renderHook(() => useTierList());
    
    // Simulate items on board (manually inject or assume initial state is empty)
    // Let's add a tier first to change state
    act(() => {
        result.current.handleAddTier();
    });
    expect(result.current.state.tierDefs).toHaveLength(7);

    act(() => {
        result.current.handleClear();
    });

    // Should reset to initial state (6 tiers)
    expect(result.current.state.tierDefs).toHaveLength(6);
  });
});
