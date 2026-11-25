import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';

export interface VirtualizedGridProps<T> {
  items: T[];
  columns?: number;
  estimateRowHeight?: number;
  overscan?: number;
  className?: string;
  gridClassName?: string;
  /** When set, uses an inner scroll container. When omitted, uses window scroll. */
  maxHeight?: number | string;
  getItemKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

function useColumnCount(containerRef: React.RefObject<HTMLElement | null>, fallback: number) {
  const [cols, setCols] = useState(fallback);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const update = () => {
      const w = el.clientWidth || window.innerWidth;
      if (w >= 1024) setCols(4);
      else if (w >= 640) setCols(3);
      else setCols(2);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return cols;
}

/**
 * Windowed product/card grid — only mounts rows near the viewport.
 */
export function VirtualizedGrid<T>({
  items,
  columns: columnsProp,
  estimateRowHeight = 280,
  overscan = 2,
  className = '',
  gridClassName = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
  maxHeight,
  getItemKey,
  renderItem,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const measuredCols = useColumnCount(parentRef, columnsProp ?? 2);
  const columns = columnsProp ?? measuredCols;
  const useInnerScroll = maxHeight != null;

  const rowCount = Math.ceil(items.length / Math.max(columns, 1));

  const rowItems = useMemo(() => {
    const rows: T[][] = [];
    for (let r = 0; r < rowCount; r += 1) {
      rows.push(items.slice(r * columns, r * columns + columns));
    }
    return rows;
  }, [items, rowCount, columns]);

  const innerVirtualizer = useVirtualizer({
    count: useInnerScroll ? rowCount : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  const windowVirtualizer = useWindowVirtualizer({
    count: useInnerScroll ? 0 : rowCount,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  const virtualizer = useInnerScroll ? innerVirtualizer : windowVirtualizer;

  if (items.length === 0) return null;

  // Small lists: skip virtualization overhead
  if (items.length <= columns * 4) {
    return (
      <div ref={parentRef} className={`${gridClassName} ${className}`}>
        {items.map((item, index) => (
          <React.Fragment key={getItemKey ? getItemKey(item, index) : index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const heightStyle =
    typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  const list = (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rowItems[virtualRow.index] || [];
        const startIndex = virtualRow.index * columns;
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className={`absolute top-0 left-0 w-full ${gridClassName}`}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {row.map((item, colIndex) => {
              const index = startIndex + colIndex;
              return (
                <React.Fragment key={getItemKey ? getItemKey(item, index) : index}>
                  {renderItem(item, index)}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if (!useInnerScroll) {
    return (
      <div ref={parentRef} className={className}>
        {list}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto w-full ${className}`}
      style={{ maxHeight: heightStyle }}
    >
      {list}
    </div>
  );
}
