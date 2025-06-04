import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useReducer,
  RefObject,
  forwardRef,
  Ref,
  ReactElement,
} from "react";
import { useSpring, animated } from "react-spring";

// --- Interfaces and Types ---

/**
 * Type alias for various mouse and touch events.
 * Used to handle both DOM and React events consistently.
 */
export type MouseOrTouchEvent =
  | MouseEvent
  | TouchEvent
  | React.MouseEvent<Element>
  | React.TouchEvent<Element>;

/**
 * Interface for an item's position and state within the layout.
 */
export interface ItemPosition {
  /** The stage of the item: 'unknown', 'measured', 'moved', or 'placed'. */
  stage: "unknown" | "measured" | "moved" | "placed";
  /** The current index of the item in the ordered list. */
  index: number;
  /** The left coordinate of the item relative to its container. */
  left: number;
  /** The top coordinate of the item relative to its container. */
  top: number;
  /** Optional width of the item, determined after measurement. */
  width?: number;
  /** Optional height of the item, determined after measurement. */
  height?: number;
  /** Unique key of the React element. */
  key: string | null;
}

/**
 * Interface for optional configuration settings of the Sentereige component.
 */
interface SentereigeOptions {
  /** Spacing between items in pixels. Default is 0. */
  gutter?: number;
  /** Speed of auto-scrolling when dragging near container edges. Default is 2. */
  scrollSpeed?: number;
  /** Distance from container edge to trigger auto-scroll. Default is 300px. */
  scrollThreshold?: number;
  /** Delay in milliseconds for long press to initiate drag. Default is 100ms. */
  longPressDelayMs?: number;
  /** Tolerance in pixels for initial mouse/touch movement before cancelling long press. Default is 50px. */
  longPressMoveTolerancePx?: number;
  /** Fallback timeout for drag clone cleanup in milliseconds. Default is 500ms. */
  cloneCleanupFallbackTimeoutMs?: number;
  /** Power coefficient for auto-scroll proximity speed calculation. Default is 3. */
  autoScrollProximityPower?: number;
  /** Multiplier for minimum auto-scroll speed offset. Default is 0.1. */
  autoScrollMinSpeedOffsetMultiplier?: number;
  /** Default width for items before they are measured. Default is 10px. */
  defaultItemWidth?: number;
  /** Fallback width for the container if its actual width is not available. Default is 1000px. */
  containerFallbackWidth?: number;
  /** Default height for items before they are measured. Default is 300px. */
  defaultItemHeight?: number;
  /** Debounce delay in milliseconds for scroll events. Default is 100ms. */
  scrollDebounceDelayMs?: number;
  /** Tension for react-spring animations. Default is 250. */
  reactSpringTension?: number;
  /** Friction for react-spring animations. Default is 25. */
  reactSpringFriction?: number;
  /** Initial scale for items during layout transitions. Default is 0.5. */
  layoutItemInitialScale?: number;
  /** Duration in seconds for opacity transition of layout items. Default is 0.3s. */
  layoutItemOpacityTransitionDurationS?: number;
  /** Buffer items to render outside the visible viewport for virtual scrolling. Default is 20. */
  virtualScrollBuffer?: number;
}

/**
 * Props for the main Sentereige component.
 */
interface SentereigeProps {
  /** Unique ID for this Sentereige instance. */
  id?: string;
  /** Group ID for cross-group dragging. */
  groupId?: string;
  /** Layout mode: 'list' for single column, 'grid' for multiple columns. */
  mode: "list" | "grid";
  /** Child React elements to be rendered and managed. */
  children: React.ReactElement[];
  /** CSS selector for a drag handle within an item. If not provided, the whole item is draggable. */
  dragHandleSelector?: string;
  /** Array of group IDs that can be dragged into this Sentereige instance. */
  dragSources?: string[];
  /** Whether items in this Sentereige instance are sortable. */
  isSortable?: boolean;
  /** Callback function when an item is clicked. */
  onItemClick?: (key: string) => void;
  /** Callback function when an item is moved (either within or across groups). */
  onMovedEvent?: (
    itemKey: string,
    fromGroupKey: string,
    fromPosition: number,
    goupToKey: string,
    toPosition: number
  ) => void;
  /** Custom CSS styles for the container. */
  style?: React.CSSProperties;
  /** Optional Sentereige configuration options. */
  options?: SentereigeOptions;
}

/**
 * State interface for the drag reducer.
 */
interface DragState {
  /** The key of the item currently being dragged over (hovered). */
  dragOverId: string | null;
  /** The key of the item currently being dragged. */
  draggingId: string | null;
  /** Offset of the mouse/touch from the top-left of the dragged item. */
  dragOffset: { x: number; y: number };
}

/**
 * Actions for the drag reducer.
 */
type DragAction =
  | {
      type: "START_DRAG";
      draggingIndex: number;
      draggingId: string;
      dragOffset: { x: number; y: number };
    }
  | {
      type: "CROSS_DRAG";
      draggingIndex: number;
      dragOverId: string; // The ID of the item being dragged over in the *new* container
      draggingId: string; // The ID of the item being dragged
      dragOffset: { x: number; y: number };
    }
  | {
      type: "UPDATE_DRAG";
      dragOverId: string | null;
      draggingId: string | null;
    }
  | { type: "END_DRAG" }
  | { type: "SETTLE_DRAG" };

/**
 * Props for the `useDrag` hook.
 */
interface DragProps {
  /** The ID of the Sentereige container. */
  containerId: string;
  /** The group ID of the Sentereige container. */
  containerGroupId: string;
  /** Ref to the container DOM element. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to a map of item DOM elements by their keys. */
  itemRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
  /** Current calculated positions of all items. */
  positions: ItemPosition[];
  /** Ref to the draggable clone DOM element. */
  cloneRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Ref to store the key of the last item hovered over during a drag. */
  lastTargetKeyRef: React.MutableRefObject<string | null>;
  /** Ref to store the timestamp of the last reorder. */
  reorderTimeRef: React.MutableRefObject<number>;
  /** Ref to store the current cursor position. */
  cursorPosRef: React.MutableRefObject<{ x: number; y: number }>;
  /** CSS selector for a drag handle. */
  dragHandleSelector?: string;
  /** Array of group IDs that can be dragged into this container. */
  dragSources: string[];
  /** Whether sorting is enabled. */
  isSortable: boolean;
  /** Function to shift item positions in the layout. */
  shiftPositions: (from: string, to: string) => void;
  /** Function to update auto-scroll state based on cursor position. */
  updateScrollState: (e: globalThis.MouseEvent | globalThis.TouchEvent) => void;
  /** Function to handle removing an item (e.g., when dragged out). */
  handleRemove: (keyToRemove: string) => void;
  /** Function to handle an item being moved into this container. */
  handleItemMoved: (child: ReactElement, key: string, toIndex: number) => void;
  /** Function to notify parent component about an item move. */
  notifyItemMoved: (
    key: string,
    fromGroupId: string,
    fromIndex: number,
    toGroupId: string,
    toIndex: number
  ) => void;
  /** Callback for item click. */
  onItemClick?: (key: string) => void;
  /** Delay for long press in milliseconds. */
  longPressDelayMs?: number;
  /** Move tolerance for long press in pixels. */
  longPressMoveTolerancePx?: number;
  /** Fallback timeout for clone cleanup. */
  cloneCleanupFallbackTimeoutMs?: number;
}

