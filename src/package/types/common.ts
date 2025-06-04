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
