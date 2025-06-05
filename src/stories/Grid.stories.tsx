import type { Meta, StoryObj } from "@storybook/react";
// import { Sentereige } from "../package/stagrid";
import { colors } from "@react-spring/shared";
import { Sentereige } from "../package/components";
import { useState } from "react";
import { showToast } from "./utils/toast";

const meta: Meta<typeof Sentereige> = {
  title: "Components/Grid",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Generate initial cards with stable random values
const generateInitialCards = () => {
  return Array.from({ length: 30000 }, (_, i) => ({
    id: i + 1,
    number: `${i + 1}`,
    color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
    height: 120 + Math.random() * 120,
  }));
};

const initialCards = (length = 5) =>
  Array.from({ length: length }, (_, i) => ({
    id: i + 1,
    number: `${i + 1}`,
    color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
    height: 120 + Math.random() * 120, // Store the random height
  }));

export const Default: Story = {
  render: () => {
    const [items, setItems] = useState(generateInitialCards);
    const addStartItem = () => {
      setItems((prev) => [
        ...[
          {
            id: prev.length + 1,
            number: `${prev.length + 1}`,
            color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
            height: 120 + Math.random() * 120,
          },
        ],
        ...prev,
      ]);
    };
    const addMiddleItem = () => {
      setItems((prev) => {
        const middleIndex = Math.floor(prev.length / 2);
        return [
          ...prev.slice(0, middleIndex),
          {
            id: prev.length + 1,
            number: `${prev.length + 1}`,
            color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
            height: 120 + Math.random() * 120,
          },
          ...prev.slice(middleIndex),
        ];
      });
    };
    const addEndItem = () => {
      setItems((prev) => [
        ...prev,
        ...[
          {
            id: prev.length + 1,
            number: `${prev.length + 4}`,
            color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
            height: 120 + Math.random() * 120,
          },
        ],
      ]);
    };

    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "Arial, sans-serif",
            margin: "20px auto",
            width: "fit-content",
          }}
        >
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "1rem",
              fontWeight: "bold",
              color: "#333",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            Count: {items.length}
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              onClick={addStartItem}
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "1rem",
                padding: "10px 20px",
                margin: "5px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#eaeaea",
                color: "black",
                cursor: "pointer",
                transition: "background-color 0.3s, transform 0.2s",
              }}
            >
              Add Item at the start
            </button>
            <button
              onClick={addMiddleItem}
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "1rem",
                padding: "10px 20px",
                margin: "5px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#eaeaea",
                color: "black",
                cursor: "pointer",
                transition: "background-color 0.3s, transform 0.2s",
              }}
            >
              Add Item at the middle
            </button>
            <button
              onClick={addEndItem}
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "1rem",
                padding: "10px 20px",
                margin: "5px",
                border: "none",
                borderRadius: "5px",
                backgroundColor: "#eaeaea",
                color: "black",
                cursor: "pointer",
                transition: "background-color 0.3s, transform 0.2s",
              }}
            >
              Add Item at the end
            </button>
          </div>
        </div>
        <Sentereige
          mode="grid"
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
          {items.map((card) => (
            <div
              key={card.id}
              style={{
                border: "8px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                padding: "16px",
                width: "180px",
                // minHeight: "120px",
                height: `${card.height}px`,
                background: card.color,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center", // Changed from 'space-between' to center vertically
                alignItems: "center", // Added to center horizontally
                cursor: "pointer",
                overflow: "hidden",
                transition: "background 0.2s ease",
                margin: "4px",
              }}
            >
              <h1
                style={{
                  margin: "0", // Removed the bottom margin since we're centering
                  fontSize: "1.2rem",
                  fontWeight: "900",
                  color: "#fff",
                  lineHeight: "1.3",
                }}
              >
                {card.number}
              </h1>
            </div>
          ))}
        </Sentereige>
      </>
    );
  },
  parameters: {
    layout: "fullscreen",
  },
};
