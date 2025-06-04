import React, { RefObject, ReactElement, Ref } from "react";
import { ItemPosition } from "./common";
import { SentereigeOptions } from "./options";

/**
 * Props for the main Sentereige component.
 */
export interface SentereigeProps {
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
 * Props for the `LayoutViewport` component.
 */
export interface LayoutViewportProps {
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
export interface LayoutItemProps {
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
