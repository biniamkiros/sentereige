/**
 * Interface for optional configuration settings of the Sentereige component.
 */
export interface SentereigeOptions {
  /** Spacing between items in pixels. Default is 0. */
  gutter?: number;
  /** Speed of auto-scrolling when dragging near container edges. Default is 2. */
  scrollSpeed?: number;
  /** Distance from container edge to trigger auto-scroll. Default is 300px. */
  scrollThreshold?: number;
  /** Delay in milliseconds for long press to initiate drag. Default is 100ms. */
  longPressDelayMs?: number;
  /** Tolerance in pixels for initial mouse/touch movement before cancelling long press. Default is 50px. */
  longPressMoveTolerancePx?: number;
  /** Fallback timeout for drag clone cleanup in milliseconds. Default is 500ms. */
  cloneCleanupFallbackTimeoutMs?: number;
  /** Power coefficient for auto-scroll proximity speed calculation. Default is 3. */
  autoScrollProximityPower?: number;
  /** Multiplier for minimum auto-scroll speed offset. Default is 0.1. */
  autoScrollMinSpeedOffsetMultiplier?: number;
  /** Default width for items before they are measured. Default is 10px. */
  defaultItemWidth?: number;
  /** Fallback width for the container if its actual width is not available. Default is 1000px. */
  containerFallbackWidth?: number;
  /** Default height for items before they are measured. Default is 300px. */
  defaultItemHeight?: number;
  /** Debounce delay in milliseconds for scroll events. Default is 100ms. */
  scrollDebounceDelayMs?: number;
  /** Tension for react-spring animations. Default is 250. */
  reactSpringTension?: number;
  /** Friction for react-spring animations. Default is 25. */
  reactSpringFriction?: number;
  /** Initial scale for items during layout transitions. Default is 0.5. */
  layoutItemInitialScale?: number;
  /** Duration in seconds for opacity transition of layout items. Default is 0.3s. */
  layoutItemOpacityTransitionDurationS?: number;
  /** Buffer items to render outside the visible viewport for virtual scrolling. Default is 20. */
  virtualScrollBuffer?: number;
}