/**
 * Props for the `useAutoScroll` hook.
 */
interface AutoScrollProps {
  /** Ref to the scrollable container. */
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Base scroll speed. */
  scrollSpeed: number;
  /** Threshold distance from container edge to trigger auto-scroll. */
  scrollThreshold: number;
  /** Power coefficient for proximity-based scroll speed. */
  autoScrollProximityPower?: number;
  /** Multiplier for minimum speed offset. */
  autoScrollMinSpeedOffsetMultiplier?: number;
}

/**
 * Interface for the return value of `useChildOrder`.
 */
interface ChildrenOrder {
  /** The current ordered list of children React elements. */
  orderedChildren: ReactElement[];
  /** The keys of the ordered children. */
  orderedKeys: string[];
  /** Function to update the internal ordered children state. */
  updateChildren: (newChildren: ReactElement[]) => void;
}

/**
 * Props for the `LayoutViewport` component.
 */
interface LayoutViewportProps {
  /** Layout mode: 'list' or 'grid'. */
  mode: "list" | "grid";
  /** Total calculated scroll height of the content. */
  totalScrollHeight: number;
  /** The currently ordered list of children. */
  orderedChildren: React.ReactElement[];
  /** Calculated positions for all items. */
  itemPositions: ItemPosition[];
  /** Start index of visible items for virtual scrolling. */
  visibleStart: number;
  /** End index of visible items for virtual scrolling. */
  visibleEnd: number;
  /** Callback to confirm an item's measured size. */
  onConfirmItemSize?: (
    key: string | null,
    stage: "unknown" | "measured" | "moved" | "placed",
    width?: number,
    height?: number
  ) => void;
  /** The key of the item currently being dragged. */
  draggingId: string | null;
  /** Function to handle mouse/touch down events on items. */
  handleMouseDown: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    key: string
  ) => void;
  /** Ref to the container DOM element. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to a map of item DOM elements by their keys. */
  itemRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
  /** Whether sorting is enabled. */
  isSortable: boolean;
  /** Custom CSS styles for the viewport container. */
  style?: React.CSSProperties;
  /** Tension for react-spring animations. */
  reactSpringTension?: number;
  /** Friction for react-spring animations. */
  reactSpringFriction?: number;
  /** Initial scale for layout items. */
  layoutItemInitialScale?: number;
  /** Opacity transition duration for layout items. */
  layoutItemOpacityTransitionDurationS?: number;
}

/**
 * Props for the `LayoutItem` component.
 */
interface LayoutItemProps {
  /** The React element representing the child item. */
  child: React.ReactElement;
  /** Layout mode: 'list' or 'grid'. */
  mode: "list" | "grid";
  /** Current position and state of the item. */
  position: ItemPosition;
  /** Whether this item is currently being dragged. */
  isDragging: boolean;
  /** Function to handle mouse/touch down events on the item. */
  onMouseDown: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    key: string
  ) => void;
  /** Custom CSS styles for the item. */
  style?: React.CSSProperties;
  /** Callback to confirm the item's measured size. */
  onConfirmItemSize?: (
    key: string | null,
    stage: "unknown" | "measured" | "moved" | "placed",
    width?: number,
    height?: number
  ) => void;
  /** Whether sorting is enabled. */
  isSortable: boolean;
  /** Tension for react-spring animations. */
  reactSpringTension?: number;
  /** Friction for react-spring animations. */
  reactSpringFriction?: number;
  /** Initial scale for the item. */
  layoutItemInitialScale?: number;
  /** Opacity transition duration for the item. */
  layoutItemOpacityTransitionDurationS?: number;
}

// --- utils ---

/**
 * Extracts client X and Y coordinates from various mouse or touch events.
 * @param event The mouse or touch event.
 * @returns An object containing `xCoordinate` and `yCoordinate`.
 */
export const getEventCoords = (event: MouseOrTouchEvent) => {
  if (event instanceof TouchEvent && event.touches && event.touches[0]) {
    return {
      xCoordinate: event.touches[0].clientX,
      yCoordinate: event.touches[0].clientY,
    };
  }
  if (
    event instanceof TouchEvent &&
    event.changedTouches &&
    event.changedTouches[0]
  ) {
    return {
      xCoordinate: event.changedTouches[0].clientX,
      yCoordinate: event.changedTouches[0].clientY,
    };
  }
  // Fallback for MouseEvent or React synthetic events
  return {
    xCoordinate: (event as MouseEvent).clientX,
    yCoordinate: (event as MouseEvent).clientY,
  };
};
// --- Reducers ---

/**
 * Reducer function for managing drag state.
 * Handles starting, updating, cross-container, settling, and ending drag operations.
 * @param state The current drag state.
 * @param action The action to dispatch.
 * @returns The new drag state.
 */
const dragReducer = (state: DragState, action: DragAction): DragState => {
  switch (action.type) {
    case "START_DRAG":
      // Initiates a drag operation. Sets the dragging item, its offset, and clears dragOverId.
      return {
        ...state,
        dragOffset: action.dragOffset,
        draggingId: action.draggingId,
        dragOverId: null, // Clear dragOverId initially as drag has just started
      };
    case "CROSS_DRAG":
      // Handles dragging an item from a different container into the current one.
      // Updates dragging item and offset, clears dragOverId for new context.
      return {
        ...state,
        dragOffset: action.dragOffset,
        draggingId: action.draggingId,
        dragOverId: null, // Clear dragOverId to reflect entering a new container
      };
    case "UPDATE_DRAG":
      // Updates the currently dragged over item.
      return {
        ...state,
        dragOverId: action.dragOverId,
        draggingId: action.draggingId,
      };
    case "END_DRAG":
      // Ends the drag operation. Resets all drag-related state.
      return {
        ...state,
        dragOverId: null,
        draggingId: null,
        dragOffset: { x: 0, y: 0 },
      };

    case "SETTLE_DRAG":
      // Signals that the drag clone is settling into its final position.
      // Clears draggingId, but keeps dragOverId to allow final placement logic.
      return {
        ...state,
        draggingId: null,
      };
    default:
      // Default case, typically for unhandled actions or initial state.
      return {
        ...state,
        dragOverId: null,
        draggingId: null,
        dragOffset: { x: 0, y: 0 },
      };
  }
};

// --- Custom Hooks ---

