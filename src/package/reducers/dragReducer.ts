import { DragState, DragAction } from "../types";

/**
 * Reducer function for managing drag state.
 * Handles starting, updating, cross-container, settling, and ending drag operations.
 * @param state The current drag state.
 * @param action The action to dispatch.
 * @returns The new drag state.
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const dragReducer = (
  state: DragState,
  action: DragAction
): DragState => {
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
