import { MouseOrTouchEvent } from "../types";

/**
 * Extracts client X and Y coordinates from various mouse or touch events.
 * @param event The mouse or touch event.
 * @returns An object containing `xCoordinate` and `yCoordinate`.
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
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
