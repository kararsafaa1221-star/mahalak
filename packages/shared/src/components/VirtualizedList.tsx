import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualizedListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  /** Max height of the scroll viewport (px or CSS). Defaults to filling parent via max-h. */
  maxHeight?: number | string;
  getItemKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

/**
 * Windowed vertical list — only mounts rows near the viewport (ListView.builder equivalent).
 */
export function VirtualizedList<T>({
  items,
  estimateSize = 160,
  overscan = 4,
  className = '',
  maxHeight = '70vh',
  getItemKey,
  renderItem,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : (index) => index,
  });

  if (items.length === 0) return null;

  const heightStyle =
    typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto w-full ${className}`}
      style={{ maxHeight: heightStyle }}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
