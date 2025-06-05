import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Sentereige } from "../package/components";
import { showToast } from "./utils/toast";

const meta: Meta<typeof Sentereige> = {
  title: "Components/Kanban",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const initialColumns = [
  {
    id: "col1",
    title: "To Do",
    cards: Array.from({ length: 10 }, (_, i) => ({
      id: `todo-${i + 1}`,
      content: `Task ${i + 1}`,
      color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
    })),
  },
  {
    id: "col2",
    title: "In Progress",
    cards: Array.from({ length: 5 }, (_, i) => ({
      id: `progress-${i + 1}`,
      content: `Task ${i + 1}`,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`,
    })),
  },
  {
    id: "col3",
    title: "Done",
    cards: Array.from({ length: 3 }, (_, i) => ({
      id: `done-${i + 1}`,
      content: `Task ${i + 1}`,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`,
    })),
  },
];

export const Kanban: Story = {
  render: () => {
    return (
      <Sentereige
        mode="grid"
        dragHandleSelector=".drag-handle"
        isSortable
        options={{ gutter: 16, scrollSpeed: 10, scrollThreshold: 100 }}
        style={{
          background: "#f5f5f5",
        }}
      >
        {initialColumns.map((column) => (
          <div
            key={column.id}
            style={{
              width: "300px",
              background: "#ffffff",
            }}
          >
            <h2
              className="drag-handle"
              style={{
                border: "8px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                background: "#4a90e2",
                color: "#ffffff",
                fontSize: "1.1rem",
                fontWeight: "500",
                padding: "12px",
                margin: 0,
                textAlign: "center",
                borderBottom: "1px solid #d0d0d0",
                cursor: "grab",
              }}
            >
              {column.title}
            </h2>
            <Sentereige
              id={column.id}
              groupId={"g"}
              mode="list"
              style={{
                background: "#ffffff",
              }}
              isSortable
              onMovedEvent={(
                key,
                fromGroupId,
                fromPosition,
                toGroupId,
                toPosition
              ) => {
                showToast(
                  `Item moved: ${key} from group ${fromGroupId} index ${fromPosition} to group ${toGroupId} index ${toPosition}`
                );
              }}
              onItemClick={(key: string) => showToast(`Item clicked! ${key}`)}
            >
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    border: "8px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    gap: "6px",
                    padding: "16px",
                    background: card.color,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    transition: "background 0.2s ease",
                    margin: "4px",
                    userSelect: "none",
                  }}
                >
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: "500",
                      color: "#ffffff",
                      textAlign: "center",
                      lineHeight: "1.3",
                    }}
                  >
                    {card.id}
                  </h1>
                </div>
              ))}
            </Sentereige>
          </div>
        ))}
      </Sentereige>
    );
  },
  parameters: {
    layout: "fullscreen",
  },
};
