import React, { useRef, useEffect, forwardRef, Ref } from "react";
import { useSpring, animated } from "react-spring";
import { LayoutItemProps } from "../types";

/**
 * `LayoutItem` component represents an individual draggable/sortable item.
 * It uses `react-spring` for smooth position and scale transitions.
 * It also measures its own size using `ResizeObserver` and reports it back.
 * @param props `LayoutItemProps`
 * @param ref Ref to the underlying div element.
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
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
