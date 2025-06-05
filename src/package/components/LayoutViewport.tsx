import { FC } from "react";
import { LayoutItem } from "./LayoutItem";
import { LayoutViewportProps } from "../types";

/**
 * `LayoutViewport` component renders the scrollable container and visible `LayoutItem`s.
 * It's responsible for integrating virtual scrolling, layout calculation, and drag functionality.
 * @param props `LayoutViewportProps`
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const LayoutViewport: FC<LayoutViewportProps> = ({
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
        minHeight: "500px", // if items are overflown, if not add items + 1
        // height: "100%",
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
