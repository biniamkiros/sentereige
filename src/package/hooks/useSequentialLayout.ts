import { useRef, useCallback, RefObject } from "react";
import { ItemPosition } from "../types";

/**
 * Custom hook for calculating item positions in a sequential (list or grid) layout.
 * Manages item size caching, dynamic column calculation, and position updates.
 * @param containerRef Ref to the container DOM element.
 * @param gutter Spacing between items.
 * @param orderedKeys Array of item keys in their current display order.
 * @param defaultItemWidth Default width for items before they are measured.
 * @param containerFallbackWidth Fallback width for the container.
 * @param defaultItemHeight Default height for items before they are measured.
 * @returns An object with `positions` (calculated ItemPosition array), `confirmItemSize` (to update item dimensions),
 * `shiftPositions` (to reorder items), `recalculatePositions` (to re-layout), and `resetLayout` (to force a full recalculation).
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const useSequentialLayout = ({
  containerRef,
  gutter,
  orderedKeys,
  defaultItemWidth = 10,
  containerFallbackWidth = 1000,
  defaultItemHeight = 300,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  gutter: number;
  orderedKeys: string[];
  defaultItemWidth?: number;
  containerFallbackWidth?: number;
  defaultItemHeight?: number;
}) => {
  // Ref to store the current order of keys, managed internally.
  const keysRef = useRef(orderedKeys);
  // Ref to store the calculated layout positions.
  const layoutRef = useRef({
    positions: [] as ItemPosition[],
  });
  // Ref to cache measured item sizes and their stage.
  const itemSizeCache = useRef({
    pairs: [] as {
      key: string;
      width: number;
      height: number;
      stage: "unknown" | "measured" | "moved" | "placed";
    }[],
  });
  // Refs to store column information for grid layout.
  const columns = useRef<number[]>([]);
  const columnWidth = useRef<number>(0);

  /**
   * Resets the layout by updating internal keys and recomputing the layout.
   */
  const resetLayout = () => {
    keysRef.current = orderedKeys; // Re-sync internal keys with prop.
    computeLayout(); // Recompute layout based on new keys.
  };

  /**
   * Calculates the next position for an item in the layout based on current layout state.
   * For grid, it finds the shortest column. For list, it's sequential.
   * @param index The target index for the new item.
   * @returns An object with `left` and `top` coordinates.
   */
  const calcNextItemPosition = (index: number) => {
    const { positions } = layoutRef.current;
    if (!positions.length) return { left: 0, top: 0 }; // If no existing items, place at (0,0).

    const gutterX = Math.max(0, gutter); // Ensure gutter is non-negative.
    // Use the width of the first cached item or default.
    const width = itemSizeCache.current.pairs[0]?.width || defaultItemWidth;
    // Get container width or fallback.
    const containerWidth =
      containerRef.current?.offsetWidth ?? containerFallbackWidth;
    // Calculate number of columns. At least 1 column.
    const cols = Math.max(
      1,
      Math.floor((containerWidth + gutterX) / (width + gutterX))
    );

    const colWidth = width + gutterX; // Column width including gutter.

    // Initialize column heights for all columns to 0.
    const colHeights = new Array(cols).fill(0);
    // Populate column heights based on already placed items up to the current index.
    positions.slice(0, index).forEach((pos) => {
      const min = Math.min(...colHeights); // Find the shortest column.
      // Add item height (plus gutter) to the shortest column.
      colHeights[colHeights.indexOf(min)] +=
        (pos.height ?? defaultItemHeight) + gutterX;
    });

    const min = Math.min(...colHeights); // Find the shortest column after previous items are placed.
    // Calculate left position (column index * column width) and top position (min height).
    return {
      left: colHeights.indexOf(min) * colWidth,
      top: min,
    };
  };

  /**
   * Memoized callback to compute the full layout of all items.
   * Iterates through `orderedKeys` and calculates each item's position based on its size and preceding items.
   * @param lastMeasuredKey Optional key of the last item whose size was confirmed, used to update its stage.
   */
  const computeLayout = useCallback(
    (lastMeasuredKey: string = "") => {
      layoutRef.current.positions = []; // Reset positions for recalculation.

      let unknownRendered = false; // Flag to stop rendering "unknown" items after the first one.
      keysRef.current.forEach((key, index) => {
        // Try to find the item's size and stage in the cache.
        const { width, height, stage } =
          itemSizeCache.current.pairs.find((d) => d.key == key) ?? {};

        if (width && height && stage) {
          // If size is known, calculate its position.
          const { left, top } = calcNextItemPosition(
            layoutRef.current.positions.length
          );
          // Determine the item's stage for animation purposes.
          const updateStage =
            lastMeasuredKey == key && stage == "measured" // Just measured, move to 'moved'
              ? "moved"
              : lastMeasuredKey == key && stage == "moved" // Was moved, now settled, move to 'placed'
              ? "placed"
              : "placed"; // Already placed

          // Add the item's position to the layout.
          layoutRef.current.positions[layoutRef.current.positions.length] = {
            stage: updateStage,
            index: layoutRef.current.positions.length,
            left: left,
            top: top,
            width: width,
            height: height,
            key,
          };
        } else if (unknownRendered == false) {
          // If size is unknown and no 'unknown' item has been rendered yet,
          // render this item as 'unknown' so it can be measured.
          const { left, top } = calcNextItemPosition(
            layoutRef.current.positions.length
          );
          layoutRef.current.positions[layoutRef.current.positions.length] = {
            stage: "unknown",
            index: layoutRef.current.positions.length,
            left: left,
            top: top,
            key,
          };
          unknownRendered = true; // Set flag to prevent rendering more 'unknown' items.
        }
      });
    },
    [
      gutter,
      containerRef,
      defaultItemWidth,
      containerFallbackWidth,
      defaultItemHeight,
    ]
  );

  /**
   * Recalculates positions of all items, useful after container resize or significant layout changes.
   * This version re-calculates from the beginning, assigning items to the shortest column.
   * @param from (Unused in current implementation, but kept for potential future partial recalculations)
   */
  const recalculatePositions = useCallback(
    (from: number = 0) => {
      const effectiveGutter = Math.max(0, gutter);
      if (!layoutRef.current.positions.length) {
        console.warn("No positions available");
        return;
      }
      const newOrderedPositions = [...layoutRef.current.positions];
      const itemWidth = newOrderedPositions[0]?.width; // Assuming all items have the same width.
      if (!itemWidth || isNaN(itemWidth)) {
        console.warn("Invalid item width");
        return;
      }

      const containerWidth =
        containerRef.current?.offsetWidth ?? containerFallbackWidth;
      // Calculate column count based on available width and item width.
      const columnCount = Math.max(
        1,
        Math.floor(
          (containerWidth + effectiveGutter) / (itemWidth + effectiveGutter)
        )
      );

      const newColumnWidth = itemWidth + effectiveGutter;
      // Initialize column heights for the new layout.
      const newColumns = new Array(columnCount).fill(0);

      let nextColumnIndex = 0; // Not used in this version of the algorithm, but could be for sequential column filling.
      const newPositions: ItemPosition[] = [];

      // Iterate through current positions to reassign them to columns.
      newOrderedPositions.forEach((pos, index) => {
        const minHeight = Math.min(...newColumns); // Find the shortest column.
        const colIndex = newColumns.indexOf(minHeight); // Get the index of the shortest column.

        // Calculate left position based on column index and column width.
        const left = Math.floor(colIndex * (newColumnWidth + effectiveGutter));
        const top = minHeight; // Top position is the current height of the shortest column.
        const itemHeight =
          (pos && pos.height ? pos.height : defaultItemHeight) +
          effectiveGutter; // Get item's height (with fallback) + gutter.

        const newPos = {
          stage: pos.stage,
          key: pos.key,
          index,
          left,
          top,
          width: pos.width,
          height: pos.height,
        };
        newPositions.push(newPos); // Add the newly calculated position.

        newColumns[colIndex] += itemHeight; // Update the height of the column.
      });

      // Update the layout ref with the new positions.
      layoutRef.current = {
        positions: newPositions,
      };

      // Store column information.
      columnWidth.current = newColumnWidth;
      columns.current = newColumns;
    },

    [gutter, containerRef, layoutRef, containerFallbackWidth, defaultItemHeight]
  );

  /**
   * Shifts an item's position in the `orderedKeys` array and then recomputes the layout.
   * @param from The key of the item to move.
   * @param to The key of the item to move it next to.
   */
  const shiftPositions = useCallback(
    (from: string, to: string) => {
      if (!layoutRef.current.positions.length) {
        console.warn("No positions available");
        return;
      }
      const newKeys = [...keysRef.current]; // Create a mutable copy of the keys.
      const fromIndex = newKeys.findIndex((key) => key === from); // Find index of item to move.
      const toIndex = newKeys.findIndex((key) => key === to); // Find index of target item.

      if (fromIndex === -1 || toIndex === -1) {
        console.warn("One or both keys not found", {
          from,
          to,
          keys: keysRef.current,
        });
        return;
      }
      // Remove the item from its original position and insert it at the new position.
      const [keyElement] = newKeys.splice(fromIndex, 1);
      newKeys.splice(toIndex, 0, keyElement);
      keysRef.current = newKeys; // Update the internal keys ref.

      // Also update the positions array directly to reflect the order change immediately.
      // This is a temporary reordering of the positions array itself, then `computeLayout` will recalculate coordinates.
      const newPositions = [...layoutRef.current.positions];
      const fromPosIndex = newPositions.findIndex((pos) => pos.key === from);
      const toPosIndex = newPositions.findIndex((pos) => pos.key === to);

      if (fromPosIndex === -1 || toPosIndex === -1) {
        console.warn("One or both positions not found");
        return;
      }
      const [posElement] = newPositions.splice(fromPosIndex, 1);
      newPositions.splice(toPosIndex, 0, posElement);
      layoutRef.current.positions = newPositions;

      computeLayout(); // Recompute the actual X/Y coordinates based on the new order.
    },
    [keysRef, containerRef, computeLayout]
  );

  /**
   * Confirms and caches an item's measured size, then triggers a layout recomputation.
   * @param width The measured width of the item.
   * @param height The measured height of the item.
   * @param key The key of the item.
   * @param stage The stage of the item (e.g., 'measured', 'placed').
   * @returns The updated ItemPosition for the item, or undefined if not found.
   */
  const confirmItemSize = useCallback(
    (
      width: number,
      height: number,
      key: string,
      stage: "unknown" | "measured" | "moved" | "placed"
    ) => {
      const index = layoutRef.current.positions.findIndex((p) => p.key === key);

      if (index < 0) return; // Item not found in current positions.

      if (key) {
        const pairIndex = itemSizeCache.current.pairs.findIndex(
          (p) => p.key === key
        );
        if (pairIndex !== -1) {
          // Update existing entry in cache.
          itemSizeCache.current.pairs[pairIndex] = {
            key,
            width,
            height,
            stage,
          };
        } else {
          // Add new entry to cache.
          itemSizeCache.current.pairs.push({ key, width, height, stage });
        }
      }
      computeLayout(key); // Recompute the layout using the newly confirmed size.
      return layoutRef.current.positions[index]; // Return the updated position.
    },
    [gutter, containerRef, columnWidth, layoutRef]
  );

  return {
    positions: layoutRef.current.positions, // Expose the current positions.
    confirmItemSize,
    shiftPositions,
    recalculatePositions,
    resetLayout,
  };
};
