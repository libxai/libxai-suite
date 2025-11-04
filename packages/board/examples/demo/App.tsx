/**
 * ASAKAA Board - Premium Demo
 * Showcasing beautiful Kanban board with realistic project data
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  KanbanBoard,
  GanttBoard,
  useBoard,
  useFilters,
  FilterBar,
  useAI,
  useMultiSelect,
  useKeyboardShortcuts,
  GeneratePlanModal,
  AIUsageDashboard,
  CommandPalette,
  CardDetailModal,
  CardDetailModalV2,
  BulkOperationsToolbar,
  SwimlaneBoardView,
  GroupBySelector,
  KeyboardShortcutsHelp,
  CardTemplateSelector,
  ExportImportModal,
  DEFAULT_TEMPLATES,
  ThemeProvider,
  ThemeSwitcher,
  ConfigMenu,
  ThemeModal,
  // v0.6.0: New Features
  CardStack,
  useCardStacking,
  CardHistoryTimeline,
  CardHistoryReplay,
  useCardHistory,
  CardRelationshipsGraph,
  useRelationshipsGraph,
  // v0.8.0: Gantt Imperative API
  ganttUtils,
  type User,
  type GeneratedPlan,
  type Card,
  type Comment,
  type Activity,
  type Insight,
  type GroupByOption,
  type CardTemplate,
  type ImportResult,
  type CardRelationship,
  type Task,
  type GanttBoardRef,
} from '@libxai/board'
import '@libxai/board/styles.css'

// Sample users for assignment
const sampleUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alex Chen',
    initials: 'AC',
    color: '#3B82F6',
  },
  {
    id: 'user-2',
    name: 'Sarah Johnson',
    initials: 'SJ',
    color: '#8B5CF6',
  },
  {
    id: 'user-3',
    name: 'Mike Rodriguez',
    initials: 'MR',
    color: '#EF4444',
  },
  {
    id: 'user-4',
    name: 'Emma Davis',
    initials: 'ED',
    color: '#10B981',
  },
  {
    id: 'user-5',
    name: 'James Wilson',
    initials: 'JW',
    color: '#F59E0B',
  },
]

// Sample comments for demo cards
const sampleComments: Comment[] = [
  {
    id: 'comment-1',
    cardId: 'card-5',
    authorId: 'user-1',
    content: 'Started working on the virtualization implementation. Using @tanstack/react-virtual for this.',
    createdAt: '2025-10-25T10:30:00Z',
  },
  {
    id: 'comment-2',
    cardId: 'card-5',
    authorId: 'user-2',
    content: 'Great! I can help with testing once you have the first implementation ready.',
    createdAt: '2025-10-25T14:20:00Z',
  },
  {
    id: 'comment-3',
    cardId: 'card-3',
    authorId: 'user-1',
    content: 'We should use Socket.io for the WebSocket implementation. It has good fallback support.',
    createdAt: '2025-10-20T09:15:00Z',
  },
]

// Sample activities for demo cards
const sampleActivities: Activity[] = [
  {
    id: 'activity-1',
    type: 'CARD_CREATED',
    cardId: 'card-5',
    userId: 'user-1',
    timestamp: '2025-10-20T08:00:00Z',
  },
  {
    id: 'activity-2',
    type: 'USER_ASSIGNED',
    cardId: 'card-5',
    userId: 'user-1',
    timestamp: '2025-10-22T10:00:00Z',
    newValue: 'user-1',
  },
  {
    id: 'activity-3',
    type: 'PRIORITY_CHANGED',
    cardId: 'card-5',
    userId: 'user-1',
    timestamp: '2025-10-23T14:30:00Z',
    previousValue: 'HIGH',
    newValue: 'URGENT',
  },
  {
    id: 'activity-4',
    type: 'CARD_MOVED',
    cardId: 'card-5',
    userId: 'user-2',
    timestamp: '2025-10-24T09:00:00Z',
    previousValue: 'col-todo',
    newValue: 'col-progress',
  },
  {
    id: 'activity-5',
    type: 'COMMENT_ADDED',
    cardId: 'card-5',
    userId: 'user-1',
    timestamp: '2025-10-25T10:30:00Z',
  },
]

// Sample AI insights
const sampleInsights: Insight[] = [
  {
    id: 'insight-1',
    type: 'RISK_DELAY',
    severity: 'HIGH',
    title: 'Potential Delay Risk',
    description: 'Card has dependencies that may cause delays. Consider addressing blocking issues first.',
    confidence: 0.85,
    suggestedAction: 'Review and resolve card-3 before continuing with this task',
    relatedCardIds: ['card-3'],
    timestamp: '2025-10-25T08:00:00Z',
  },
  {
    id: 'insight-2',
    type: 'OPPORTUNITY',
    severity: 'MEDIUM',
    title: 'Optimization Opportunity',
    description: 'This task could be split into smaller subtasks for better parallelization.',
    confidence: 0.72,
    suggestedAction: 'Consider breaking down into: 1) Virtual scroll setup, 2) Performance testing, 3) Edge cases',
    timestamp: '2025-10-25T08:00:00Z',
  },
]

// Realistic demo data - Software development project
const demoBoard = {
  id: 'demo-board-1',
  title: 'Project Development Board',
  columns: [
    {
      id: 'col-backlog',
      title: 'Backlog',
      position: 1000,
      cardIds: ['card-1', 'card-2'],
      wipLimit: undefined,
    },
    {
      id: 'col-todo',
      title: 'To Do',
      position: 2000,
      cardIds: ['card-3', 'card-4'],
      wipLimit: 5,
      wipLimitType: 'soft',
    },
    {
      id: 'col-progress',
      title: 'In Progress',
      position: 3000,
      cardIds: ['card-5', 'card-6'],
      wipLimit: 3,
      wipLimitType: 'hard',
    },
    {
      id: 'col-review',
      title: 'In Review',
      position: 4000,
      cardIds: ['card-7', 'card-8'],
      wipLimit: 3,
      wipLimitType: 'soft',
    },
    {
      id: 'col-done',
      title: 'Done',
      position: 5000,
      cardIds: ['card-9', 'card-10'],
      wipLimit: undefined,
    },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'AI-powered task suggestions',
      description: 'Implement ML model to suggest task priorities and assignments based on project history',
      position: 1000,
      columnId: 'col-backlog',
      priority: 'MEDIUM' as const,
      labels: ['ai', 'feature', 'ml'],
      estimatedHours: 16,
      coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop',
    },
    {
      id: 'card-2',
      title: 'Advanced analytics dashboard',
      description: 'Create comprehensive analytics with velocity charts, burn-down, and cycle time metrics',
      position: 2000,
      columnId: 'col-backlog',
      priority: 'LOW' as const,
      labels: ['analytics', 'feature', 'ui'],
      estimatedHours: 24,
    },
    {
      id: 'card-3',
      title: 'Real-time collaboration',
      description: 'Add WebSocket support for live cursor tracking and simultaneous editing',
      position: 1000,
      columnId: 'col-todo',
      priority: 'HIGH' as const,
      labels: ['realtime', 'backend', 'websocket'],
      estimatedHours: 20,
    },
    {
      id: 'card-4',
      title: 'Mobile responsive design',
      description: 'Optimize board layout and interactions for mobile devices and tablets',
      position: 2000,
      columnId: 'col-todo',
      priority: 'HIGH' as const,
      labels: ['mobile', 'ui', 'responsive'],
      estimatedHours: 12,
    },
    {
      id: 'card-5',
      title: 'Implement drag & drop optimization',
      description: 'Enhance drag performance for boards with 1000+ cards using virtualization',
      position: 1000,
      columnId: 'col-progress',
      priority: 'URGENT' as const,
      labels: ['performance', 'dnd', 'optimization'],
      estimatedHours: 8,
      assignedUserIds: ['user-1', 'user-2'],
      dependencies: ['card-3'],
      coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop',
    },
    {
      id: 'card-6',
      title: 'Custom field types',
      description: 'Allow users to add custom fields to cards (text, number, date, select)',
      position: 2000,
      columnId: 'col-progress',
      priority: 'MEDIUM' as const,
      labels: ['feature', 'customization'],
      estimatedHours: 16,
      assignedUserIds: ['user-3'],
    },
    {
      id: 'card-7',
      title: 'Keyboard shortcuts',
      description: 'Implement comprehensive keyboard navigation (j/k, /, Cmd+K)',
      position: 1000,
      columnId: 'col-review',
      priority: 'MEDIUM' as const,
      labels: ['ux', 'accessibility', 'feature'],
      estimatedHours: 6,
    },
    {
      id: 'card-8',
      title: 'Export to PDF/CSV',
      description: 'Add export functionality for board data in multiple formats',
      position: 2000,
      columnId: 'col-review',
      priority: 'LOW' as const,
      labels: ['export', 'feature'],
      estimatedHours: 8,
    },
    {
      id: 'card-9',
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing, type checking, and publishing',
      position: 1000,
      columnId: 'col-done',
      priority: 'HIGH' as const,
      labels: ['devops', 'infrastructure'],
      completedAt: '2025-10-05',
    },
    {
      id: 'card-10',
      title: 'Premium glassmorphism UI',
      description: 'Design and implement beautiful dark theme with glass effects and animations',
      position: 2000,
      columnId: 'col-done',
      priority: 'HIGH' as const,
      labels: ['design', 'ui', 'premium'],
      completedAt: '2025-10-10',
    },
  ],
}

export default function App() {
  // View Mode State
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban')

  // v0.8.0: Gantt Ref for Imperative API
  const ganttRef = useRef<GanttBoardRef>(null)

  // AI Modal States
  const [isGeneratePlanModalOpen, setIsGeneratePlanModalOpen] = useState(false)
  const [isAIUsageDashboardOpen, setIsAIUsageDashboardOpen] = useState(false)

  // Card Detail Modal State
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>(sampleComments)
  const [activities, setActivities] = useState<Activity[]>(sampleActivities)

  // New Features v0.3.0
  const [groupBy, setGroupBy] = useState<GroupByOption>('none')
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [isExportImportOpen, setIsExportImportOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)

  // v0.6.0: New Features State
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState(false)
  const [isGraphViewOpen, setIsGraphViewOpen] = useState(false)
  const [historySelectedCard, setHistorySelectedCard] = useState<Card | null>(null)

  // Gantt Tasks State
  const [ganttTasks, setGanttTasks] = useState<Task[]>([
    {
      id: 'task-1',
      name: 'Project Planning Phase',
      startDate: new Date('2025-10-20'),
      endDate: new Date('2025-10-27'),
      progress: 100,
      dependencies: [],
      assignedUsers: ['user-1', 'user-2'],
      status: 'completed',
      isMilestone: false,
      subtasks: [
        {
          id: 'task-1-1',
          name: 'Define project scope',
          startDate: new Date('2025-10-20'),
          endDate: new Date('2025-10-22'),
          progress: 100,
          dependencies: [],
          status: 'completed',
        },
        {
          id: 'task-1-2',
          name: 'Create initial timeline',
          startDate: new Date('2025-10-23'),
          endDate: new Date('2025-10-25'),
          progress: 100,
          dependencies: ['task-1-1'],
          status: 'completed',
        },
      ],
    },
    {
      id: 'task-2',
      name: 'Design Phase',
      startDate: new Date('2025-10-27'),
      endDate: new Date('2025-11-10'),
      progress: 75,
      dependencies: ['task-1'],
      assignedUsers: ['user-2', 'user-4'],
      status: 'in-progress',
      priority: 'HIGH',
      subtasks: [
        {
          id: 'task-2-1',
          name: 'UI/UX mockups',
          startDate: new Date('2025-10-27'),
          endDate: new Date('2025-11-03'),
          progress: 100,
          dependencies: [],
          status: 'completed',
        },
        {
          id: 'task-2-2',
          name: 'Design system',
          startDate: new Date('2025-11-03'),
          endDate: new Date('2025-11-10'),
          progress: 50,
          dependencies: ['task-2-1'],
          status: 'in-progress',
          priority: 'HIGH',
        },
      ],
    },
    {
      id: 'task-3',
      name: 'Development Sprint 1',
      startDate: new Date('2025-11-10'),
      endDate: new Date('2025-11-24'),
      progress: 30,
      dependencies: ['task-2'],
      assignedUsers: ['user-1', 'user-3', 'user-5'],
      status: 'in-progress',
      priority: 'URGENT',
      subtasks: [
        {
          id: 'task-3-1',
          name: 'Setup project structure',
          startDate: new Date('2025-11-10'),
          endDate: new Date('2025-11-12'),
          progress: 100,
          dependencies: [],
          status: 'completed',
        },
        {
          id: 'task-3-2',
          name: 'Implement core features',
          startDate: new Date('2025-11-12'),
          endDate: new Date('2025-11-20'),
          progress: 40,
          dependencies: ['task-3-1'],
          status: 'in-progress',
          priority: 'URGENT',
        },
        {
          id: 'task-3-3',
          name: 'Unit testing',
          startDate: new Date('2025-11-20'),
          endDate: new Date('2025-11-24'),
          progress: 0,
          dependencies: ['task-3-2'],
          status: 'todo',
        },
      ],
    },
    {
      id: 'milestone-1',
      name: 'MVP Launch',
      startDate: new Date('2025-11-24'),
      endDate: new Date('2025-11-24'),
      progress: 0,
      dependencies: ['task-3'],
      isMilestone: true,
      status: 'todo',
      priority: 'URGENT',
    },
    {
      id: 'task-4',
      name: 'Testing & QA',
      startDate: new Date('2025-11-24'),
      endDate: new Date('2025-12-05'),
      progress: 0,
      dependencies: ['milestone-1'],
      assignedUsers: ['user-2', 'user-4'],
      status: 'todo',
      priority: 'HIGH',
    },
    {
      id: 'task-5',
      name: 'Documentation',
      startDate: new Date('2025-11-17'),
      endDate: new Date('2025-12-01'),
      progress: 10,
      dependencies: ['task-3'],
      assignedUsers: ['user-4'],
      status: 'in-progress',
    },
    {
      id: 'milestone-2',
      name: 'Production Release',
      startDate: new Date('2025-12-05'),
      endDate: new Date('2025-12-05'),
      progress: 0,
      dependencies: ['task-4', 'task-5'],
      isMilestone: true,
      status: 'todo',
      priority: 'URGENT',
    },
  ])

  // v0.4.0: Simplified API with useBoard hook
  const board = useBoard({
    initialData: demoBoard,
    availableUsers: sampleUsers,
    onSave: (updatedBoard) => {
      // Persist to localStorage with auto-save
      localStorage.setItem('asakaa-demo-board', JSON.stringify(updatedBoard))
      console.log('Board state auto-saved', {
        totalCards: updatedBoard.cards.length,
        columns: updatedBoard.columns.length,
        timestamp: new Date().toISOString(),
      })
    },
  })

  // v0.4.0: Advanced filtering and sorting
  const filters = useFilters({
    currentUserId: 'user-1', // For "My Tasks" quick filter
  })

  // Apply filters to cards
  const filteredAndSortedCards = useMemo(() => {
    return filters.applyFilters(board.board.cards)
  }, [board.board.cards, filters.filters, filters.sort, filters.applyFilters])

  // Create board with filtered cards AND updated column cardIds
  const filteredBoard = useMemo(() => {
    const filteredCardIds = new Set(filteredAndSortedCards.map(c => c.id))

    return {
      ...board.board,
      cards: filteredAndSortedCards,
      columns: board.board.columns.map(col => ({
        ...col,
        cardIds: col.cardIds.filter(id => filteredCardIds.has(id))
      }))
    }
  }, [board.board, filteredAndSortedCards])

  // Multi-select functionality
  const {
    selectedCardIds,
    getSelectedCards,
    clearSelection,
  } = useMultiSelect({ cards: board.board.cards })

  // AI Hook - Use real API or mock
  const {
    onGeneratePlan,
    onSuggestAssignee,
    onPredictRisks,
    onGenerateSubtasks,
    onEstimateEffort,
    isLoading: isAILoading,
  } = useAI({
    // For demo: use mock mode if no API key is set
    // apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    // provider: 'anthropic',
  })

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
  })

  // Keyboard Actions Handler
  useEffect(() => {
    const handleKeyboardAction = (event: CustomEvent) => {
      const action = event.detail as string

      switch (action) {
        case 'show_shortcuts':
          setIsKeyboardShortcutsOpen((prev) => !prev)
          break
        case 'close_modal':
          if (isCardDetailModalOpen) {
            setIsCardDetailModalOpen(false)
            setSelectedCard(null)
          } else if (isKeyboardShortcutsOpen) {
            setIsKeyboardShortcutsOpen(false)
          } else if (isGeneratePlanModalOpen) {
            setIsGeneratePlanModalOpen(false)
          } else if (isExportImportOpen) {
            setIsExportImportOpen(false)
          } else if (isThemeModalOpen) {
            setIsThemeModalOpen(false)
          }
          break
        // Add more keyboard action handlers as needed
        default:
          break
      }
    }

    window.addEventListener('keyboard-action', handleKeyboardAction as EventListener)
    return () => window.removeEventListener('keyboard-action', handleKeyboardAction as EventListener)
  }, [isCardDetailModalOpen, isKeyboardShortcutsOpen, isGeneratePlanModalOpen, isExportImportOpen, isThemeModalOpen])

  // Handler to add new column
  const handleAddColumn = () => {
    board.utils.addColumn('New Column')
  }

  // Handler to add new card to a column
  const handleAddCard = (columnId: string) => {
    board.utils.addCard(columnId, 'New Task', {
      description: 'Click to edit description',
      priority: 'MEDIUM' as const,
      labels: [],
    })
  }

  // Handler for card click - open detail modal
  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setIsCardDetailModalOpen(true)
  }

  // Handler for card update from modal
  const handleCardUpdateFromModal = (cardId: string, updates: Partial<Card>) => {
    board.callbacks.onCardUpdate?.(cardId, updates)
    // Update selected card to reflect changes
    if (selectedCard && selectedCard.id === cardId) {
      const updatedCard = { ...selectedCard, ...updates }
      setSelectedCard(updatedCard)
    }
  }

  // Handler for card delete from modal
  const handleCardDelete = (cardId: string) => {
    board.callbacks.onCardDelete?.(cardId)
    setIsCardDetailModalOpen(false)
    setSelectedCard(null)
  }

  // Handler for adding comment
  const handleAddComment = (cardId: string, content: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      cardId,
      authorId: 'user-1', // Current user
      content,
      createdAt: new Date().toISOString(),
    }
    setComments([...comments, newComment])

    // Add activity
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      type: 'COMMENT_ADDED',
      cardId,
      userId: 'user-1',
      timestamp: new Date().toISOString(),
    }
    setActivities([...activities, newActivity])
  }

  // Handler for deleting comment
  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter((c) => c.id !== commentId))
  }

  // Handler for AI-generated plan
  const handlePlanGenerated = (plan: GeneratedPlan) => {
    console.log('AI Plan Generated:', plan)

    // Clear current board
    board.utils.reset()

    // Add columns from generated plan
    plan.columns.forEach((col) => {
      board.utils.addColumn(col.title)
    })

    // Add cards from generated plan
    plan.cards.forEach((card) => {
      board.callbacks.onCardCreate?.({
        ...card,
        id: `card-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      })
    })

    console.log('AI-generated plan applied to board!')
  }

  // Handler for WIP limit exceeded
  const handleWipLimitExceeded = (column: any, card: Card) => {
    alert(
      `❌ Cannot move "${card.title}" to "${column.title}".\n\nThis column has a HARD WIP limit of ${column.wipLimit} cards and is already full.`
    )
  }

  // Handlers for bulk operations
  const handleBulkUpdate = (cardIds: string[], updates: Partial<Card>) => {
    cardIds.forEach((cardId) => {
      board.callbacks.onCardUpdate?.(cardId, updates)
    })
    clearSelection()
  }

  const handleBulkDelete = (cardIds: string[]) => {
    cardIds.forEach((cardId) => {
      board.callbacks.onCardDelete?.(cardId)
    })
    clearSelection()
  }

  const handleBulkMove = (cardIds: string[], targetColumnId: string) => {
    const targetColumnCards = board.board.cards.filter((c) => c.columnId === targetColumnId)
    const maxPosition =
      targetColumnCards.length > 0
        ? Math.max(...targetColumnCards.map((c) => c.position))
        : 0

    cardIds.forEach((cardId, index) => {
      board.callbacks.onCardMove?.(cardId, targetColumnId, maxPosition + (index + 1) * 1000)
    })
    clearSelection()
  }

  // Handler for template selection
  const handleSelectTemplate = (template: CardTemplate) => {
    const firstColumn = board.board.columns[0]
    if (!firstColumn) return

    board.utils.addCard(firstColumn.id, template.template.title, {
      ...template.template,
    })
  }

  // Handler for import
  const handleImport = (result: ImportResult, content: string) => {
    if (!result.success) {
      console.error('Import failed:', result.errors)
      return
    }

    // Parse imported data
    try {
      const data = JSON.parse(content)
      if (data.board && data.columns && data.cards) {
        // Clear current board
        board.utils.reset()

        // Add imported columns
        data.columns.forEach((col: any) => {
          board.utils.addColumn(col.title)
        })

        // Add imported cards
        data.cards.forEach((card: any) => {
          board.callbacks.onCardCreate?.(card)
        })

        console.log('Board imported successfully!')
      }
    } catch (error) {
      console.error('Failed to parse imported data:', error)
    }
  }

  // Calculate stats for header
  const totalCards = board.board.cards.length
  const inProgressCards = board.board.cards.filter(
    (c) => c.columnId === 'col-progress'
  ).length
  const completedCards = board.board.cards.filter((c) => c.columnId === 'col-done')
    .length

  // Get all unique labels for FilterBar
  const availableLabels = useMemo(() => {
    const labels = new Set<string>()
    board.board.cards.forEach(card => {
      card.labels?.forEach(label => labels.add(label))
    })
    return Array.from(labels)
  }, [board.board.cards])

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
        {/* Premium Header - v0.5.0: Theme-aware */}
        <header className="sticky top-0 z-10 backdrop-blur-xl border-b" style={{
          backgroundColor: 'var(--theme-bg-primary)',
          borderColor: 'var(--theme-border-primary)'
        }}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                    ASAKAA Board
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                    Premium Kanban • AI-Native • React Library
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 px-1 py-1 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-primary)' }}>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-all"
                    style={{
                      backgroundColor: viewMode === 'kanban' ? 'var(--theme-accent-primary)' : 'transparent',
                      color: viewMode === 'kanban' ? 'white' : 'var(--theme-text-secondary)',
                    }}
                  >
                    Kanban
                  </button>
                  <button
                    onClick={() => setViewMode('gantt')}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-all"
                    style={{
                      backgroundColor: viewMode === 'gantt' ? 'var(--theme-accent-primary)' : 'transparent',
                      color: viewMode === 'gantt' ? 'white' : 'var(--theme-text-secondary)',
                    }}
                  >
                    Gantt
                  </button>
                </div>

                {/* v0.5.0: Theme Switcher */}
                <ThemeSwitcher compact showLabels={false} />
              </div>

              {/* AI Actions & Stats */}
              <div className="flex items-center gap-3">
              {/* New Features v0.3.0 */}
              <CardTemplateSelector
                templates={DEFAULT_TEMPLATES}
                onSelectTemplate={handleSelectTemplate}
              />

              {/* v0.5.0: Config Menu - v0.8.1: Gantt exports integrated */}
              <ConfigMenu
                viewMode={viewMode}
                onOpenExport={() => setIsExportImportOpen(true)}
                onOpenThemes={() => setIsThemeModalOpen(true)}
                onOpenShortcuts={() => setIsKeyboardShortcutsOpen(true)}
                onExportGanttPDF={async () => {
                  if (ganttRef.current) {
                    await ganttRef.current.exportToPDF('gantt-chart.pdf');
                  }
                }}
                onExportGanttExcel={async () => {
                  if (ganttRef.current) {
                    await ganttRef.current.exportToExcel('gantt-chart.xlsx');
                  }
                }}
                onExportGanttPNG={async () => {
                  if (ganttRef.current) {
                    const blob = await ganttRef.current.exportToPNG();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'gantt-chart.png';
                    a.click();
                  }
                }}
                onExportGanttCSV={() => {
                  if (ganttRef.current) {
                    const csv = ganttRef.current.exportToCSV();
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'gantt-chart.csv';
                    a.click();
                  }
                }}
              />

              <div className="w-px h-10" style={{ backgroundColor: 'var(--theme-border-primary)' }} />

              {/* AI Buttons */}
              <button
                onClick={() => setIsGeneratePlanModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border text-white"
                style={{
                  backgroundColor: 'var(--theme-accent-primary)',
                  borderColor: 'var(--theme-accent-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)'
                  e.currentTarget.style.borderColor = 'var(--theme-accent-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent-primary)'
                  e.currentTarget.style.borderColor = 'var(--theme-accent-primary)'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Generate with AI
              </button>

              <button
                onClick={() => setIsAIUsageDashboardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  borderColor: 'var(--theme-border-primary)',
                  color: 'var(--theme-text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                  e.currentTarget.style.color = 'var(--theme-text-primary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'
                  e.currentTarget.style.color = 'var(--theme-text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-primary)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                AI Usage
              </button>

              <div className="w-px h-10 bg-white/10" />

              {/* v0.6.0: New Features Buttons */}
              <button
                onClick={() => {
                  const demoCard = board.board.cards.find(c => c.columnId === 'col-progress')
                  if (demoCard) {
                    setHistorySelectedCard(demoCard)
                    setIsHistoryViewOpen(true)
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  borderColor: 'var(--theme-border-primary)',
                  color: 'var(--theme-text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                  e.currentTarget.style.color = 'var(--theme-text-primary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'
                  e.currentTarget.style.color = 'var(--theme-text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-primary)'
                }}
                title="Time Travel - View card history"
              >
                ⏰
              </button>

              <button
                onClick={() => setIsGraphViewOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  borderColor: 'var(--theme-border-primary)',
                  color: 'var(--theme-text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                  e.currentTarget.style.color = 'var(--theme-text-primary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'
                  e.currentTarget.style.color = 'var(--theme-text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--theme-border-primary)'
                }}
                title="Relationships Graph"
              >
                🕸️
              </button>

              <div className="w-px h-10 bg-white/10" />

              {/* Stats */}
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  {totalCards}
                </div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>
                  Total Tasks
                </div>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: 'var(--theme-border-primary)' }} />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--theme-accent-primary)' }}>
                  {inProgressCards}
                </div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>
                  In Progress
                </div>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: 'var(--theme-border-primary)' }} />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--theme-success, #10B981)' }}>
                  {completedCards}
                </div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>
                  Completed
                </div>
              </div>
            </div>
          </div>

          {/* Project Title */}
          <div className="mt-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {board.board.title}
            </h2>
          </div>
        </div>
      </header>

      {/* v0.5.0: Filter Bar with integrated GroupBySelector */}
      <div className="px-6 pt-4">
        <FilterBar
          filters={filters.filters}
          sort={filters.sort}
          onFiltersChange={filters.setFilters}
          onSortChange={filters.setSort}
          onReset={filters.resetFilters}
          onFilterMyTasks={filters.filterMyTasks}
          onFilterOverdue={filters.filterOverdue}
          onFilterHighPriority={filters.filterHighPriority}
          availableUsers={sampleUsers}
          availableLabels={availableLabels}
          availableColumns={board.board.columns.map(col => ({ id: col.id, title: col.title }))}
          showQuickFilters={true}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
        />
      </div>

      {/* Board Container with horizontal scroll */}
      <div className="pb-12">
        {viewMode === 'gantt' ? (
          <GanttBoard
            ref={ganttRef}
            tasks={ganttTasks}
            onTasksChange={setGanttTasks}
            config={{
              defaultView: 'week',
              showWeekends: true,
              enableDependencies: true,
              enableSubtasks: true,
              visibleColumns: {
                name: true,
                assignees: false,
                startDate: false,
                endDate: false,
                duration: false,
                progress: false,
                status: false,
                priority: false,
              },
              // v0.8.0: New event callbacks (DHTMLX-equivalent)
              onTaskDblClick: (task) => {
                console.log('Task double-clicked:', task.name);
                // Could open a modal, edit inline, etc.
              },
              onTaskContextMenu: (task, event) => {
                console.log('Task right-clicked:', task.name, 'at', event.clientX, event.clientY);
                // Native context menu is shown, but you can track it
              },
              onProgressChange: (taskId, oldProgress, newProgress) => {
                console.log(`Task ${taskId} progress changed: ${oldProgress}% → ${newProgress}%`);
              },
              onBeforeTaskUpdate: (taskId, updates) => {
                console.log(`Before update task ${taskId}:`, updates);
                // Return false to cancel the update
                return true;
              },
              onAfterTaskUpdate: (task) => {
                console.log('After update:', task.name);
              },
              onBeforeTaskDelete: (taskId) => {
                console.log(`Before delete task: ${taskId}`);
                // Could show confirmation dialog
                // Return false to cancel deletion
                return true;
              },
              onAfterTaskDelete: (taskId) => {
                console.log(`After delete task: ${taskId}`);
              },
              onBeforeTaskAdd: (task) => {
                console.log('Before add task:', task.name);
                // Return false to cancel addition
                return true;
              },
              onAfterTaskAdd: (task) => {
                console.log('After add task:', task.name);
              },
            }}
          />
        ) : groupBy === 'none' ? (
          <KanbanBoard
            board={filteredBoard}
            availableUsers={board.props.availableUsers}
            callbacks={{
              ...board.callbacks,
              onWipLimitExceeded: handleWipLimitExceeded,
            }}
            onCardClick={handleCardClick}
            config={{
              showCardCount: true,
              showWipLimits: true,
              enableVirtualization: false,
            }}
            style={{ minHeight: 'calc(100vh - 200px)' }}
          >
            {/* Add Group Button - Inline with columns */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 'var(--column-width)',
                maxWidth: 'var(--column-width)',
                flexShrink: 0,
                padding: 'var(--space-4)',
              }}
            >
              <button
                onClick={handleAddColumn}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg w-full"
                style={{
                  background: 'transparent',
                  border: `2px dashed var(--theme-border-secondary)`,
                  color: 'var(--theme-text-secondary)',
                  cursor: 'pointer',
                  height: '40px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--theme-accent-primary)'
                  e.currentTarget.style.color = 'var(--theme-accent-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'var(--theme-border-secondary)'
                  e.currentTarget.style.color = 'var(--theme-text-secondary)'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Group</span>
              </button>
            </div>
          </KanbanBoard>
        ) : (
          <SwimlaneBoardView
            board={filteredBoard}
            swimlaneConfig={{
              groupBy,
              collapsible: true,
              showEmptyLanes: false,
            }}
            availableUsers={sampleUsers}
            callbacks={{
              ...board.callbacks,
              onWipLimitExceeded: handleWipLimitExceeded,
            }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-1.5" style={{
        backgroundColor: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-primary)'
      }}>
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
          <div>
            Built with{' '}
            <span className="font-semibold" style={{ color: 'var(--theme-accent-primary)' }}>@libxai/board</span>{' '}
            • Open source React library
          </div>
          <div className="flex items-center gap-4">
            <span>All changes auto-save to localStorage</span>
            <a
              href="https://github.com/asakaa"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* AI Modals */}
      <GeneratePlanModal
        isOpen={isGeneratePlanModalOpen}
        onClose={() => setIsGeneratePlanModalOpen(false)}
        onPlanGenerated={handlePlanGenerated}
        onGeneratePlan={onGeneratePlan}
        isLoading={isAILoading}
      />

      <AIUsageDashboard
        isOpen={isAIUsageDashboardOpen}
        onClose={() => setIsAIUsageDashboardOpen(false)}
        planTier="hobby"
      />

      {/* Command Palette */}
      <CommandPalette
        board={board.board}
        availableUsers={sampleUsers}
        onCreateCard={(columnId, title) => {
          board.utils.addCard(columnId, title, {
            description: '',
            priority: 'MEDIUM',
            labels: [],
          })
        }}
        onNavigateToCard={(cardId) => {
          const card = board.board.cards.find((c) => c.id === cardId)
          if (card) {
            handleCardClick(card)
          }
        }}
        onSearch={(query) => {
          // Use the new filters!
          filters.setFilters({ search: query })
        }}
        onGeneratePlan={() => setIsGeneratePlanModalOpen(true)}
        onPredictRisks={() => {
          console.log('Predict risks')
          // TODO: Implement risk prediction modal
        }}
        onOpenAIUsage={() => setIsAIUsageDashboardOpen(true)}
      />

      {/* Card Detail Modal V2.0 */}
      <CardDetailModalV2
        card={selectedCard}
        isOpen={isCardDetailModalOpen}
        onClose={() => {
          setIsCardDetailModalOpen(false)
          setSelectedCard(null)
        }}
        onUpdate={handleCardUpdateFromModal}
        onDelete={handleCardDelete}
        availableUsers={sampleUsers}
        comments={selectedCard ? comments.filter((c) => c.cardId === selectedCard.id) : []}
        activities={selectedCard ? activities.filter((a) => a.cardId === selectedCard.id) : []}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        currentUser={sampleUsers[0]}
      />

      {/* Bulk Operations Toolbar */}
      {selectedCardIds.length > 0 && (
        <BulkOperationsToolbar
          selectedCards={getSelectedCards()}
          availableUsers={sampleUsers}
          onClearSelection={clearSelection}
          callbacks={{
            onBulkUpdate: handleBulkUpdate,
            onBulkDelete: handleBulkDelete,
            onBulkMove: handleBulkMove,
          }}
          columns={board.board.columns.map((col) => ({ id: col.id, title: col.title }))}
          availableLabels={availableLabels}
        />
      )}

      {/* New Modals v0.3.0 */}
      <KeyboardShortcutsHelp
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      <ExportImportModal
        board={board.board}
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onImport={handleImport}
      />

      {/* v0.5.0: Theme Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* v0.6.0: Time Travel Demo Modal */}
      {isHistoryViewOpen && historySelectedCard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsHistoryViewOpen(false)}
        >
          <div
            style={{
              background: 'var(--theme-bg-secondary)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              border: '1px solid var(--theme-border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'var(--theme-text-primary)', marginBottom: '16px', fontSize: '24px', fontWeight: 'bold' }}>
              ⏰ Time Travel - Card History
            </h2>
            <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '24px' }}>
              Viewing history for: <strong style={{ color: 'var(--theme-text-primary)' }}>{historySelectedCard.title}</strong>
            </p>
            <p style={{ color: 'var(--theme-text-tertiary)', fontSize: '14px', marginBottom: '24px' }}>
              This feature allows you to:
            </p>
            <ul style={{ color: 'var(--theme-text-secondary)', marginBottom: '24px', paddingLeft: '20px' }}>
              <li>View complete card history with 14 tracked event types</li>
              <li>Replay changes with video player-style controls</li>
              <li>Speed control (0.5x - 3x)</li>
              <li>Reconstruct past states of cards</li>
              <li>localStorage persistence</li>
            </ul>
            <p style={{ color: 'var(--theme-text-warning, #F59E0B)', fontSize: '13px', marginBottom: '24px', fontStyle: 'italic' }}>
              Note: This is a demo view. Full functionality requires actual card history data generated through card interactions.
            </p>
            <button
              onClick={() => setIsHistoryViewOpen(false)}
              style={{
                background: 'var(--theme-accent-primary)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* v0.6.0: Relationships Graph Demo Modal */}
      {isGraphViewOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsGraphViewOpen(false)}
        >
          <div
            style={{
              background: 'var(--theme-bg-secondary)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              border: '1px solid var(--theme-border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'var(--theme-text-primary)', marginBottom: '16px', fontSize: '24px', fontWeight: 'bold' }}>
              🕸️ Card Relationships Graph
            </h2>
            <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '24px' }}>
              Interactive dependency and relationship visualization
            </p>
            <p style={{ color: 'var(--theme-text-tertiary)', fontSize: '14px', marginBottom: '24px' }}>
              This feature provides:
            </p>
            <ul style={{ color: 'var(--theme-text-secondary)', marginBottom: '24px', paddingLeft: '20px' }}>
              <li>9 relationship types (blocks, depends_on, relates_to, etc.)</li>
              <li>Custom force-directed graph simulation (no D3.js dependency)</li>
              <li>Critical path detection for project management</li>
              <li>AI-powered relationship detection</li>
              <li>Interactive drag & zoom controls</li>
              <li>Cluster analysis and bottleneck identification</li>
            </ul>
            <p style={{ color: 'var(--theme-text-warning, #F59E0B)', fontSize: '13px', marginBottom: '24px', fontStyle: 'italic' }}>
              Note: This is a demo view. Full graph visualization requires cards with defined relationships (dependencies field).
            </p>
            <button
              onClick={() => setIsGraphViewOpen(false)}
              style={{
                background: 'var(--theme-accent-primary)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>
    </ThemeProvider>
  )
}
