/**
 * KanbanViewAdapter - ViewAdapter implementation for Kanban board
 * @module views/KanbanViewAdapter
 *
 * Implements the ViewAdapter interface from @libxai/core to enable
 * the Kanban board to work with AsakaaRuntime and ViewRegistry.
 */

import { createRoot, type Root } from 'react-dom/client'
import { BaseViewAdapter, type ViewBoardData, type ViewOptions, type ExportFormat } from '@libxai/core'
import { KanbanBoard } from '../components/Board'
import type { KanbanBoardProps } from '../types'
import type { Card, Column } from '../types'

/**
 * Kanban view configuration
 */
export interface KanbanViewConfig {
  /**
   * Board callbacks
   */
  callbacks?: KanbanBoardProps['callbacks']

  /**
   * Card click handler
   */
  onCardClick?: KanbanBoardProps['onCardClick']

  /**
   * Custom render props
   */
  renderProps?: KanbanBoardProps['renderProps']

  /**
   * Board configuration
   */
  config?: KanbanBoardProps['config']

  /**
   * Available users for assignment
   */
  availableUsers?: KanbanBoardProps['availableUsers']

  /**
   * Custom class name
   */
  className?: string

  /**
   * Custom inline styles (React.CSSProperties)
   */
  style?: React.CSSProperties

  /**
   * View options
   */
  viewOptions?: ViewOptions
}

/**
 * KanbanViewAdapter
 *
 * React-based ViewAdapter implementation that wraps the KanbanBoard component.
 * This allows the Kanban board to be used as a view in the ViewRegistry and
 * work seamlessly with AsakaaRuntime.
 *
 * @example
 * ```typescript
 * import { KanbanViewAdapter } from '@libxai/board'
 * import { ViewRegistry } from '@libxai/core'
 *
 * const registry = new ViewRegistry()
 * const kanbanView = new KanbanViewAdapter({
 *   callbacks: {
 *     onCardMove: (cardId, columnId) => { ... },
 *     onCardUpdate: (cardId, updates) => { ... }
 *   }
 * })
 *
 * registry.register(kanbanView)
 * await registry.activate('kanban', container, data)
 * ```
 */
export class KanbanViewAdapter extends BaseViewAdapter<ViewBoardData> {
  readonly id = 'kanban'
  readonly name = 'Kanban Board'
  readonly version = '1.0.0'
  readonly description = ''
  readonly icon = ''
  readonly supportedExports: ExportFormat[] = ['json', 'csv', 'pdf', 'png']

  private root: Root | null = null
  private kanbanConfig: KanbanViewConfig

