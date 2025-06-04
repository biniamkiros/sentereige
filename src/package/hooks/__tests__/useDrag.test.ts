import { renderHook, act } from "@testing-library/react";
import { useDrag } from "../useDrag";

describe("useDrag hook", () => {
  const mockProps = {
    containerId: "test-container",
    containerGroupId: "test-group",
    containerRef: { current: document.createElement("div") },
    itemRefs: { current: { "test-key": document.createElement("div") } },
    positions: [],
    cloneRef: { current: null },
    lastTargetKeyRef: { current: null },
    reorderTimeRef: { current: 0 },
    cursorPosRef: { current: { x: 0, y: 0 } },
    dragHandleSelector: "",
    dragSources: [],
    isSortable: true,
    shiftPositions: jest.fn(),
    updateScrollState: jest.fn(),
    handleRemove: jest.fn(),
    handleItemMoved: jest.fn(),
    notifyItemMoved: jest.fn(),
    onItemClick: jest.fn(),
  };

  test("returns initial state and handlers", () => {
    const { result } = renderHook(() => useDrag(mockProps));

    expect(result.current.handleMouseDown).toBeDefined();
    expect(result.current.dragState).toEqual({
      dragOverId: null,
      draggingId: null,
      dragOffset: { x: 0, y: 0 },
    });
    expect(result.current.dispatch).toBeDefined();
  });

  test("handles mouse down event", () => {
    const { result } = renderHook(() => useDrag(mockProps));

    act(() => {
      const div = document.createElement("div");
      const event = new MouseEvent(
        "mousedown"
      ) as unknown as React.MouseEvent<HTMLDivElement>;
      Object.defineProperty(event, "target", { value: div });
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });

      result.current.handleMouseDown(event, "test-key");
    });

    expect(mockProps.onItemClick).not.toHaveBeenCalled();
  });
});
