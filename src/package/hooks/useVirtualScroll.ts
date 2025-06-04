import React, { useRef, useEffect, useCallback, useState } from "react";
import { ItemPosition } from "../types";

/**
 * Custom hook for virtual scrolling, calculating which items are visible within a container.
 * @param containerRef Ref to the scrollable container.
 * @param itemCount Total number of items.
 * @param positions Array of item positions.
 * @param isScrolling Boolean indicating if the container is currently scrolling.
 * @param buffer Number of items to render above/below the visible viewport.
 * @returns An object containing `scrollTop`, `start` (index of first visible item), and `end` (index of last visible item + 1).
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const useVirtualScroll = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemCount: number,
  positions: ItemPosition[],
  isScrolling: boolean,
  buffer = 20
) => {
  // State to hold the current visible range (start and end indices) and scroll position.
  const [visibleRange, setVisibleRange] = useState({
    scrollTop: 0,
    start: 0,
    end: Math.min(positions.length, itemCount - 1) + 1,
  });

  /**
   * Memoized callback to update the visible range.
   * This function performs the core logic for determining which items should be rendered.
   */
  const updateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    // If container is not available, or no positions/items, or currently scrolling (to avoid excessive updates),
    // then do not update the visible range.
    if (
      isScrolling ||
      !container ||
      !positions ||
      positions.length === 0 ||
      itemCount === 0
    ) {
      return;
    }

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const scrollBottom = scrollTop + viewportHeight;

    let startIdx = 0;
    let endIdx = itemCount - 1;

    // Binary search to find the first visible item
    // The loop condition `startIdx <= endIdx` defines the search space.
    while (startIdx <= endIdx) {
      const mid = Math.floor((startIdx + endIdx) / 2);
      const position = positions[mid];

      // If position is missing or height is undefined, use a fallback linear search.
      if (!position || position.height === undefined) {
        startIdx = findFirstVisible(0, scrollTop);
        break;
      }

      const itemBottom = position.top + position.height;
      const itemTop = position.top;

      // Check if the current item is within the viewport
      if (itemBottom > scrollTop && itemTop < scrollBottom) {
        // If the item is visible, try to find an earlier item (search in the left half).
        endIdx = mid - 1;
      } else if (itemBottom <= scrollTop) {
        // If the item is completely above the viewport, search in the right half.
        startIdx = mid + 1;
      } else {
        // If the item is completely below the viewport, search in the left half.
        endIdx = mid - 1;
      }
    }

    // Apply buffer to the start index, ensuring it doesn't go below 0.
    startIdx = Math.max(0, Math.min(startIdx, itemCount - 1) - buffer);
    startIdx = Math.max(0, startIdx); // Ensure start is not negative

    let firstInvisibleIdx = itemCount;
    let low = 0;
    let high = itemCount - 1;

    // Binary search to find the first item that is completely below the viewport (or beyond).
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const position = positions[mid];

      // If position is missing, use a fallback linear search.
      if (!position) {
        firstInvisibleIdx = findLastVisible(0, scrollBottom);
        break;
      }

      // If the item's top is below the scroll bottom, it's potentially the first invisible.
      if (position.top > scrollBottom) {
        firstInvisibleIdx = mid;
        high = mid - 1; // Search for an earlier invisible item
      } else {
        low = mid + 1; // Item is visible, search for later invisible item
      }
    }

    // Apply buffer to the end index, ensuring it doesn't exceed total items.
    endIdx = Math.min(
      itemCount - 1,
      firstInvisibleIdx + buffer - 1,
      positions.length // Cap at actual positions length
    );

    // Update the state with the new visible range.
    setVisibleRange({
      scrollTop: scrollTop,
      start: scrollTop <= 0 ? 0 : startIdx, // If at top, always start from 0
      end: endIdx + 1, // 'end' is exclusive, so add 1
    });

    /**
     * Helper function to linearly find the first visible item from a given index.
     * Used as a fallback if binary search fails due to incomplete position data.
     */
    function findFirstVisible(from: number, scrollPos: number): number {
      for (let i = from; i < itemCount; i++) {
        const pos = positions[i];
        if (
          pos &&
          pos.height !== undefined &&
          pos.top + pos.height > scrollPos
        ) {
          return i;
        }
      }
      return itemCount - 1; // Return last item if none found
    }

    /**
     * Helper function to linearly find the last visible item from a given index.
     * Used as a fallback if binary search fails due to incomplete position data.
     */
    function findLastVisible(from: number, scrollPos: number): number {
      for (let i = from; i < itemCount; i++) {
        const pos = positions[i];
        if (pos && pos.top > scrollPos) {
          return i; // This is the first item that is entirely below scrollPos
        }
      }
      return itemCount - 1; // Return last item if all are visible
    }
  }, [containerRef, itemCount, positions, buffer, isScrolling]);

  // Effect to set up scroll and resize listeners for the container.
  useEffect(() => {
    const container = containerRef.current;
    // Do nothing if container is not available or if scrolling is debounced (to avoid conflicts).
    if (!container || isScrolling) return;

    // Initial update of the visible range when component mounts or dependencies change.
    updateVisibleRange();

    // Listener for scroll events, debounced using requestAnimationFrame.
    const scrollListener = () => requestAnimationFrame(updateVisibleRange);
    // Observer for container resize events.
    const resizeObserver = new ResizeObserver(updateVisibleRange);

    // Attach event listeners.
    container.addEventListener("scroll", scrollListener, { passive: true });
    resizeObserver.observe(container);

    // Cleanup function to remove listeners when component unmounts or dependencies change.
    return () => {
      container.removeEventListener("scroll", scrollListener);
      resizeObserver.disconnect();
    };
  }, [updateVisibleRange, containerRef, positions, isScrolling]); // Re-run effect if these dependencies change.

  return visibleRange;
};
