import { describe, expect, it, beforeEach, vi } from 'vitest';
import { serverItemCache } from './item-cache';
import { MediaItem } from '@/lib/types';

describe('MediaItemCache', () => {
  const mockItem: MediaItem = {
    id: 'test-1',
    mbid: 'test-1',
    type: 'song',
    title: 'Test Song',
    artist: 'Test Artist',
    year: '2024'
  };

  beforeEach(() => {
    serverItemCache.clear();
    vi.useFakeTimers();
  });

  it('should store and retrieve items', () => {
    serverItemCache.set(mockItem);
    expect(serverItemCache.get('test-1')).toEqual(mockItem);
  });

  it('should return null for non-existent items', () => {
    expect(serverItemCache.get('missing')).toBeNull();
  });

  it('should handle item expiry', () => {
    const ttl = 1000; // 1 second
    serverItemCache.set(mockItem, ttl);
    
    expect(serverItemCache.get('test-1')).toEqual(mockItem);
    
    // Advance time past TTL
    vi.advanceTimersByTime(1001);
    
    expect(serverItemCache.get('test-1')).toBeNull();
  });

  it('should check for item existence with has()', () => {
    serverItemCache.set(mockItem);
    expect(serverItemCache.has('test-1')).toBe(true);
    expect(serverItemCache.has('missing')).toBe(false);
  });

  it('should return false for has() if item expired', () => {
    serverItemCache.set(mockItem, 1000);
    vi.advanceTimersByTime(1001);
    expect(serverItemCache.has('test-1')).toBe(false);
  });

  it('should clear all items', () => {
    serverItemCache.set(mockItem);
    serverItemCache.clear();
    expect(serverItemCache.get('test-1')).toBeNull();
  });
});
