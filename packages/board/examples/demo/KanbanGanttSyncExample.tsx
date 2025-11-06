/**
 * Kanban-Gantt Synchronization Example
 *
 * This example demonstrates bidirectional synchronization between Kanban and Gantt views
 * using the useKanbanGanttSync hook.
 */

import { useState } from 'react';
import {
  useKanbanGanttSync,
  KanbanBoard,
  GanttBoard,
  ThemeProvider,
  type Card,
} from '@libxai/board';

// Sample initial data (Kanban cards)
const initialCards: Card[] = [
  {
    id: 'card-1',
    title: 'Design Homepage',
    description: 'Create wireframes and mockups for the new homepage',
    position: 0,
    columnId: 'todo',
    priority: 'HIGH',
    startDate: new Date('2025-11-10'),
    endDate: new Date('2025-11-15'),
    progress: 0,
    assignedUserIds: ['user-1'],
    labels: ['design', 'frontend'],
  },
  {
    id: 'card-2',
    title: 'Implement Authentication',
    description: 'Set up OAuth and JWT authentication',
    position: 1,
    columnId: 'in-progress',
    priority: 'URGENT',
    startDate: new Date('2025-11-12'),
    endDate: new Date('2025-11-20'),
    progress: 45,
    assignedUserIds: ['user-2'],
    labels: ['backend', 'security'],
  },
  {
    id: 'card-3',
    title: 'API Integration',
    description: 'Connect frontend to REST API',
    position: 0,
    columnId: 'in-progress',
    priority: 'MEDIUM',
    startDate: new Date('2025-11-16'),
    endDate: new Date('2025-11-22'),
    progress: 30,
    assignedUserIds: ['user-1', 'user-2'],
    dependencies: ['card-2'],
  },
  {
    id: 'card-4',
    title: 'Write Documentation',
    description: 'API documentation and user guide',
    position: 0,
    columnId: 'todo',
    priority: 'LOW',
    startDate: new Date('2025-11-23'),
    endDate: new Date('2025-11-25'),
    progress: 0,
    assignedUserIds: ['user-3'],
    labels: ['documentation'],
  },
  {
    id: 'card-5',
    title: 'Testing & QA',
    description: 'End-to-end testing',
    position: 0,
    columnId: 'review',
    priority: 'HIGH',
    startDate: new Date('2025-11-26'),
    endDate: new Date('2025-11-28'),
    progress: 70,
    assignedUserIds: ['user-3'],
    labels: ['testing'],
  },
];

const columns = [
  { id: 'todo', title: 'To Do', position: 0, cardIds: [] },
  { id: 'in-progress', title: 'In Progress', position: 1, cardIds: [] },
  { id: 'review', title: 'Review', position: 2, cardIds: [] },
  { id: 'done', title: 'Done', position: 3, cardIds: [] },
];

export function KanbanGanttSyncExample() {
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban');

  // Use the sync hook - magic happens here!
  const { cards, tasks, updateCards, updateTasks } = useKanbanGanttSync({
    initialCards,
    autoSync: true, // Enable automatic synchronization
  });

  // Organize cards into columns
  const cardsMap = new Map(cards.map(card => [card.id, card]));
  const columnsWithCards = columns.map(col => ({
    ...col,
    cardIds: cards.filter(card => card.columnId === col.id).map(c => c.id),
  }));

  return (
    <ThemeProvider defaultTheme="dark">
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header with View Toggle */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Kanban ↔ Gantt Sync Demo
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
              Changes in one view automatically sync to the other
            </p>
          </div>

          {/* View Toggle Button */}
          <button
            onClick={() => setView(v => v === 'kanban' ? 'gantt' : 'kanban')}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {view === 'kanban' ? '📊 Switch to Gantt View' : '📋 Switch to Kanban View'}
          </button>
        </div>

        {/* Sync Status Badge */}
        <div style={{
          padding: '8px 24px',
          background: '#10b981',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'white',
            animation: 'pulse 2s infinite',
          }} />
          🔄 Live Sync Active - {cards.length} cards synced with {tasks.length} tasks
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {view === 'kanban' ? (
            <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
              <KanbanBoard
                columns={columnsWithCards}
                cards={cardsMap}
                onColumnUpdate={() => {}}
                onCardUpdate={(cardId, updates) => {
                  const updatedCards = cards.map(card =>
                    card.id === cardId ? { ...card, ...updates } : card
                  );
                  updateCards(updatedCards);
                }}
                onCardMove={(cardId, targetColumnId, position) => {
                  const updatedCards = cards.map(card =>
                    card.id === cardId
                      ? { ...card, columnId: targetColumnId, position }
                      : card
                  );
                  updateCards(updatedCards);
                }}
              />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%' }}>
              <GanttBoard
                tasks={tasks}
                onTasksChange={updateTasks}
                config={{
                  theme: 'dark',
                  timeScale: 'week',
                  rowDensity: 'comfortable',
                  showThemeSelector: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div style={{
          padding: '12px 24px',
          background: '#1f2937',
          borderTop: '1px solid #374151',
          color: '#9ca3af',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            💡 Try moving a card between columns in Kanban view, then switch to Gantt - the status will be synced!
          </div>
          <div style={{ color: '#6366f1', fontWeight: 600 }}>
            Powered by useKanbanGanttSync
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </ThemeProvider>
  );
}

export default KanbanGanttSyncExample;
