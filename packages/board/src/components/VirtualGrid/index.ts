/**
 * VirtualGrid component exports
 * @module components/VirtualGrid
 */

export { VirtualGrid, useVirtualGrid, shouldVirtualizeGrid } from './VirtualGrid'
export type { VirtualGridProps } from './VirtualGrid'

// Enterprise-grade virtual scrolling (v0.8.2)
export {
  EnterpriseVirtualGrid,
  useEnterpriseVirtualGrid,
  shouldUseEnterpriseVirtualization,
} from './EnterpriseVirtualGrid'
export type {
  EnterpriseVirtualGridProps,
  PerformanceMetrics,
} from './EnterpriseVirtualGrid'
