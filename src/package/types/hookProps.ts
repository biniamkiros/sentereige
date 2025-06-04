import React, { ReactElement } from "react";
import { ItemPosition, MouseOrTouchEvent } from "./common";
import { DragAction, DragState } from "./state";

/**
 * Props for the `useDrag` hook.
 */
export interface DragProps {
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
export interface AutoScrollProps {
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
export interface ChildrenOrder {
  /** The current ordered list of children React elements. */
  orderedChildren: ReactElement[];
  /** The keys of the ordered children. */
  orderedKeys: string[];
  /** Function to update the internal ordered children state. */
  updateChildren: (newChildren: ReactElement[]) => void;
}
