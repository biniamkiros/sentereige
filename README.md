# ሰንጠረዥ (Sentereige) - React Layout Component

## ባህሪያት / Features

- 🖥️ Responsive grid/list layouts
- ↔️ Cross-container drag & drop
- 🚀 Virtual scrolling performance
- 🛠️ Customizable drag handles
- 📦 External drag source support

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

## የላቁቁ ምሳሌዎች / Advanced Examples

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

| Prop               | Type           | Description                          |
| ------------------ | -------------- | ------------------------------------ |
| mode               | 'grid'\|'list' | Layout type                          |
| isSortable         | boolean        | Enable drag sorting                  |
| groupId            | string         | Container grouping ID                |
| dragHandleSelector | string         | CSS selector for custom drag handle  |
| dragSources        | array          | External drag source configurations  |
| options            | object         | Advanced configuration:              |
|                    |                | - gutter: Spacing between items      |
|                    |                | - scrollSpeed: Auto-scroll speed     |
|                    |                | - reactSpringTension: Animation feel |
| onMovedEvent       | function       | Drag completion callback             |
| onItemClick        | function       | Item click handler                   |

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
