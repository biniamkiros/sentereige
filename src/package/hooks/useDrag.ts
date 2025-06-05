import {
  MouseEvent,
  TouchEvent,
  createElement,
  cloneElement,
  useRef,
  useEffect,
  useCallback,
  useReducer,
} from "react";
import { DragProps } from "../types";
import { dragReducer } from "../reducers";
import { getEventCoords } from "../utils";

/**
 * Custom hook for managing drag and drop logic.
 * Handles long presses, drag clone creation, item reordering within a container,
 * and cross-container drag operations.
 * @param props Props object containing all necessary refs, state, and callbacks.
 * @returns An object with `handleMouseDown` (to initiate drag) and `dragState` (current drag status).
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
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
      e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>,
      key: string
    ) => {
      initialPressKeyRef.current = key; // Store the key of the initially pressed item.
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
        console.warn(`DragItemRef for key ${key} is null`);
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
            `drag itemRef for key ${currentKey} is null during long press initiation`
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
            ? createElement("div", {
                dangerouslySetInnerHTML: { __html: thirdDiv.outerHTML },
              })
            : createElement("div", {
                dangerouslySetInnerHTML: { __html: clone.outerHTML },
              });

          // Clone the element with its key.
          const innerMostDivWithKey = cloneElement(innerMostDiv, {
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
    (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
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
        console.error("Drag item not found", dragState.draggingId);
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
        console.warn("Drag item ref is not available");
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
        // groupId &&
        // sourceId &&
        !isNaN(sourceIndex) &&
        toIndex > -1
      ) {
        // Only notify if there was an actual change in group or position.
        if (groupId !== sourceId || sourceIndex !== toIndex) {
          notifyItemMovedRef.current?.(
            itemKey,
            sourceId ?? "",
            sourceIndex,
            groupId,
            toIndex
          );
        } else {
          console.warn("No change in move operation", {
            itemKey,
            groupId,
            sourceId,
            sourceIndex,
            toIndex,
          });
        }
      } else {
        console.warn("Invalid move operation", {
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
