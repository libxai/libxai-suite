<p align="center">
  <img src="https://libxai.com/logo.svg" alt="LibXAI Board" width="120" />
</p>

<h1 align="center">@libxai/board</h1>

<p align="center">
  <strong>Professional Gantt Chart + Kanban Board for React</strong><br>
  Production-ready. TypeScript. Zero configuration.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@libxai/board"><img src="https://img.shields.io/npm/v/@libxai/board.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@libxai/board"><img src="https://img.shields.io/npm/dm/@libxai/board.svg" alt="npm downloads"></a>
  <a href="https://github.com/libxai/libxai-suite/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-BUSL--1.1-blue.svg" alt="license"></a>
  <a href="https://github.com/libxai/libxai-suite"><img src="https://img.shields.io/github/stars/libxai/libxai-suite?style=social" alt="GitHub stars"></a>
</p>

---

## Why LibXAI Board?

| Feature | LibXAI | DHTMLX | Bryntum |
|---------|--------|--------|---------|
| **Critical Path (CPM)** | FREE | $1,299/dev | $2,995/dev |
| **Auto-Scheduling** | FREE | Manual config | Manual config |
| **Split Tasks** | FREE | Not available | Premium only |
| **i18n (EN/ES)** | Built-in | Manual | Manual |
| **TypeScript** | Full types | Partial | Partial |
| **React Native** | Coming soon | No | No |

---

## Installation

```bash
npm install @libxai/board
```

For AI features (optional):
```bash
npm install ai
```

---

## Quick Start

### Gantt Chart

```tsx
import { GanttBoard } from '@libxai/board';
import '@libxai/board/styles.css';

function App() {
  const [tasks, setTasks] = useState([
    {
      id: '1',
      name: 'Project Planning',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      progress: 50,
      status: 'in-progress',
    },
    {
      id: '2',
      name: 'Development',
      startDate: new Date('2024-01-16'),
      endDate: new Date('2024-02-15'),
      progress: 0,
      status: 'todo',
      dependencies: ['1'], // Depends on task 1
    },
  ]);

  return (
    <GanttBoard
      tasks={tasks}
      onTasksChange={setTasks}
      config={{
        theme: 'dark',
        locale: 'es', // Spanish UI
        timeScale: 'week',

        // Callbacks for persistence
        onTaskUpdate: async (task) => {
          await saveToDatabase(task);
        },
        onMultiTaskDelete: async (taskIds) => {
          await deleteFromDatabase(taskIds);
        },

        // Permissions (CASL compatible)
        permissions: {
          canCreateTask: true,
          canUpdateTask: true,
          canDeleteTask: true,
        },
      }}
    />
  );
}
```

### Kanban Board

```tsx
import { KanbanBoard, useKanbanState } from '@libxai/board';
import '@libxai/board/styles.css';

function App() {
  const { board, callbacks } = useKanbanState({
    initialBoard: {
      id: 'my-board',
      columns: [
        { id: 'todo', title: 'To Do', position: 1000, cardIds: [] },
        { id: 'doing', title: 'In Progress', position: 2000, cardIds: [] },
        { id: 'done', title: 'Done', position: 3000, cardIds: [] },
      ],
      cards: [],
    },
  });

  return <KanbanBoard board={board} callbacks={callbacks} />;
}
```

---

## Features

### Gantt Chart

- **40+ Callbacks** for full integration with any backend
- **Critical Path Method (CPM)** - Automatic calculation, FREE
- **Auto-Scheduling** - Dependency cascade on drag
- **Split Tasks** - Pause work with gaps (Bryntum-style)
- **Dependencies** - SS, FF, SF, FS with circular detection
- **Export** - PDF, Excel, PNG, CSV
- **Zoom Levels** - Hour, Day, Week, Month, Quarter, Year
- **Undo/Redo** - 50 levels of history
- **Multi-level Hierarchy** - Unlimited nesting
- **Milestones** - Diamond markers
- **Today Line** - Visual indicator

### Kanban Board

- **Drag & Drop** - Powered by @dnd-kit
- **Virtual Scrolling** - Handle 10,000+ cards
- **Filtering & Search** - Advanced queries
- **Multi-select** - Bulk operations
- **Command Palette** - Cmd+K / Ctrl+K
- **Import/Export** - JSON, CSV, PDF

### Core

- **TypeScript** - Complete type definitions
- **Themes** - Dark, Light, Neutral (or custom)
- **i18n** - English, Spanish (extensible)
- **Accessibility** - WCAG AA compliant
- **Keyboard Shortcuts** - Full navigation
- **Zero Config** - Works out of the box

