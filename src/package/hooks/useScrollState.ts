import React, { useRef, useEffect, useState } from "react";

/**
 * Custom hook to track whether a scrollable element is currently scrolling.
 * Uses a debounce mechanism to determine the scrolling state.
 * @param containerRef Ref to the scrollable HTMLElement.
 * @param scrollDebounceDelayMs The delay in milliseconds after which scrolling is considered stopped.
 * @returns `true` if currently scrolling, `false` otherwise.
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const useScrollState = (
  containerRef: React.RefObject<HTMLElement | null>,
  scrollDebounceDelayMs = 100
) => {
  const [isScrolling, setIsScrolling] = useState(false);
  // Ref to store the timeout ID for debouncing.
  const scrollTimeoutRef = useRef<string | number | NodeJS.Timeout | undefined>(
    null
  );

  /**
   * Event handler for scroll events. Sets `isScrolling` to true and
   * sets a timeout to set it back to false after a delay.
   */
  const handleScroll = () => {
    setIsScrolling(true); // Indicate that scrolling has started.
    // Clear any existing timeout to reset the debounce timer.
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // Set a new timeout to mark scrolling as false after the debounce delay.
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, scrollDebounceDelayMs);
  };

  // Effect to attach and detach the scroll event listener.
  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      // Attach scroll listener in passive mode for performance.
      element.addEventListener("scroll", handleScroll, { passive: true });
      // Cleanup function: remove listener and clear any pending timeout.
      return () => {
        element.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [containerRef, scrollDebounceDelayMs]); // Re-run effect if containerRef or debounce delay changes.

  return isScrolling;
};
