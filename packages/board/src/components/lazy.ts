/**
 * Lazy-loaded components for code splitting
 * @module components/lazy
 *
 * Heavy components that should be loaded on-demand to optimize initial bundle size:
 * - Charts (recharts ~400KB)
 * - PDF Export (html2canvas + jspdf ~150KB)
 * - Card Detail Modal (~30KB)
 * - Bulk Operations (~15KB)
 * - Command Palette (~10KB)
 */

import { lazy } from 'react'

// Chart Components (~400KB saved from initial bundle)
export const VelocityChart = lazy(() =>
  import('./Charts/VelocityChart').then(m => ({ default: m.VelocityChart }))
)

export const BurnDownChart = lazy(() =>
  import('./Charts/BurnDownChart').then(m => ({ default: m.BurnDownChart }))
)

export const DistributionCharts = lazy(() =>
  import('./Charts/DistributionCharts').then(m => ({ default: m.DistributionCharts }))
)

// PDF Export Modal (~150KB saved from initial bundle)
export const ExportImportModal = lazy(() =>
  import('./ExportImport/ExportImportModal').then(m => ({ default: m.ExportImportModal }))
)

// Card Detail Modal (~30KB saved from initial bundle)
export const CardDetailModal = lazy(() =>
  import('./CardDetailModal/CardDetailModal').then(m => ({ default: m.CardDetailModal }))
)

export const CardDetailModalV2 = lazy(() =>
  import('./CardDetailModal/CardDetailModalV2').then(m => ({ default: m.CardDetailModalV2 }))
)

// Bulk Operations (~15KB saved from initial bundle)
export const BulkOperationsToolbar = lazy(() =>
  import('./BulkOperations/BulkOperationsToolbar').then(m => ({ default: m.BulkOperationsToolbar }))
)

// Command Palette (~10KB saved from initial bundle)
export const CommandPalette = lazy(() =>
  import('./CommandPalette/CommandPalette').then(m => ({ default: m.CommandPalette }))
)

// AI Components (optional, ai SDK is peer dependency)
export const GeneratePlanModal = lazy(() =>
  import('./AI/GeneratePlanModal').then(m => ({ default: m.GeneratePlanModal }))
)

export const AIUsageDashboard = lazy(() =>
  import('./AI/AIUsageDashboard').then(m => ({ default: m.AIUsageDashboard }))
)

// Advanced Features (v0.6.0)
export const CardRelationshipsGraph = lazy(() =>
  import('./CardRelationships/CardRelationshipsGraph').then(m => ({ default: m.CardRelationshipsGraph }))
)

export const CardHistoryTimeline = lazy(() =>
  import('./CardHistory/CardHistoryTimeline').then(m => ({ default: m.CardHistoryTimeline }))
)

export const CardHistoryReplay = lazy(() =>
  import('./CardHistory/CardHistoryReplay').then(m => ({ default: m.CardHistoryReplay }))
)

/**
 * Preload a lazy component
 * Call this to preload a component before it's needed (e.g., on hover)
 *
 * @example
 * ```tsx
 * import { preloadComponent } from '@libxai/board/lazy'
 *
 * <button onMouseEnter={() => preloadComponent('VelocityChart')}>
 *   Show Analytics
 * </button>
 * ```
 */
export const preloadComponent = (name: keyof typeof lazyComponents) => {
  const component = lazyComponents[name]
  if (component) {
    // Force load the component
    component.preload?.()
  }
}

// Internal map for preloading
const lazyComponents = {
  VelocityChart,
  BurnDownChart,
  DistributionCharts,
  ExportImportModal,
  CardDetailModal,
  CardDetailModalV2,
  BulkOperationsToolbar,
  CommandPalette,
  GeneratePlanModal,
  AIUsageDashboard,
  CardRelationshipsGraph,
  CardHistoryTimeline,
  CardHistoryReplay,
} as const

/**
 * Total estimated bundle size savings from lazy loading: ~600KB
 *
 * Bundle breakdown:
 * - Core bundle (eager): ~80KB (Board, Column, Card, DnD)
 * - Charts chunk: ~400KB (lazy)
 * - PDF export chunk: ~150KB (lazy)
 * - Modals chunk: ~30KB (lazy)
 * - Bulk ops chunk: ~15KB (lazy)
 * - Command palette chunk: ~10KB (lazy)
 */