/**
 * Custom hook for virtual scrolling, calculating which items are visible within a container.
 * @param containerRef Ref to the scrollable container.
 * @param itemCount Total number of items.
 * @param positions Array of item positions.
 * @param isScrolling Boolean indicating if the container is currently scrolling.
 * @param buffer Number of items to render above/below the visible viewport.
 * @returns An object containing `scrollTop`, `start` (index of first visible item), and `end` (index of last visible item + 1).
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
  }, [updateVisibleRange, containerRef, positions, isScrolling]); // Re-run effect if these dependencies change

  return visibleRange;
};

/**
 * Custom hook for auto-scrolling a container when the mouse cursor is near its edges.
 * @param containerRef Ref to the scrollable container.
 * @param scrollSpeed Base speed multiplier for scrolling.
 * @param scrollThreshold Distance from the container edge to trigger auto-scroll.
 * @param autoScrollProximityPower Power coefficient for non-linear speed increase based on proximity.
 * @param autoScrollMinSpeedOffsetMultiplier Multiplier for a minimum speed offset, ensuring some scroll even at threshold edge.
 * @returns An object containing `scrollState` (current scroll status and speed) and `updateScrollState` (function to update it).
 */
export const useAutoScroll = ({
  containerRef,
  scrollSpeed,
  scrollThreshold,
  autoScrollProximityPower = 3,
  autoScrollMinSpeedOffsetMultiplier = 0.1,
}: AutoScrollProps) => {
  // State to manage the current auto-scroll status and speed.
  const [scrollState, setScrollState] = useState<{
    isNearTop: boolean;
    isNearBottom: boolean;
    speed: number;
  }>({
    isNearTop: false,
    isNearBottom: false,
    speed: 0,
  });

  // Ref to store the current mouse position.
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Memoized callback to update the auto-scroll state based on mouse/touch position.
   * This function determines if the cursor is near the top or bottom edges of the container
   * and calculates an appropriate scroll speed.
   */
  const updateScrollState = useCallback(
    (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      const { xCoordinate, yCoordinate } = getEventCoords(e);
      mousePosRef.current = { x: xCoordinate, y: yCoordinate }; // Update cursor position ref

      if (!containerRef.current) {
        // If container ref is null, reset scroll state and return.
        setScrollState({ isNearTop: false, isNearBottom: false, speed: 0 });
        return;
      }

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect(); // Get container's bounding box
      const scrollTop = container.scrollTop; // Current scroll position from top
      const scrollHeight = container.scrollHeight; // Total scrollable height
      const clientHeight = container.clientHeight; // Visible height of the container

      // If content height is less than or equal to visible height, no scrolling is possible.
      if (scrollHeight <= clientHeight) {
        setScrollState({ isNearTop: false, isNearBottom: false, speed: 0 });
        return;
      }

      // Calculate the thresholds for triggering auto-scroll.
      const topThreshold = containerRect.top + scrollThreshold;
      const bottomThreshold = containerRect.bottom - scrollThreshold;
      // Calculate the maximum possible scroll speed.
      const maxScrollSpeed = 50 * scrollSpeed;

      let speed = 0;
      let isNearTop = false;
      let isNearBottom = false;

      // Check if cursor is near the top edge and can scroll up.
      if (yCoordinate < topThreshold && scrollTop > 0) {
        const distanceFromEdge = topThreshold - yCoordinate;
        // Calculate proximity (0 to 1), clamping at 1.
        const proximity = Math.min(distanceFromEdge / scrollThreshold, 1);
        // Calculate base speed using proximity and power coefficient for non-linear acceleration.
        const baseSpeed =
          maxScrollSpeed * proximity ** autoScrollProximityPower;
        // Determine final negative speed for upward scroll, adding a minimum offset.
        speed = -(
          baseSpeed +
          autoScrollMinSpeedOffsetMultiplier * maxScrollSpeed
        );
        isNearTop = true;
      } else if (
        // Check if cursor is near the bottom edge and can scroll down.
        yCoordinate > bottomThreshold &&
        scrollTop < scrollHeight - clientHeight
      ) {
        const distanceFromEdge = yCoordinate - bottomThreshold;
        // Calculate proximity (0 to 1), clamping at 1.
        const proximity = Math.min(distanceFromEdge / scrollThreshold, 1);
        // Calculate base speed using proximity and power coefficient.
        const baseSpeed =
          maxScrollSpeed * proximity ** autoScrollProximityPower;
        // Determine final positive speed for downward scroll, adding a minimum offset.
        speed = baseSpeed + autoScrollMinSpeedOffsetMultiplier * maxScrollSpeed;
        isNearBottom = true;
      }

      // Update the scroll state.
      setScrollState({ isNearTop, isNearBottom, speed });
    },
    [
      containerRef,
      scrollSpeed,
      scrollThreshold,
      autoScrollProximityPower,
      autoScrollMinSpeedOffsetMultiplier,
    ]
  );

  // Effect to manage the auto-scroll animation loop.
  useEffect(() => {
    if (!containerRef.current) return; // Do nothing if container is not available.

    const container = containerRef.current;
    let animationFrameId: number | null = null; // Store the ID of the requestAnimationFrame.

    /**
     * The continuous scroll loop function.
     * Uses requestAnimationFrame for smooth scrolling.
     */
    const scrollLoop = () => {
      if (scrollState.speed === 0) {
        // If speed is 0, stop the animation loop.
        animationFrameId = null;
        return;
      }

      // Scroll the container by the calculated speed.
      container.scrollBy(0, scrollState.speed);
      // Request the next animation frame to continue scrolling.
      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    // If auto-scroll is active (speed is non-zero), start the animation loop.
    if (scrollState.speed !== 0) {
      animationFrameId = requestAnimationFrame(scrollLoop);
    }

    // Cleanup function: cancel any pending animation frame when component unmounts or speed becomes 0.
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scrollState, containerRef]); // Re-run effect when scrollState or containerRef changes.

  return { scrollState, updateScrollState };
};

/**
 * Custom hook for managing drag and drop logic.
 * Handles long presses, drag clone creation, item reordering within a container,
 * and cross-container drag operations.
 * @param props Props object containing all necessary refs, state, and callbacks.
 * @returns An object with `handleMouseDown` (to initiate drag) and `dragState` (current drag status).
 */
export const useDrag = ({
  containerId,
  containerGroupId,
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
  handleRemove,
  handleItemMoved,
  notifyItemMoved,
  onItemClick,
  longPressDelayMs = 100,
  longPressMoveTolerancePx = 50,
  cloneCleanupFallbackTimeoutMs = 500,
}: DragProps) => {
  // Ref to store the ID of the pending requestAnimationFrame, used to throttle mousemove events.
  const frameRequest = useRef<number | null>(null);

  // Ref for the long press timer.
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to store initial coordinates when a press starts, used for long press tolerance.
  const initialPressCoordsRef = useRef<{ x: number; y: number } | null>(null);
  // Ref to store the key of the item that is a potential drag candidate during a long press.
  const potentialDragKeyRef = useRef<string | null>(null);

  // Ref to store the key of the item that was initially pressed, for click handling.
  const initialPressKeyRef = useRef<string | null>(null);
  // Refs to ensure latest callback functions are used within memoized handlers.
  const onClickRef = useRef(onItemClick);
  const handleRemoveRef = useRef(handleRemove);
  const handleItemMovedRef = useRef(handleItemMoved);
  const notifyItemMovedRef = useRef(notifyItemMoved);
  const shiftPositionsRef = useRef(shiftPositions);
  const updateScrollStateRef = useRef(updateScrollState);

  // Reducer for managing the core drag state.
  const [dragState, dispatch] = useReducer(dragReducer, {
    dragOverId: null,
    draggingId: null,
    dragOffset: { x: 0, y: 0 },
  });

  /**
   * Helper function to find the innermost DIV element containing the drag content.
   * This is specific to how the child React elements are wrapped in divs.
   * @param element The HTML element from which to extract drag content.
   * @returns The content DIV element or null.
   */
  const getDragContent = (element: HTMLElement): HTMLElement | null => {
    let divCount = 0;
    // Recursive traversal to find the third nested DIV.
    const traverse = (node: Node): HTMLElement | null => {
      if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "DIV") {
        divCount++;
        if (divCount === 3) return node as HTMLElement; // Found the target div
      }
      return Array.from(node.childNodes).reduce<HTMLElement | null>(
        (found, child) => found || traverse(child),
        null
      );
    };
    return traverse(element);
  };

  /**
   * Finds the index of an item in the `positions` array given its key.
   * @param key The key of the item.
   * @returns The index of the item, or -1 if not found.
   */
  const getPositionIndex = (key: string) =>
    positions.findIndex((p) => p.key === key);

  /**
   * Checks if the given coordinates are within the bounds of the container rectangle.
   * @param x X coordinate.
   * @param y Y coordinate.
   * @param rect Bounding client rect of the container.
   * @returns True if coordinates are over the container, false otherwise.
   */
  const isOverContainer = (x: number, y: number, rect: DOMRect) => {
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  };

  /**
   * Checks if the given coordinates hit a specific item's position.
   * Accounts for container's scroll position.
   * @param x X coordinate.
   * @param y Y coordinate.
   * @param pos The `ItemPosition` object to check against.
   * @param containerRect Bounding client rect of the container.
   * @param scrollTop Current scroll position of the container.
   * @returns True if coordinates hit the item, false otherwise.
   */
  const isPositionHit = (
    x: number,
    y: number,
    pos: any, // ItemPosition type
    containerRect: DOMRect,
    scrollTop: number
  ) => {
    if (!pos.width || !pos.height) return false;

    // Calculate absolute screen coordinates for the item.
    const posLeft = containerRect.left + pos.left;
    const posRight = posLeft + pos.width;
    // Adjust item's top position by container's scroll.
    const posTop = containerRect.top + pos.top - scrollTop;
    const posBottom = posTop + pos.height;

    // Check if the given coordinates are within the item's bounds.
    return x >= posLeft && x <= posRight && y >= posTop && y <= posBottom;
  };

  /**
   * Creates and appends a drag clone element to the document body.
   * The clone is a visual representation of the dragged item.
   * @param original The original DOM element of the dragged item.
   * @param key The key of the dragged item.
   * @param index The original index of the dragged item.
   * @param offsetX X offset of the mouse from the item's left edge.
   * @param offsetY Y offset of the mouse from the item's top edge.
   * @param rect Bounding client rect of the original item.
   * @returns The created clone HTMLDivElement.
   */
  const createDragClone = (
    original: HTMLDivElement,
    key: string,
    index: number,
    offsetX: number,
    offsetY: number,
    rect: DOMRect
  ) => {
    const clone = original.cloneNode(true) as HTMLDivElement; // Deep clone the element

    clone.classList.add("drag-clone"); // Add a class for styling and identification

    // Set custom data attributes on the clone for drag tracking.
    const attributes = {
      "data-clone-id": containerId, // ID of the container where the drag started
      "data-group-id": containerGroupId, // Group ID of the container
      "data-source-id": containerId, // The source container ID
      "data-source-index": index.toString(), // The original index in the source container
      "data-offset-x": offsetX.toString(), // Mouse offset from left
      "data-offset-y": offsetY.toString(), // Mouse offset from top
      "data-key": key, // The key of the dragged item
      "data-state": "new", // Initial state of the clone
    };

    // Apply data attributes to the clone.
    Object.entries(attributes).forEach(([name, value]) => {
      clone.setAttribute(name, value);
    });

    // Apply inline styles for fixed positioning and appearance.
    Object.assign(clone.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: "1000", // Ensure clone is above other content
      cursor: "grabbing", // Indicate dragging state
    });

    document.body.appendChild(clone); // Add clone to the document body
    return clone;
  };

  /**
   * Cleans up the drag clone element from the DOM.
   * Includes a transition for smooth disappearance and a fallback timeout for cleanup.
   */
  const cleanupDragClone = useCallback(() => {
    if (!cloneRef.current) return; // If no clone, do nothing.

    const cleanup = () => {
      if (cloneRef.current?.parentNode) {
        document.body.removeChild(cloneRef.current); // Remove from DOM
      }
      cloneRef.current = null; // Clear the ref
    };

    if (cloneRef.current.parentNode) {
      // Add a transition to make the clone smoothly move to its final position before removal.
      cloneRef.current.style.transition =
        "left 0.3s ease-in-out, top 0.4s ease-in-out";

      const handleTransitionEnd = () => cleanup();
      // Listen for the end of the transition.
      cloneRef.current.addEventListener("transitionend", handleTransitionEnd);

      // Set a fallback timeout in case transitionend doesn't fire (e.g., if styles are overridden).
      setTimeout(() => {
        cloneRef.current?.removeEventListener(
          "transitionend",
          handleTransitionEnd
        ); // Remove listener to prevent memory leaks
        cleanup(); // Perform cleanup regardless
      }, cloneCleanupFallbackTimeoutMs);
    } else {
      // If clone is not in DOM (e.g., already removed), just clear ref.
      cleanup();
    }
  }, [cloneRef, cloneCleanupFallbackTimeoutMs]);

  /**
   * Handles the mouse/touch down event on an item.
   * Initiates a long press timer, or triggers an item click if not sortable/draggable.
   * @param e The mouse or touch event.
   * @param key The key of the item that was pressed.
   */
  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      key: string
    ) => {
      initialPressKeyRef.current = key; // Store the key of the initially pressed item.

      // If a drag handle is specified and the event target is not within it, or if not sortable,
      // then treat this as a click and return.
      if (
        (dragHandleSelector &&
          !(e.target as Element).closest(dragHandleSelector)) ||
        !isSortable
      ) {
        if (onClickRef.current) {
          onClickRef.current(initialPressKeyRef.current); // Call click handler
        }
        return;
      }

      // Clear any existing long press timer to prevent multiple triggers.
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      initialPressCoordsRef.current = null; // Reset initial coordinates
      potentialDragKeyRef.current = null; // Reset potential drag key

      cleanupDragClone(); // Ensure any leftover drag clones are removed.
      lastTargetKeyRef.current = null; // Reset the last target for reordering.

      const { xCoordinate, yCoordinate } = getEventCoords(e);
      reorderTimeRef.current = Date.now(); // Record the start time of the interaction.
      initialPressCoordsRef.current = { x: xCoordinate, y: yCoordinate }; // Store initial press coordinates.
      potentialDragKeyRef.current = key; // Store the key of the item being potentially dragged.

      const draggedItem = itemRefs.current[key];
      if (!draggedItem) {
        console.warn(`Stagrid: itemRef for key ${key} is null`);
        return;
      }

      // Start the long press timer. If the mouse doesn't move significantly within this delay,
      // a drag operation will be initiated.
      longPressTimerRef.current = setTimeout(() => {
        // If no potential drag key or initial coordinates, or if timer was cleared, do nothing.
        if (!potentialDragKeyRef.current || !initialPressCoordsRef.current) {
          return;
        }

        const currentKey = potentialDragKeyRef.current;
        const initialCoords = initialPressCoordsRef.current;

        // Check if the mouse has moved beyond the tolerance during the long press delay.
        const currentMouseX = cursorPosRef.current.x;
        const currentMouseY = cursorPosRef.current.y;
        const distance = Math.sqrt(
          Math.pow(currentMouseX - initialCoords.x, 2) +
            Math.pow(currentMouseY - initialCoords.y, 2)
        );

        if (distance > longPressMoveTolerancePx) {
          // If moved too far, cancel long press and reset refs.
          longPressTimerRef.current = null;
          initialPressCoordsRef.current = null;
          potentialDragKeyRef.current = null;
          return;
        }

        reorderTimeRef.current = Date.now(); // Update reorder time.

        const draggedItem = itemRefs.current[currentKey];
        if (!draggedItem) {
          console.warn(
            `Stagrid: itemRef for key ${currentKey} is null during long press initiation`
          );
          // If item is not found, cancel long press.
          longPressTimerRef.current = null;
          initialPressCoordsRef.current = null;
          potentialDragKeyRef.current = null;
          return;
        }

        const fromIndex = getPositionIndex(currentKey); // Get initial index of the dragged item.
        const rect = draggedItem.getBoundingClientRect(); // Get dimensions and position of the item.
        const offsetX = currentMouseX - rect.left; // Calculate offset from item's left edge.
        const offsetY = currentMouseY - rect.top; // Calculate offset from item's top edge.

        lastTargetKeyRef.current = null; // Reset target key for a new drag.

        // Create the draggable clone element.
        cloneRef.current = createDragClone(
          draggedItem,
          currentKey,
          fromIndex,
          offsetX,
          offsetY,
          rect
        );

        // Dispatch action to start drag, updating state.
        dispatch({
          type: "START_DRAG",
          draggingIndex: fromIndex,
          draggingId: currentKey,
          dragOffset: { x: offsetX, y: offsetY },
        });

        // Clear long press related refs after drag has started.
        longPressTimerRef.current = null;
        initialPressCoordsRef.current = null;
        potentialDragKeyRef.current = null;
      }, longPressDelayMs);
    },
    [
      cloneRef,
      dragHandleSelector,
      isSortable,
      itemRefs,
      positions,
      containerId,
      containerGroupId,
      cleanupDragClone,
      longPressTimerRef,
      initialPressCoordsRef,
      potentialDragKeyRef,
      reorderTimeRef,
      dispatch,
      cursorPosRef,
      onClickRef,
      initialPressKeyRef,
      longPressDelayMs,
      longPressMoveTolerancePx,
    ]
  );

  /**
   * Handles the mouse/touch move event.
   * Updates the position of the drag clone, identifies hovered items, and triggers reordering or cross-container moves.
   * Throttled using requestAnimationFrame.
   * @param e The mouse or touch event.
   */
  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      const { xCoordinate, yCoordinate } = getEventCoords(e);
      cursorPosRef.current = { x: xCoordinate, y: yCoordinate }; // Always update cursor position.

      // If a long press timer is active and no drag has started, check for movement tolerance.
      if (longPressTimerRef.current && !dragState.draggingId) {
        if (initialPressCoordsRef.current) {
          const distance = Math.sqrt(
            Math.pow(xCoordinate - initialPressCoordsRef.current.x, 2) +
              Math.pow(yCoordinate - initialPressCoordsRef.current.y, 2)
          );

          if (distance > longPressMoveTolerancePx) {
            // If moved too far during long press delay, cancel the long press.
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            initialPressCoordsRef.current = null;
            potentialDragKeyRef.current = null;
            return;
          }
        }
        return; // If still in long press delay and within tolerance, do not proceed with drag logic.
      }

      // If a frame request is pending (throttling), or if not sortable, or if clone is settling, return.
      if (frameRequest.current || !isSortable) return;
      if (
        (cloneRef.current && cloneRef.current.dataset.state == "settling") ||
        (cloneRef.current && cloneRef.current.dataset.state == undefined)
      )
        return;

      // Request next animation frame for smooth updates.
      frameRequest.current = requestAnimationFrame(() => {
        frameRequest.current = null; // Clear the request ID once executed.
        const { xCoordinate, yCoordinate } = getEventCoords(e); // Get latest coordinates.
        const clone = document.querySelector(".drag-clone") as HTMLElement; // Get the active drag clone.

        // --- Handle case where clone exists but belongs to another container (dragged OUT) ---
        if (
          cloneRef.current &&
          cloneRef.current.parentNode &&
          cloneRef.current.dataset.cloneId !== containerId
        ) {
          // If the clone's source ID is not this container's ID, it means it's being dragged out.
          handleRemoveRef.current(cloneRef.current.dataset.key!); // Call remove handler.
          cloneRef.current = null; // Clear clone ref.
          dispatch({ type: "END_DRAG" }); // End drag state.
          lastTargetKeyRef.current = null; // Reset last target.
          return;
        }

        if (!clone || !containerRef.current) return; // If no clone or container, nothing to do.

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;

        // --- Handle dragging WITHIN the current container ---
        if (
          clone.dataset.key &&
          clone.dataset.groupId === containerGroupId && // Ensure it belongs to this group
          dragState.draggingId && // Ensure there is an active dragging ID
          positions.some(
            (p) => p.key === dragState.draggingId || p.key === clone.dataset.key
          ) // Ensure the item being dragged is still relevant to current positions
        ) {
          // Update clone's position to follow the cursor, adjusted by initial offset.
          const newLeft = xCoordinate - dragState.dragOffset.x;
          const newTop = yCoordinate - dragState.dragOffset.y;
          clone.style.left = `${newLeft}px`;
          clone.style.top = `${newTop}px`;

          if (clone.dataset.state == "new")
            cloneRef.current?.setAttribute("data-state", "active"); // Mark clone as active.

          let hoveredPositionIndex = -1;
          // Iterate through all item positions to find which one is being hovered over.
          positions.forEach((pos, index) => {
            if (
              isPositionHit(
                xCoordinate,
                yCoordinate,
                pos,
                containerRect,
                scrollTop
              )
            ) {
              dragState.dragOverId = pos.key; // Set the drag over ID.
              hoveredPositionIndex = index;
              clone.setAttribute("data-pos", `${index}`); // Update clone's data-pos attribute.
            }
          });

          // If no item is hovered, clear dragOverId.
          if (hoveredPositionIndex === -1) {
            dragState.dragOverId = null;
          }

          // If an item is hovered, and it's a new target, perform reordering.
          if (
            hoveredPositionIndex !== -1 &&
            dragState.draggingId !== dragState.dragOverId &&
            lastTargetKeyRef.current !== dragState.dragOverId
          ) {
            // Shift positions in the layout.
            shiftPositionsRef.current(
              dragState.draggingId,
              dragState.dragOverId!
            );
            lastTargetKeyRef.current = dragState.dragOverId; // Update last target key.
            // Dispatch update to drag state.
            dispatch({
              type: "UPDATE_DRAG",
              dragOverId: dragState.dragOverId,
              draggingId: dragState.draggingId,
            });

            cursorPosRef.current = { x: xCoordinate, y: yCoordinate }; // Update cursor position.
            reorderTimeRef.current = Date.now(); // Update reorder timestamp.
          }
        } else if (clone.dataset.key && clone.dataset.cloneId !== containerId) {
          // --- Handle dragging FROM another container INTO this one ---
          // Check conditions for accepting a cross-container drag.
          if (
            !isOverContainer(xCoordinate, yCoordinate, containerRect) || // Must be over this container
            clone.dataset.groupId !== containerGroupId || // Must belong to the same group
            clone.dataset.cloneId === containerId || // Must not be from this container initially
            clone.dataset.state !== "active" || // Clone must be active, not new/settling
            (dragSources.length > 0 && !dragSources.includes(containerId)) // If dragSources are specified, this container must be one.
          ) {
            return;
          }

          cloneRef.current = clone as HTMLDivElement; // Assign the external clone to this container's cloneRef.
          clone.dataset.cloneId = containerId; // Update clone's source ID to this container.

          let hoverOverIndex = 0;
          let hoverOverKey = "";

          // Find the item being hovered over within this container's positions.
          positions.forEach((pos, index) => {
            if (
              isPositionHit(
                xCoordinate,
                yCoordinate,
                pos,
                containerRect,
                scrollTop
              )
            ) {
              hoverOverIndex = index;
              hoverOverKey = pos.key!;
            }
          });

          // Extract the actual React element content from the clone.
          const thirdDiv = getDragContent(clone);
          const innerMostDiv = thirdDiv
            ? React.createElement("div", {
                dangerouslySetInnerHTML: { __html: thirdDiv.outerHTML },
              })
            : React.createElement("div", {
                dangerouslySetInnerHTML: { __html: clone.outerHTML },
              });

          // Clone the element with its key.
          const innerMostDivWithKey = React.cloneElement(innerMostDiv, {
            key: clone.dataset.key,
          });

          // Call the handler to add the item to this container's children.
          handleItemMovedRef.current(
            innerMostDivWithKey,
            clone.dataset.key,
            hoverOverIndex
          );

          // Dispatch a cross-drag action to update state.
          dispatch({
            type: "CROSS_DRAG",
            draggingIndex: 0, // Index is not relevant for cross-drag start in new container
            dragOverId: hoverOverKey,
            draggingId: clone.dataset.key,
            dragOffset: {
              x: Number(clone.dataset.offsetX), // Use original offset
              y: Number(clone.dataset.offsetY),
            },
          });
        }

        updateScrollStateRef.current(e); // Update auto-scroll state based on mouse position.
      });
    },
    [
      dragState,
      containerRef,
      cloneRef,
      positions,
      isSortable,
      shiftPositions,
      handleItemMoved,
      handleRemove,
      containerId,
      containerGroupId,
      dragSources,
      dispatch,
      cursorPosRef,
      longPressTimerRef,
      initialPressCoordsRef,
      potentialDragKeyRef,
      longPressMoveTolerancePx,
    ]
  );

  /**
   * Handles the mouse/touch up event, ending the drag operation.
   * Cleans up the drag clone, dispatches the END_DRAG action, and notifies about item moves.
   * @param e The mouse or touch event.
   */
  const handleMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      // Clear any active long press timer.
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      potentialDragKeyRef.current = null; // Reset potential drag key.

      // If no drag was active (it was just a press/click), check if it was a valid click.
      if (
        !dragState.draggingId &&
        initialPressCoordsRef.current &&
        onClickRef.current &&
        initialPressKeyRef.current
      ) {
        const { xCoordinate, yCoordinate } = getEventCoords(e);
        const initialCoords = initialPressCoordsRef.current;
        const distance = Math.sqrt(
          Math.pow(xCoordinate - initialCoords.x, 2) +
            Math.pow(yCoordinate - initialCoords.y, 2)
        );

        // If movement was within tolerance, trigger the click handler.
        if (distance <= longPressMoveTolerancePx) {
          onClickRef.current(initialPressKeyRef.current);
        }
      }
      initialPressCoordsRef.current = null; // Clear initial press coords.
      initialPressKeyRef.current = null; // Clear initial press key.

      // Mark the clone as "settling" for visual feedback during cleanup.
      cloneRef.current?.setAttribute("data-state", "settling");
      // Dispatch SETTLE_DRAG to update drag state, allowing clone to settle.
      dispatch({ type: "SETTLE_DRAG" });

      // Cancel any pending animation frame request.
      if (frameRequest.current) {
        cancelAnimationFrame(frameRequest.current);
        frameRequest.current = null;
      }

      // If no item was actively dragging or no clone exists, return.
      if (!dragState.draggingId || !cloneRef.current) return;

      // If the clone's source ID is not this container's ID, it means it was dragged out.
      if (cloneRef.current.dataset.cloneId !== containerId) {
        handleRemove(dragState.draggingId); // Call remove handler.
        return;
      }

      // Get the original item's DOM element for final position.
      const draggedItem = itemRefs.current[dragState.draggingId];
      if (!draggedItem) {
        console.error("Item not found", dragState.draggingId);
        // Fallback cleanup if item is missing.
        if (cloneRef.current?.parentNode) {
          document.body.removeChild(cloneRef.current);
        }
        cloneRef.current = null;
        lastTargetKeyRef.current = null;
        return;
      }

      const rect = draggedItem.getBoundingClientRect(); // Get the final position of the original item.

      // Position the clone to animate to the original item's final position.
      Object.assign(cloneRef.current.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
      });

      const current = cloneRef.current;
      if (!current) {
        console.warn("Stagrid: Clone ref is not available");
        cloneRef.current = null;
        lastTargetKeyRef.current = null;
        return;
      }

      // Extract relevant data from the clone for the `onMovedEvent` callback.
      const itemKey = current.dataset.key;
      const groupId = containerId; // Current container is the destination group.
      const sourceId = current.dataset.sourceId; // Original source container ID.
      const sourceIndex = Number(current.dataset.sourceIndex); // Original index in source.
      const toIndex = getPositionIndex(itemKey!); // Final index in the current container.

      // Notify the parent component about the item's move.
      if (
        itemKey &&
        groupId &&
        sourceId &&
        !isNaN(sourceIndex) &&
        toIndex > -1
      ) {
        // Only notify if there was an actual change in group or position.
        if (groupId !== sourceId || sourceIndex !== toIndex) {
          notifyItemMovedRef.current?.(
            itemKey,
            sourceId,
            sourceIndex,
            groupId,
            toIndex
          );
        }
      } else {
        console.warn("Stagrid: Invalid move operation", {
          itemKey,
          groupId,
          sourceId,
          sourceIndex,
          toIndex,
        });
      }

      cleanupDragClone(); // Perform final cleanup of the clone.
      dispatch({ type: "END_DRAG" }); // End the drag state.
      lastTargetKeyRef.current = null; // Clear last target.
    },
    [
      cloneRef,
      dragState.draggingId,
      itemRefs,
      containerId,
      handleRemove,
      cleanupDragClone,
      dispatch,
      longPressTimerRef,
      initialPressCoordsRef,
      potentialDragKeyRef,
      notifyItemMoved,
      positions,
      onClickRef,
      initialPressKeyRef,
      longPressMoveTolerancePx,
    ]
  );

  // Effect to attach and detach global event listeners for drag operations.
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);

    // Update refs to ensure latest callback functions are used.
    onClickRef.current = onItemClick;
    handleRemoveRef.current = handleRemove;
    handleItemMovedRef.current = handleItemMoved;
    notifyItemMovedRef.current = notifyItemMoved;
    shiftPositionsRef.current = shiftPositions;
    updateScrollStateRef.current = updateScrollState;

    // Cleanup function: remove all event listeners and clear long press timer.
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, [
    handleMouseMove,
    handleMouseUp,
    longPressTimerRef, // Added longPressTimerRef to dependencies to ensure cleanup always works
    handleRemove,
    handleItemMoved,
    notifyItemMoved,
    shiftPositions,
    updateScrollState,
    onItemClick,
  ]); // Re-run effect if these dependencies change.

  return { handleMouseDown, dragState, dispatch };
};

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

