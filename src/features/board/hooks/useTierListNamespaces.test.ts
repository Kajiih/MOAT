/**
 * @file useTierListNamespaces.test.ts
 * @description Unit tests for useTierListNamespaces hook.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TierListState } from '@/features/board/types';
import { createMockItem } from '@/test/factories';

import { useTierListNamespaces } from './useTierListNamespaces';

describe('useTierListNamespaces', () => {
  const mockDispatch = vi.fn();
  const mockHistory = {
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: true,
    canRedo: false,
    push: vi.fn(),
  };

  const mockStructureRaw = {
    handleAddTier: vi.fn(),
    handleUpdateTier: vi.fn(),
    handleDeleteTier: vi.fn(),
    handleRandomizeColors: vi.fn(),
    handleClear: vi.fn(),
    handleResetItems: vi.fn(),
  };

  const mockIoRaw = {
    handleExport: vi.fn(),
    handleImport: vi.fn(),
  };

  const mockUtilsRaw = {
    headerColors: ['red', 'blue'],
    handleLocate: vi.fn(),
  };

  const mockUiState = {
    detailsItem: null,
    setDetailsItem: vi.fn(),
    showShortcuts: false,
    setShowShortcuts: vi.fn(),
    activeKeyboardDragId: null,
    setActiveKeyboardDragId: vi.fn(),
    cardPrefs: { showIcon: true, showUnderlay: true, coloredIcon: true, epicProbability: 50 },
    setCardPref: vi.fn(),
    activeEpic: null,
    triggerEpic: vi.fn(),
  };

  const item1 = createMockItem({ id: 'item-1', title: 'Item 1' });
  const item2 = createMockItem({ id: 'item-2', title: 'Item 2' });

  const mockState: TierListState = {
    title: 'Test Board',
    tierDefs: [],
    itemEntities: {
      'item-1': item1,
      'item-2': item2,
    },
    tierLayout: {},
  };

  const defaultProps = {
    state: mockState,
    dispatch: mockDispatch,
    history: mockHistory,
    structureRaw: mockStructureRaw,
    ioRaw: mockIoRaw,
    utilsRaw: mockUtilsRaw,
    uiState: mockUiState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate actions correctly', () => {
    const { result } = renderHook(() => useTierListNamespaces(defaultProps));

    result.current.actions.addTier();
    expect(mockStructureRaw.handleAddTier).toHaveBeenCalled();

    result.current.actions.locate('item-1');
    expect(mockUtilsRaw.handleLocate).toHaveBeenCalledWith('item-1');
  });

  it('should compute allBoardItems from state', () => {
    const { result } = renderHook(() => useTierListNamespaces(defaultProps));

    expect(result.current.ui.allBoardItems).toHaveLength(2);
    expect(result.current.ui.allBoardItems).toContainEqual(expect.objectContaining({ id: 'item-1', title: 'Item 1' }));
  });

  it('should compute addedItemIds from state', () => {
    const { result } = renderHook(() => useTierListNamespaces(defaultProps));

    expect(result.current.ui.addedItemIds.has('item-1')).toBe(true);
    expect(result.current.ui.addedItemIds.has('item-2')).toBe(true);
    expect(result.current.ui.addedItemIds.has('item-3')).toBe(false);
  });
});
