'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number; // Defaults to itemWidth if not provided (square)
  itemWidth?: number;  // Defaults to 112 (w-28)
  gap?: number;        // Defaults to 8 (gap-2)
  padding?: number;    // Container padding if needed
  className?: string;
}

/**
 * A generic virtualized grid component that adapts to container width.
 * Automatically calculates columns based on available width and item dimensions.
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  itemWidth = 112,
  itemHeight,
  gap = 8,
  padding = 0,
  className = ''
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Measure container width
  // useLayoutEffect is preferred for measurements to avoid flickers, but we'll use ResizeObserver
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox implements `contentBoxSize` as a single content rect, rather than an array
          const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
          setWidth(contentBoxSize.inlineSize);
        } else {
            setWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Calculate columns
  const effectiveWidth = width - (padding * 2);
  // Ensure at least 1 column to avoid division by zero or negative
  // We use floor to ensure items fit.
  // We need to account for the fact that gaps exist between items.
  // width >= n * itemWidth + (n - 1) * gap
  // width + gap >= n * (itemWidth + gap)
  // n <= (width + gap) / (itemWidth + gap)
  const columns = Math.max(1, Math.floor((effectiveWidth + gap) / (itemWidth + gap)));
  
  const rowCount = Math.ceil(items.length / columns);
  const finalItemHeight = itemHeight ?? itemWidth;

  // TanStack Virtual is not yet fully compatible with React Compiler's memoization
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => finalItemHeight + gap,
    overscan: 5,
  });

  return (
    <div 
        ref={parentRef} 
        className={`w-full h-full overflow-y-auto min-h-0 custom-scrollbar ${className}`}
        style={{ padding: padding }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const endIndex = Math.min(startIndex + columns, items.length);
          const rowItems = items.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${finalItemHeight}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                // Create explicit columns to match the calculated count
                gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
                columnGap: `${gap}px`,
                // justifyContent: 'start' or 'center' depending on preference?
                // The original was likely left-aligned or justified.
                // Let's keep it simple.
              }}
            >
              {rowItems.map((item, index) => renderItem(item, startIndex + index))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