/**
 * Custom hook to track whether a scrollable element is currently scrolling.
 * Uses a debounce mechanism to determine the scrolling state.
 * @param containerRef Ref to the scrollable HTMLElement.
 * @param scrollDebounceDelayMs The delay in milliseconds after which scrolling is considered stopped.
 * @returns `true` if currently scrolling, `false` otherwise.
 */
export const useScrollState = (
  containerRef: React.RefObject<HTMLElement | null>,
  scrollDebounceDelayMs = 100
) => {
  const [isScrolling, setIsScrolling] = useState(false);
  // Ref to store the timeout ID for debouncing.
  const scrollTimeoutRef = useRef<string | number | NodeJS.Timeout | undefined>(
    null
  );

  /**
   * Event handler for scroll events. Sets `isScrolling` to true and
   * sets a timeout to set it back to false after a delay.
   */
  const handleScroll = () => {
    setIsScrolling(true); // Indicate that scrolling has started.
    // Clear any existing timeout to reset the debounce timer.
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // Set a new timeout to mark scrolling as false after the debounce delay.
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, scrollDebounceDelayMs);
  };

  // Effect to attach and detach the scroll event listener.
  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      // Attach scroll listener in passive mode for performance.
      element.addEventListener("scroll", handleScroll, { passive: true });
      // Cleanup function: remove listener and clear any pending timeout.
      return () => {
        element.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [containerRef, scrollDebounceDelayMs]); // Re-run effect if containerRef or debounce delay changes.

  return isScrolling;
};

