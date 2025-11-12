import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import KanbanGanttSyncExample from './KanbanGanttSyncExample'
import VisualExcellenceDemo from './VisualExcellenceDemo'
import './index.css'

// Toggle between demos:
// - 'visual-excellence' = Visual Excellence v0.8.2 (NEW: Animations, Skeletons, Physics, Flips)
// - 'kanban-gantt' = Kanban-Gantt sync demo
// - 'full-features' = Full feature demo with all capabilities
const DEMO_MODE: 'visual-excellence' | 'kanban-gantt' | 'full-features' = 'full-features'

const getDemoComponent = () => {
  switch (DEMO_MODE) {
    case 'visual-excellence':
      return <VisualExcellenceDemo />
    case 'kanban-gantt':
      return <KanbanGanttSyncExample />
    case 'full-features':
    default:
      return <App />
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {getDemoComponent()}
  </React.StrictMode>
)
