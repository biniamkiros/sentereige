import type { Meta, StoryObj } from "@storybook/react";
import { Sentereige } from "../package/components";
import { colors } from "@react-spring/shared";

const meta: Meta<typeof Sentereige> = {
  title: "Components/List",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
const cardData = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  number: `${i + 1}`,
  color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 60%)`,
}));
export const Default: Story = {
  render: () => (
    <Sentereige mode="list" dragHandleSelector=".drag-handle" isSortable>
      {cardData.map((card) => (
        <div
          key={card.id}
          style={{
            border: "8px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            padding: "16px",
            width: "100%",
            height: "100px",
            background: card.color,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center", // Changed to center vertically
            alignItems: "center", // Added to center horizontally
            cursor: "pointer",
            overflow: "hidden",
            transition: "background 0.2s ease",
            margin: "4px",
          }}
        >
          <div className="drag-handle">Drag me</div>

          <h1
            style={{
              margin: "0", // Removed bottom margin since we're centering
              fontSize: "1.2rem",
              fontWeight: "500",
              color: "#fff",
              lineHeight: "1.3",
            }}
          >
            {card.number}
          </h1>
        </div>
      ))}
    </Sentereige>
  ),
  parameters: {
    layout: "fullscreen",
  },
};