/**
 * Custom hook to manage the order of children elements, ensuring unique keys.
 * Provides the ordered children and their keys, and a function to update them.
 * @param children The initial array of React elements (children prop).
 * @returns An object containing `orderedChildren`, `orderedKeys`, and `updateChildren` function.
 * @throws Error if children do not have unique, non-null keys.
 */
export const useChildOrder = (children: ReactElement[]): ChildrenOrder => {
  // State to store the internally ordered list of children.
  const [orderedChildren, setOrderedChildren] = useState(() => {
    if (!children || !Array.isArray(children) || children.length === 0) {
      return [];
    }
    // Extract keys and check for uniqueness during initial state setup.
    const keys = children
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new Error("All children must have unique, non-null keys.");
    }
    return children;
  });

  // State to store the keys of the ordered children.
  const [orderedKeys, setOrderedKeys] = useState(
    () =>
      orderedChildren
        .map((c) => c.key)
        .filter((key) => key !== null && key !== undefined) as string[]
  );

  // Effect to update children and keys when the `children` prop changes.
  useEffect(() => {
    if (!children || !Array.isArray(children) || children.length === 0) {
      console.warn(
        "useChildOrder: children is empty or invalid, setting empty state"
      );
      setOrderedChildren([]);
      setOrderedKeys([]);
      return;
    }

    // Re-check for unique keys on prop update.
    const keys = children
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      console.log("unique", uniqueKeys, "keys", keys);
      throw new Error("All children must have unique, non-null keys.");
    }

    setOrderedChildren(children); // Update ordered children.
    setOrderedKeys(keys as string[]); // Update ordered keys.
  }, [children]); // Re-run effect when `children` prop changes.

  /**
   * Function to programmatically update the ordered children.
   * Performs the same uniqueness check as initial setup and prop update.
   * @param newChildren The new array of React elements.
   */
  const updateChildren = (newChildren: ReactElement[]) => {
    if (
      !newChildren ||
      !Array.isArray(newChildren) ||
      newChildren.length === 0
    ) {
      console.warn(
        "useChildOrder: newChildren is empty or invalid, setting empty state"
      );
      setOrderedChildren([]);
      setOrderedKeys([]);
      return;
    }

    // Check for unique keys in the new children array.
    const keys = newChildren
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new Error("All children must have unique, non-null keys.");
    }

    setOrderedChildren(newChildren); // Update ordered children.
    setOrderedKeys(keys as string[]); // Update ordered keys.
  };

  return { orderedChildren, orderedKeys, updateChildren };
};

