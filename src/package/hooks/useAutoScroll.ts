import React, { useRef, useEffect, useCallback, useState } from "react";
import { AutoScrollProps } from "../types";
import { getEventCoords } from "../utils";

/**
 * Custom hook for auto-scrolling a container when the mouse cursor is near its edges.
 * @param containerRef Ref to the scrollable container.
 * @param scrollSpeed Base speed multiplier for scrolling.
 * @param scrollThreshold Distance from the container edge to trigger auto-scroll.
 * @param autoScrollProximityPower Power coefficient for non-linear speed increase based on proximity.
 * @param autoScrollMinSpeedOffsetMultiplier Multiplier for a minimum speed offset, ensuring some scroll even at threshold edge.
 * @returns An object containing `scrollState` (current scroll status and speed) and `updateScrollState` (function to update it).
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
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
   * This function performs the core logic for determining if the cursor is near the top or bottom edges of the container
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
