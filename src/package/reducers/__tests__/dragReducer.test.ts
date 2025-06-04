import { dragReducer } from "../dragReducer";
import { DragAction } from "../../types";

describe("dragReducer", () => {
  const initialState = {
    dragOverId: null,
    draggingId: null,
    dragOffset: { x: 0, y: 0 },
  };

  test("handles START_DRAG action", () => {
    const action: DragAction = {
      type: "START_DRAG",
      draggingId: "item1",
      draggingIndex: 0,
      dragOffset: { x: 10, y: 20 },
    };

    const state = dragReducer(initialState, action);
    expect(state).toEqual({
      dragOverId: null,
      draggingId: "item1",
      dragOffset: { x: 10, y: 20 },
    });
  });

  test("handles UPDATE_DRAG action", () => {
    const action: DragAction = {
      type: "UPDATE_DRAG",
      dragOverId: "item2",
      draggingId: "item1",
    };

    const state = dragReducer({ ...initialState, draggingId: "item1" }, action);
    expect(state).toEqual({
      dragOverId: "item2",
      draggingId: "item1",
      dragOffset: { x: 0, y: 0 },
    });
  });

  test("handles END_DRAG action", () => {
    const action: DragAction = {
      type: "END_DRAG",
    };

    const state = dragReducer(
      {
        dragOverId: "item2",
        draggingId: "item1",
        dragOffset: { x: 10, y: 20 },
      },
      action
    );
    expect(state).toEqual(initialState);
  });
});