// --- Components ---

/**
 * `LayoutViewport` component renders the scrollable container and visible `LayoutItem`s.
 * It's responsible for integrating virtual scrolling, layout calculation, and drag functionality.
 * @param props `LayoutViewportProps`
 */
export const LayoutViewport: React.FC<LayoutViewportProps> = ({
  mode,
  orderedChildren,
  itemPositions,
  visibleStart,
  visibleEnd,
  onConfirmItemSize,
  draggingId,
  handleMouseDown,
  containerRef,
  itemRefs,
  isSortable,
  style,
  reactSpringTension,
  reactSpringFriction,
  layoutItemInitialScale,
  layoutItemOpacityTransitionDurationS,
}) => {
  // Slice the itemPositions array to only include positions for visible items.
  const visiblePositions = itemPositions.slice(
    Math.max(visibleStart, 0), // Ensure start index is not negative.
    Math.min(visibleEnd, itemPositions.length) // Ensure end index does not exceed array length.
  );

  // Filter the orderedChildren to only include those present in `visiblePositions`.
  const visibleChildren = orderedChildren.filter((child) =>
    visiblePositions.some((pos) => pos.key === child.key)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        ref={containerRef} // Assign the container ref for scrolling and layout calculations.
        style={{
          position: "relative", // Required for absolute positioning of children.
          flex: 1, // Allows container to fill available height.
          overflowY: "auto", // Enables vertical scrolling.
          overflowAnchor: "none", // Prevents scroll jumps when content above changes.
        }}
      >
        {visibleChildren.map((child, index) => {
          // Find the corresponding position for each visible child.
          const pos = itemPositions.find((ef) => ef.key === child.key);
          return (
            pos && (
              // Render `LayoutItem` for each visible child.
              <LayoutItem
                key={child.key} // Essential for React's reconciliation.
                child={child}
                mode={mode}
                position={pos}
                isDragging={draggingId === pos.key} // Pass whether this specific item is being dragged.
                onMouseDown={handleMouseDown} // Pass down the drag initiation handler.
                onConfirmItemSize={onConfirmItemSize} // Pass down the size confirmation callback.
                isSortable={isSortable}
                reactSpringTension={reactSpringTension}
                reactSpringFriction={reactSpringFriction}
                layoutItemInitialScale={layoutItemInitialScale}
                layoutItemOpacityTransitionDurationS={
                  layoutItemOpacityTransitionDurationS
                }
                ref={(el) => {
                  // Assign the DOM element ref to `itemRefs` for drag calculations.
                  if (
                    child.key !== null &&
                    child.key !== undefined &&
                    itemRefs.current
                  ) {
                    itemRefs.current[child.key] = el;
                  }
                }}
              />
            )
          );
        })}
      </div>
    </div>
  );
};