  constructor(config: KanbanViewConfig = {}) {
    super()

    // Set description and icon after construction
    ;(this as any).description = 'Interactive Kanban board with drag & drop, filters, and real-time updates'
    ;(this as any).icon = '📋'

    this.kanbanConfig = config
    this.options = {
      animations: config.viewOptions?.animations ?? true,
      virtualScrolling: config.viewOptions?.virtualScrolling ?? false,
      theme: config.viewOptions?.theme ?? 'dark',
      readonly: config.viewOptions?.readonly ?? false,
    }
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Mount the Kanban view
   *
   * @param container - DOM element to mount into
   * @param data - Initial board data
   */
  mount(container: HTMLElement, data: ViewBoardData): void {
    if (this.isMounted()) {
      console.warn('[KanbanViewAdapter] Already mounted, unmounting first')
      this.unmount()
    }

    // Store references
    this.container = container
    this.data = data

    // Create React root
    this.root = createRoot(container)

    // Render Kanban board
    this.render()

    // Emit mounted event
    this.emit('view:mounted', { viewId: this.id, timestamp: Date.now() })
  }

  /**
   * Unmount the Kanban view
   */
  unmount(): void {
    if (!this.isMounted()) {
      return
    }

    // Emit unmounted event BEFORE cleanup
    this.emit('view:unmounted', { viewId: this.id, timestamp: Date.now() })

    // Unmount React
    if (this.root) {
      this.root.unmount()
      this.root = null
    }

    // Clear references
    if (this.container) {
      this.container.innerHTML = ''
      this.container = null
    }

    this.data = null
  }

  /**
   * Update the view with new data
   *
   * @param data - New board data
   */
  update(data: ViewBoardData): void {
    if (!this.isMounted()) {
      console.warn('[KanbanViewAdapter] Not mounted, cannot update')
      return
    }

    this.data = data
    this.render()

    this.emit('view:updated', { viewId: this.id, data })
  }

  /**
   * Configure the view
   *
   * @param options - View options
   */
  configure(options: ViewOptions): void {
    this.options = { ...this.options, ...options }

    // Re-render if mounted
    if (this.isMounted()) {
      this.render()
    }
  }

  // ========================================================================
  // EXPORT
  // ========================================================================

  /**
   * Export the view to a specific format
   *
   * @param format - Export format
   * @returns Promise resolving to exported data
   */
  async export(format: 'json' | 'csv' | 'pdf' | 'png'): Promise<string | Blob> {
    if (!this.data) {
      throw new Error('No data to export')
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.data, null, 2)

      case 'csv':
        return this.exportToCSV()

      case 'pdf':
        return this.exportToPDF()

      case 'png':
        return this.exportToPNG()

      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Render the Kanban board
   */
  private render(): void {
    if (!this.root || !this.data) {
      return
    }

    // Convert ViewBoardData to KanbanBoard props format
    const board = {
      id: this.data.board?.id || 'board-1',
      title: this.data.board?.title || 'Untitled Board',
      columns: this.data.columns,
      cards: this.data.cards,
    }

    // Render React component
    this.root.render(
      <KanbanBoard
        board={board}
        callbacks={this.kanbanConfig.callbacks || {}}
        onCardClick={this.kanbanConfig.onCardClick}
        renderProps={this.kanbanConfig.renderProps}
        config={this.kanbanConfig.config}
        availableUsers={this.kanbanConfig.availableUsers}
        className={this.kanbanConfig.className}
        style={this.kanbanConfig.style}
      />
    )
  }

  /**
   * Export board data to CSV format
   */
  private exportToCSV(): string {
    if (!this.data) return ''

    const rows: string[][] = [
      ['Card ID', 'Title', 'Column', 'Description', 'Labels', 'Assignees', 'Due Date', 'Position'],
    ]

    this.data.cards.forEach((card: Card) => {
      const column = this.data!.columns.find((col: Column) => col.id === card.columnId)
      rows.push([
        card.id,
        card.title,
        column?.title || '',
        card.description || '',
        card.labels?.join(', ') || '',
        card.assignedUserIds?.join(', ') || card.assigneeId || '',
        card.dueDate?.toString() || '',
        card.position.toString(),
      ])
    })

    return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  }

  /**
   * Export board to PDF
   * Uses the PDF export functionality from the Board component
   */
  private async exportToPDF(): Promise<Blob> {
    // TODO: Integrate with PDF export from CardDetailModal/PDFExport
    // For now, return a simple PDF placeholder
    throw new Error('PDF export not yet implemented in ViewAdapter')
  }

  /**
   * Export board to PNG image
   * Uses html2canvas to capture the board
   */
  private async exportToPNG(): Promise<Blob> {
    if (!this.container) {
      throw new Error('View not mounted')
    }

    // Dynamic import to avoid bundling if not used
    const html2canvas = await import('html2canvas')

    const canvas = await html2canvas.default(this.container, {
      backgroundColor: this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff',
      scale: 2, // Higher resolution
    })

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create PNG blob'))
        }
      }, 'image/png')
    })
  }
}

// ========================================================================
// FACTORY FUNCTION
// ========================================================================

/**
 * Create a new Kanban view adapter
 *
 * @param config - View configuration
 * @returns KanbanViewAdapter instance
 *
 * @example
 * ```typescript
 * const kanbanView = createKanbanView({
 *   callbacks: {
 *     onCardMove: (cardId, columnId) => console.log('Card moved'),
 *   },
 *   theme: 'dark',
 * })
 * ```
 */
export function createKanbanView(config: KanbanViewConfig = {}): KanbanViewAdapter {
  return new KanbanViewAdapter(config)
}
