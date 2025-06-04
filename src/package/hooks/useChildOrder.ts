import React, { useState, useEffect, ReactElement } from "react";
import { ChildrenOrder } from "../types";

/**
 * Custom hook to manage the order of children elements, ensuring unique keys.
 * Provides the ordered children and their keys, and a function to update them.
 * @param children The initial array of React elements (children prop).
 * @returns An object containing `orderedChildren`, `orderedKeys`, and `updateChildren` function.
 * @throws Error if children do not have unique, non-null keys.
 * @author ቢኒያም ኪሮስ (Biniam Kiros)
 */
export const useChildOrder = (children: ReactElement[]): ChildrenOrder => {
  // State to store the internally ordered list of children.
  const [orderedChildren, setOrderedChildren] = useState(() => {
    if (!children || !Array.isArray(children) || children.length === 0) {
      return [];
    }
    // Extract keys and check for uniqueness during initial state setup.
    const keys = children
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new Error("All children must have unique, non-null keys.");
    }
    return children;
  });

  // State to store the keys of the ordered children.
  const [orderedKeys, setOrderedKeys] = useState(
    () =>
      orderedChildren
        .map((c) => c.key)
        .filter((key) => key !== null && key !== undefined) as string[]
  );

  // Effect to update children and keys when the `children` prop changes.
  useEffect(() => {
    if (!children || !Array.isArray(children) || children.length === 0) {
      console.warn(
        "useChildOrder: children is empty or invalid, setting empty state"
      );
      setOrderedChildren([]);
      setOrderedKeys([]);
      return;
    }

    // Re-check for unique keys on prop update.
    const keys = children
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      console.log("unique", uniqueKeys, "keys", keys);
      throw new Error("All children must have unique, non-null keys.");
    }

    setOrderedChildren(children); // Update ordered children.
    setOrderedKeys(keys as string[]); // Update ordered keys.
  }, [children]); // Re-run effect when `children` prop changes.

  /**
   * Function to programmatically update the ordered children.
   * Performs the same uniqueness check as initial setup and prop update.
   * @param newChildren The new array of React elements.
   */
  const updateChildren = (newChildren: ReactElement[]) => {
    if (
      !newChildren ||
      !Array.isArray(newChildren) ||
      newChildren.length === 0
    ) {
      console.warn(
        "useChildOrder: newChildren is empty or invalid, setting empty state"
      );
      setOrderedChildren([]);
      setOrderedKeys([]);
      return;
    }

    // Check for unique keys in the new children array.
    const keys = newChildren
      .map((c) => c.key)
      .filter((key) => key !== null && key !== undefined);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new Error("All children must have unique, non-null keys.");
    }

    setOrderedChildren(newChildren); // Update ordered children.
    setOrderedKeys(keys as string[]); // Update ordered keys.
  };

  return { orderedChildren, orderedKeys, updateChildren };
};