/**
 * `LayoutItem` component represents an individual draggable/sortable item.
 * It uses `react-spring` for smooth position and scale transitions.
 * It also measures its own size using `ResizeObserver` and reports it back.
 * @param props `LayoutItemProps`
 * @param ref Ref to the underlying div element.
 */
export const LayoutItem = forwardRef<HTMLDivElement, LayoutItemProps>(
  (
    {
      child,
      mode,
      position,
      isDragging,
      onMouseDown,
      style,
      onConfirmItemSize,
      isSortable,
      reactSpringTension = 250,
      reactSpringFriction = 25,
      layoutItemInitialScale = 0.5,
      layoutItemOpacityTransitionDurationS = 0.3,
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const itemRef = useRef<HTMLDivElement>(null); // Internal ref for the item's root div.

    // Flags for different stages of the item's lifecycle.
    const isHidden = position.stage == "unknown"; // Item is hidden before it's measured.
    const isPlaced = position.stage == "placed"; // Item has settled into its final position.
    const isNew = position.stage == "measured"; // Item has just been measured for the first time.
    const isMoved = position.stage == "moved"; // Item has just been moved (reordered).

    // Effect to measure item size using ResizeObserver.
    useEffect(() => {
      if (!itemRef.current || !onConfirmItemSize) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            // Report measured size and stage back to the layout hook.
            onConfirmItemSize(
              child.key,
              position.stage == "unknown" ? "measured" : "placed", // If 'unknown', first measurement makes it 'measured', otherwise 'placed'.
              width,
              height
            );
          }
        }
      });

      resizeObserver.observe(itemRef.current); // Start observing the item's DOM element.

      return () => {
        resizeObserver.disconnect(); // Disconnect observer on unmount or dependency change.
      };
    }, [onConfirmItemSize, child.key, position.stage, mode]); // Re-run if these dependencies change.

    // react-spring hook for smooth position transitions.
    const positionProps = useSpring({
      to: {
        left: position.left,
        top: position.top,
      },
      config: { tension: reactSpringTension, friction: reactSpringFriction },
      immediate: isDragging, // Skip animation if currently dragging.
    });

    // react-spring hook for smooth scale transitions (for initial appearance).
    const scaleProps = useSpring({
      to: {
        scale: isMoved || isPlaced ? 1 : layoutItemInitialScale, // Scale to 1 if placed/moved, otherwise use initial scale.
      },
      config: { tension: reactSpringTension, friction: reactSpringFriction },
    });

    return (
      <animated.div
        ref={(node) => {
          // Assign both internal ref and external forwarded ref.
          itemRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
          }
        }}
        data-grid-item // Custom data attribute for identification.
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) =>
          isSortable // Only enable drag initiation if sortable.
            ? position.key !== undefined && position.key !== null // Ensure item has a key.
              ? onMouseDown(e, position.key) // Call the drag initiation handler.
              : console.log("Child without key")
            : null
        }
        onTouchStart={(e: React.TouchEvent<HTMLDivElement>) =>
          isSortable // Same for touch events.
            ? position.key !== undefined && position.key !== null
              ? onMouseDown(e, position.key)
              : console.log("Child without key")
            : null
        }
        style={{
          position: "absolute", // Absolute positioning within the viewport.
          visibility: isHidden ? "hidden" : "visible", // Hide if unknown stage, show otherwise.
          width: mode === "list" ? "100%" : "auto", // Full width for list mode, auto for grid.
          display: "inline-flex", // For flexible content within.
          cursor: isDragging ? "grabbing" : "grab", // Change cursor based on drag state.
          // Apply position animation props if item is placed and not new, otherwise apply static position.
          ...(isPlaced && !isNew
            ? positionProps
            : { left: position.left, top: position.top }),
          // Opacity transition: instant if dragging, otherwise a delayed transition.
          transition: `opacity 0s ${
            isDragging ? "0s" : `${layoutItemOpacityTransitionDurationS}s`
          }`,
          opacity: isDragging ? 0 : 1, // Hide the original item when dragging.
          ...style, // Apply any custom styles.
        }}
      >
        {/* Render the actual child content. */}
        <animated.div
          // Apply scale animation if not a new item, otherwise static width.
          style={!isNew ? { ...scaleProps, width: "100%" } : { width: "100%" }}
        >
          {child}
        </animated.div>
      </animated.div>
    );
  }
);

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
