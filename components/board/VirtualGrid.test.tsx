import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { VirtualGrid } from './VirtualGrid';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('VirtualGrid', () => {
  const originalResizeObserver = global.ResizeObserver;

  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterAll(() => {
    vi.stubGlobal('ResizeObserver', originalResizeObserver);
  });

  it('renders without crashing', () => {
    const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
    render(<VirtualGrid items={items} renderItem={(item) => <div key={item}>{item}</div>} />);
    // Initially renders something
    expect(document.querySelector('.custom-scrollbar')).toBeTruthy();
  });
});
