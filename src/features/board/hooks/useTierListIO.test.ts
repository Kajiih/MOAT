/**
 * @file useTierListIO.test.ts
 * @description Unit tests for useTierListIO hook.
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TierListState } from '@/features/board/types';
import { deserializeBoardData, downloadJson, serializeBoardData } from '@/infra/io';

import { useTierListIO } from './useTierListIO';

// Mock dependencies
vi.mock('@/core/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/infra/io', () => ({
  serializeBoardData: vi.fn(),
  deserializeBoardData: vi.fn(),
  downloadJson: vi.fn(),
}));

// Mock FileReader
class MockFileReader {
  onload: (ev: { target: { result: string } }) => void = () => {};
  readAsText(_file: Blob) {
    // Simulate reading
    this.onload({ target: { result: '{"mock": "state"}' } });
  }
}

describe('useTierListIO', () => {
  const mockDispatch = vi.fn();
  const mockPushHistory = vi.fn();
  const mockState: TierListState = {
    title: 'Test Board',
    tierDefs: [],
    itemEntities: {},
    tierLayout: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('FileReader', MockFileReader);
  });

  it('should trigger download on export', () => {
    const mockExportData = {
      version: 2,
      createdAt: '2026-04-03T23:00:35.788Z',
      title: 'Exported Board',
      tiers: [],
    };
    vi.mocked(serializeBoardData).mockReturnValue(mockExportData);

    const { result } = renderHook(() =>
      useTierListIO(mockState, mockDispatch, mockPushHistory)
    );

    act(() => {
      result.current.handleExport();
    });

    expect(serializeBoardData).toHaveBeenCalledWith(mockState);
    expect(downloadJson).toHaveBeenCalledWith(mockExportData, expect.stringContaining('moat-'));
  });

  it('should dispatch importState on successful import', async () => {
    const mockStateData: TierListState = {
      title: 'Imported Board',
      tierDefs: [],
      itemEntities: {},
      tierLayout: {},
    };
    vi.mocked(deserializeBoardData).mockReturnValue(mockStateData);

    const { result } = renderHook(() =>
      useTierListIO(mockState, mockDispatch, mockPushHistory)
    );

    const file = new File(['{"mock": "state"}'], 'test.json', { type: 'application/json' });
    const event = {
      target: {
        files: [file],
        value: 'test.json',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImport(event);
    });

    // Wait for async FileReader simulation if needed, but our mock is synchronous
    expect(deserializeBoardData).toHaveBeenCalledWith('{"mock": "state"}', 'Untitled Tier List');
    expect(mockPushHistory).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'board/importState',
        payload: { state: mockStateData },
      })
    );
  });

  it('should call fetch and return id on publish', async () => {
    const mockResponse = { id: 'share-123' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useTierListIO(mockState, mockDispatch, mockPushHistory)
    );

    let publishResult;
    await act(async () => {
      publishResult = await result.current.handlePublish();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/share/publish', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockState),
    }));
    expect(publishResult).toBe('share-123');
  });
});