---

## Configuration

### GanttBoard Config

```tsx
interface GanttConfig {
  // Appearance
  theme?: 'dark' | 'light' | 'neutral';
  locale?: 'en' | 'es';
  timeScale?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  rowDensity?: 'compact' | 'comfortable' | 'spacious';

  // Features
  enableAutoCriticalPath?: boolean;
  showThemeSelector?: boolean;
  showCreateTaskButton?: boolean;

  // Permissions (CASL compatible)
  permissions?: {
    canCreateTask?: boolean;
    canUpdateTask?: boolean;
    canDeleteTask?: boolean;
    canReorderTasks?: boolean;
    canExport?: boolean;
  };

  // Callbacks
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onMultiTaskDelete?: (taskIds: string[]) => void;
  onProgressChange?: (taskId: string, oldProgress: number, newProgress: number) => void;

  // Context Menu Callbacks (v0.16.0+)
  onTaskEdit?: (task: Task) => void;
  onTaskAddSubtask?: (parentTask: Task) => void;
  onTaskMarkIncomplete?: (task: Task) => void;
  onTaskSetInProgress?: (task: Task) => void;

  // AI Assistant (optional)
  aiAssistant?: {
    enabled: boolean;
    onCommand: (command: string) => Promise<AIResponse>;
  };
}
```

### Task Type

```tsx
interface Task {
  id: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
  progress?: number; // 0-100
  status?: 'todo' | 'in-progress' | 'completed';
  color?: string; // Custom color
  isMilestone?: boolean;
  parentId?: string; // For subtasks
  dependencies?: string[]; // Task IDs
  assignees?: Array<{ id: string; name: string; initials: string; color: string }>;
  subtasks?: Task[]; // Nested tasks
}
```

---

## Internationalization (i18n)

Built-in support for English and Spanish:

```tsx
<GanttBoard
  config={{
    locale: 'es', // Spanish
    customTranslations: {
      // Override specific strings
      toolbar: {
        createTask: 'Crear Nueva Tarea',
      },
    },
  }}
/>
```

### Adding New Languages

```tsx
const frenchTranslations = {
  columns: { taskName: 'Nom de la tâche', ... },
  toolbar: { createTask: 'Nouvelle tâche', ... },
  contextMenu: { editTask: 'Modifier', ... },
};

<GanttBoard
  config={{
    locale: 'en', // Base
    customTranslations: frenchTranslations,
  }}
/>
```

---

## Imperative API

Access methods via ref:

```tsx
import { GanttBoard, GanttBoardRef } from '@libxai/board';

function App() {
  const ganttRef = useRef<GanttBoardRef>(null);

  const handleAddTask = () => {
    ganttRef.current?.addTask({
      name: 'New Task',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  };

  return (
    <>
      <button onClick={handleAddTask}>Add Task</button>
      <button onClick={() => ganttRef.current?.undo()}>Undo</button>
      <button onClick={() => ganttRef.current?.exportToPDF()}>Export PDF</button>
      <GanttBoard ref={ganttRef} tasks={tasks} />
    </>
  );
}
```

### Available Methods

- `addTask(task)`, `updateTask(id, updates)`, `deleteTask(id)`
- `splitTask(id, splitDate, gapDays)`
- `calculateCriticalPath()`
- `undo()`, `redo()`
- `exportToPDF()`, `exportToExcel()`, `exportToPNG()`, `exportToCSV()`
- `setZoom(level)`, `scrollToTask(id)`, `scrollToToday()`

---

## Performance

- Renders 1,000 tasks in <1 second
- 60 FPS during drag operations
- Automatic virtualization for large datasets
- Tree-shaking ready (ESM + CJS)

---

## Bundle Size

| Import | Size (gzip) |
|--------|-------------|
| GanttBoard only | ~80KB |
| KanbanBoard only | ~60KB |
| Full package | ~120KB |

---

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

---

## License

**Business Source License 1.1 (BUSL-1.1)**

- Free for non-production use
- Commercial license required for production
- Converts to Apache 2.0 on October 12, 2027

[View full license](./LICENSE)

---

## Links

- [NPM Package](https://www.npmjs.com/package/@libxai/board)
- [GitHub Repository](https://github.com/libxai/libxai-suite)
- [Changelog](./CHANGELOG.md)
- [Issue Tracker](https://github.com/libxai/libxai-suite/issues)

---

<p align="center">
  Made with care by <a href="https://libxai.com">LibXAI</a>
</p>
