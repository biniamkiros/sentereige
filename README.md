# ሰንጠረዥ (Sentereige) - React Layout Component

## ባህሪያት / Features

- 🖥️ Responsive Grid & List Layouts: Seamlessly adapt to any screen size for a polished user experience.
- 📦 Drag-and-Drop Sorting: Intuitive reordering of items within a single grid or list.
- ↔️ Multi-Grid Drag & Drop: Move items across multiple grids or lists with shared groupId.
- 🚀 Virtual Scrolling: Optimize performance for large datasets by rendering only visible items.
- 🛠️ Customizable Drag Handles: Define custom drag handles for tailored interactions.

## ማሳያዎች / Demos

የፍርግርግ ፣ ዝርዝር እና ካንባን አቀማመጥ / Grid List and Kanban Layouts

<img src="https://github.com/user-attachments/assets/6e1a9e80-9d96-48ad-9fdb-5ff6202c0419" height="300">

<img src="https://github.com/user-attachments/assets/0e20989b-a78b-48b3-b659-5021abdc29e4" height="300">

<img src="https://github.com/user-attachments/assets/8b37df20-21a9-49df-8f15-6a32803390e7" height="300">


## ለመጫን / Installation

```bash
npm install sentereige
```

## መሰረታዊ አጠቃቀም / Basic Usage

### ዝርዝር አቀማመጥ / List Layout

```jsx
import { Sentereige } from "sentereige";

function TodoList() {
  return (
    <Sentereige mode="list" isSortable>
      {items.map((item) => (
        <div key={item.id} className="drag-handle">
          {item.content}
        </div>
      ))}
    </Sentereige>
  );
}
```

### በሰንጠረዦች መካከል ማዘዋወር / Cross-Container Drag

```jsx
<>
  <Sentereige groupId="shared" mode="grid">
    {/* Grid items */}
  </Sentereige>

  <Sentereige groupId="shared" mode="list">
    {/* List items */}
  </Sentereige>
</>
```

## የላቁ ምሳሌዎች / Advanced Examples

### ካንባን ሰንጠረዥ / Kanban Board

```jsx
<Sentereige
  mode="grid"
  dragHandleSelector=".drag-handle"
  style={{ background: "#f5f5f5" }}
>
  {columns.map((col) => (
    <Sentereige
      key={col.id}
      id={col.id}
      groupId="board"
      mode="list"
      isSortable
      onMovedEvent={(key, fromGroup, fromPos, toGroup, toPos) => {
        console.log(`Moved ${key} from ${fromGroup} to ${toGroup}`);
      }}
      style={{ background: "#ffffff" }}
    >
      {col.items.map((item) => (
        <KanbanCard key={item.id} {...item} className="drag-handle" />
      ))}
    </Sentereige>
  ))}
</Sentereige>
```

## API ማጣቀሻ / API Reference

### Props

| Prop                 | Type               | Description                                                         |
| -------------------- | ------------------ | ------------------------------------------------------------------- |
| `mode`               | `"grid" \| "list"` | Sets the layout type: grid or list.                                 |
| `isSortable`         | `boolean`          | Enables drag-and-drop sorting within the container.                 |
| `groupId`            | `string`           | Groups containers for cross-container drag-and-drop.                |
| `dragHandleSelector` | `string`           | CSS selector for custom drag handles (e.g., `.drag-handle`).        |
| `dragSources`        | `array`            | Configurations for external drag sources.                           |
| `options`            | `object`           | Advanced settings:                                                  |
|                      |                    | - `gutter`: Spacing between items (px).                             |
|                      |                    | - `scrollSpeed`: Auto-scroll speed during drag.                     |
|                      |                    | - `reactSpringTension`: Animation tension for drag interactions.    |
| `onMovedEvent`       | `function`         | Callback triggered after a drag completes. See below for signature. |
| `onItemClick`        | `function`         | Callback triggered on item click. See below for signature.          |

### Callbacks

```jsx
// Signature for onMovedEvent
(key: string, fromGroupId: string, fromIndex: number,
 toGroupId: string, toIndex: number) => void

// Signature for onItemClick
(key: string) => void
```

## ተጨማሪ ምክሮች / Additional Tips

### አፈፃፀም ማሻሻያ / Performance Optimization

- Use stable keys for items

### ተደራሽነት / Accessibility

- Add ARIA labels for draggable items
- Implement keyboard navigation
- Provide screen reader announcements

## ለማበልጸግ / Development

```bash
npm run dev  # Start Storybook
npm run build  # Build package
```

## ፈቃድ / License

MIT License

Copyright (c) 2025 Biniam Kiros

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
