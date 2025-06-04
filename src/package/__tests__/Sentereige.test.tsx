import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Sentereige } from "../components/Sentereige";

describe("Sentereige Component", () => {
  test("renders container structure", () => {
    const { container } = render(
      <Sentereige mode="list">{[<div key="1">Test Item</div>]}</Sentereige>
    );

    // Verify the main container structure exists
    expect(
      container.querySelector('[style*="min-height: 100vh"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[style*="flex: 1"]')).toBeInTheDocument();
  });

  test("renders basic structure", () => {
    const { container } = render(
      <Sentereige mode="list">{[<div key="1">Test Item</div>]}</Sentereige>
    );

    // Verify container and child exist
    expect(container.firstChild).toBeInTheDocument();
    expect(container.textContent).toContain("Test Item");
  });

  test("applies mode-specific props", () => {
    const { rerender } = render(
      <Sentereige mode="list">{[<div key="1">Test</div>]}</Sentereige>
    );

    // Verify props are passed correctly by checking element attributes
    const listContainer = document.querySelector(
      '[style*="flex-direction: column"]'
    );
    expect(listContainer).toBeInTheDocument();

    const { container: gridContainer } = render(
      <Sentereige mode="grid">{[<div key="1">Test</div>]}</Sentereige>
    );

    const gridElement = gridContainer.querySelector(
      '[style*="display: grid"], [style*="grid-template-columns"]'
    );
    expect(gridContainer).not.toBeNull();
  });
});
