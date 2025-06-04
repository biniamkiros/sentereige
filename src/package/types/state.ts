/**
 * State interface for the drag reducer.
 */
export interface DragState {
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
export type DragAction =
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
