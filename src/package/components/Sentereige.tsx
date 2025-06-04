import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  ReactElement,
} from "react";
import { LayoutViewport } from "./LayoutViewport";
import { SentereigeProps } from "../types";
import {
  useChildOrder,
  useSequentialLayout,
  useAutoScroll,
  useDrag,
  useVirtualScroll,
  useScrollState,
} from "../hooks";

/**
 * `Sentereige` is the main container component that integrates all the custom hooks and components
 * to provide a sortable, virtualized, and auto-scrolling grid/list layout.
 * @param props `SentereigeProps`
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const Sentereige: React.FC<SentereigeProps> = ({
  id = "",
  groupId = "",
  mode = "grid",
  children,
  dragHandleSelector,
  dragSources = [],
  isSortable = false,
  onItemClick,
  onMovedEvent,
  style,
  options,
}) => {
  // Refs for drag state and DOM elements.
  const reorderTimeRef = useRef(0);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const lastTargetKeyRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the main scrollable container.
  const cloneRef = useRef<HTMLDivElement>(null); // Ref for the drag clone element.
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({}); // Map of item keys to their DOM elements.

  const [totalScrollHeight, setTotalScrollHeight] = useState(0); // State for the total scrollable height of the container.

  // Custom hook to manage the order of children and their keys.
  const { orderedChildren, orderedKeys, updateChildren } =
    useChildOrder(children);
  // Custom hook to track if the container is actively scrolling (for virtual scrolling debouncing).
  const isScrolling = useScrollState(
    containerRef,
    options?.scrollDebounceDelayMs ?? 100
  );

  // Custom hook for calculating and managing sequential (grid/list) layout positions.
  const { positions, confirmItemSize, shiftPositions, resetLayout } =
    useSequentialLayout({
      containerRef,
      gutter: options?.gutter ?? 0,
      orderedKeys,
      defaultItemWidth: options?.defaultItemWidth ?? 10,
      containerFallbackWidth: options?.containerFallbackWidth ?? 1000,
      defaultItemHeight: options?.defaultItemHeight ?? 300,
    });

  // Custom hook for auto-scrolling the container during drag operations.
  const { updateScrollState } = useAutoScroll({
    containerRef,
    scrollSpeed: options?.scrollSpeed ?? 2,
    scrollThreshold: options?.scrollThreshold ?? 300,
    autoScrollProximityPower: options?.autoScrollProximityPower ?? 3,
    autoScrollMinSpeedOffsetMultiplier:
      options?.autoScrollMinSpeedOffsetMultiplier ?? 0.1,
  });

  /**
   * Memoized callback to notify the parent component about an item move.
   * @param key The key of the moved item.
   * @param fromGroupId The group ID the item moved from.
   * @param fromIndex The index the item moved from.
   * @param toGroupId The group ID the item moved to (defaults to current container's ID).
   * @param toIndex The index the item moved to.
   */
  const notifyItemMoved = useCallback(
    (
      key: string,
      fromGroupId: string,
      fromIndex: number,
      toGroupId: string = id,
      toIndex: number
    ) => {
      onMovedEvent &&
        onMovedEvent(key, fromGroupId, fromIndex, toGroupId, toIndex);
    },
    [id, onMovedEvent] // Re-create if id or onMovedEvent changes.
  );

  /**
   * Memoized callback to handle an item being moved into this container (cross-drag).
   * It inserts the new child element at the specified hover index.
   * @param newChildElement The React element representing the item being moved in.
   * @param key The key of the item.
   * @param hoverOverIndex The target index to insert the item.
   */
  const handleItemMoved = useCallback(
    (newChildElement: ReactElement, key: string, hoverOverIndex: number) => {
      // Filter out the item if it already exists to ensure uniqueness.
      const filteredChildren = orderedChildren.filter((oc) => oc.key !== key);

      // Determine the correct insertion index, ensuring it's within bounds.
      const index =
        hoverOverIndex > filteredChildren.length
          ? filteredChildren.length
          : hoverOverIndex;

      // Create a new array with the moved item inserted at the new position.
      const newChildrenArray = [
        ...filteredChildren.slice(0, index),
        newChildElement,
        ...filteredChildren.slice(index),
      ];
      updateChildren(newChildrenArray); // Update the children order state.
    },
    [orderedChildren, updateChildren] // Re-create if orderedChildren or updateChildren changes.
  );

  /**
   * Memoized callback to handle removing an item from this container (e.g., when dragged out).
   * @param keyToRemove The key of the item to remove.
   */
  const handleRemove = useCallback(
    (keyToRemove: string) => {
      // Filter out the item to be removed from the ordered children.
      updateChildren(orderedChildren.filter((oc) => oc.key !== keyToRemove));
    },
    [orderedChildren, updateChildren] // Re-create if orderedChildren or updateChildren changes.
  );

  // Custom hook for core drag and drop logic.
  const { dragState, handleMouseDown } = useDrag({
    containerId: id,
    containerGroupId: groupId,
    containerRef,
    itemRefs,
    positions,
    cloneRef,
    lastTargetKeyRef,
    reorderTimeRef,
    cursorPosRef,
    dragHandleSelector,
    dragSources,
    isSortable,
    shiftPositions,
    updateScrollState,
    handleItemMoved: handleItemMoved, // Pass the handler for cross-container moves.
    handleRemove: handleRemove, // Pass the handler for removing items.
    notifyItemMoved, // Pass the callback to notify parent.
    onItemClick,
    longPressDelayMs: options?.longPressDelayMs ?? 100,
    longPressMoveTolerancePx: options?.longPressMoveTolerancePx ?? 50,
    cloneCleanupFallbackTimeoutMs:
      options?.cloneCleanupFallbackTimeoutMs ?? 500,
  });

  // Custom hook for virtual scrolling, determining which items are currently visible.
  const { start: visibleStart, end: visibleEnd } = useVirtualScroll(
    containerRef,
    orderedChildren.length,
    positions,
    isScrolling,
    options?.virtualScrollBuffer ?? 20
  );

  /**
   * Memoized callback passed to `LayoutItem` to confirm its measured size.
   * @param key The key of the item.
   * @param stage The stage of the item (e.g., 'unknown', 'measured').
   * @param width The measured width.
   * @param height The measured height.
   */
  const onConfirmItemSize = useCallback(
    (
      key: string | null,
      stage: "unknown" | "measured" | "moved" | "placed",
      width?: number,
      height?: number
    ) => {
      if (!width || !height || !key) return; // Only proceed if valid dimensions and key are provided.
      confirmItemSize(width, height, key, stage); // Call the layout hook's function to update size cache and recompute.
    },
    [confirmItemSize] // Re-create if confirmItemSize changes.
  );

  // Effect to update internal children order when the `children` prop changes.
  useEffect(() => {
    updateChildren(children);
  }, [children]); // Only re-run when the `children` prop array reference changes.

  // Effect to update the total scroll height of the container.
  useEffect(() => {
    const newContainerHeight = containerRef.current?.scrollHeight;
    if (newContainerHeight && newContainerHeight > totalScrollHeight) {
      setTotalScrollHeight(newContainerHeight); // Update if the new height is greater.
    }
  }, [visibleEnd]); // Triggered when visible range changes, implicitly after layout changes.

  // Effect to reset the layout when the `orderedChildren` state changes (i.e., after an item move or add/remove).
  useEffect(() => {
    resetLayout();
  }, [orderedChildren]); // Only re-run when the `orderedChildren` array reference changes.

  return (
    <LayoutViewport
      mode={mode}
      orderedChildren={orderedChildren}
      totalScrollHeight={totalScrollHeight}
      itemPositions={positions}
      visibleStart={visibleStart}
      visibleEnd={visibleEnd}
      onConfirmItemSize={onConfirmItemSize}
      draggingId={dragState.draggingId}
      handleMouseDown={handleMouseDown}
      containerRef={containerRef}
      itemRefs={itemRefs}
      isSortable={isSortable}
      style={style}
      reactSpringTension={options?.reactSpringTension ?? 250}
      reactSpringFriction={options?.reactSpringFriction ?? 25}
      layoutItemInitialScale={options?.layoutItemInitialScale ?? 0.5}
      layoutItemOpacityTransitionDurationS={
        options?.layoutItemOpacityTransitionDurationS ?? 0.3
      }
    />
  );
};
