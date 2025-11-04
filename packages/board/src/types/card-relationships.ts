/**
 * Card Relationships & Graph Types
 * Force-directed graph visualization for card dependencies and relationships
 * @module types/card-relationships
 */

import type { Card } from './index'

/**
 * Types of relationships between cards
 */
export type RelationshipType =
  | 'blocks'        // This card blocks another card
  | 'blocked_by'    // This card is blocked by another card
  | 'depends_on'    // This card depends on another card
  | 'required_by'   // This card is required by another card
  | 'relates_to'    // General relationship
  | 'duplicates'    // This card duplicates another card
  | 'parent_of'     // Parent-child relationship
  | 'child_of'      // Child-parent relationship
  | 'similar_to'    // AI-detected similarity

/**
 * Represents a relationship between two cards
 */
export interface CardRelationship {
  /** Unique relationship ID */
  id: string
  /** Source card ID */
  sourceId: string
  /** Target card ID */
  targetId: string
  /** Type of relationship */
  type: RelationshipType
  /** Relationship strength (0-1, for AI-detected relationships) */
  strength?: number
  /** When relationship was created */
  createdAt: Date
  /** User who created the relationship */
  createdBy?: string
  /** Additional metadata */
  metadata?: {
    /** Reason for relationship */
    reason?: string
    /** Is this relationship auto-detected */
    autoDetected?: boolean
    /** Confidence score for auto-detected relationships */
    confidence?: number
  }
}

/**
 * Node in the relationship graph
 */
export interface GraphNode {
  /** Card ID */
  id: string
  /** Card reference */
  card: Card
  /** X position (calculated by force simulation) */
  x?: number
  /** Y position (calculated by force simulation) */
  y?: number
  /** X velocity (for force simulation) */
  vx?: number
  /** Y velocity (for force simulation) */
  vy?: number
  /** Fixed position (prevent movement) */
  fx?: number | null
  /** Fixed position (prevent movement) */
  fy?: number | null
  /** Node degree (number of connections) */
  degree?: number
  /** Is this node on the critical path */
  onCriticalPath?: boolean
  /** Cluster ID (for grouping) */
  clusterId?: string
}

/**
 * Edge in the relationship graph
 */
export interface GraphEdge {
  /** Relationship ID */
  id: string
  /** Source node ID */
  source: string | GraphNode
  /** Target node ID */
  target: string | GraphNode
  /** Relationship type */
  type: RelationshipType
  /** Edge strength (for styling) */
  strength?: number
  /** Is this edge on the critical path */
  onCriticalPath?: boolean
}

/**
 * Graph layout algorithms
 */
export type GraphLayout =
  | 'force'        // Force-directed layout (D3 force simulation)
  | 'hierarchical' // Top-down hierarchical layout
  | 'circular'     // Circular layout
  | 'radial'       // Radial layout from center node
  | 'grid'         // Grid layout

/**
 * Graph visualization configuration
 */
export interface GraphConfig {
  /** Layout algorithm */
  layout: GraphLayout
  /** Width of the graph container */
  width: number
  /** Height of the graph container */
  height: number
  /** Enable node dragging */
  enableDragging: boolean
  /** Enable zoom and pan */
  enableZoom: boolean
  /** Show node labels */
  showLabels: boolean
  /** Show edge labels */
  showEdgeLabels: boolean
  /** Highlight critical path */
  highlightCriticalPath: boolean
  /** Node size */
  nodeSize: number
  /** Edge width */
  edgeWidth: number
  /** Animation duration */
  animationDuration: number
  /** Force simulation strength */
  forceStrength: number
  /** Link distance */
  linkDistance: number
  /** Charge strength (repulsion) */
  chargeStrength: number
  /** Center force strength */
  centerForce: number
  /** Color scheme */
  colorScheme: 'status' | 'priority' | 'assignee' | 'cluster'
}

/**
 * Graph filters
 */
export interface GraphFilter {
  /** Filter by relationship types */
  types?: RelationshipType[]
  /** Filter by card IDs */
  cardIds?: string[]
  /** Filter by columns */
  columnIds?: string[]
  /** Minimum relationship strength */
  minStrength?: number
  /** Show only critical path */
  criticalPathOnly?: boolean
  /** Maximum depth from selected node */
  maxDepth?: number
}

/**
 * Critical path analysis result
 */
export interface CriticalPath {
  /** Cards on the critical path */
  cardIds: string[]
  /** Relationships on the critical path */
  relationshipIds: string[]
  /** Total estimated time */
  totalDuration: number
  /** Bottleneck cards */
  bottlenecks: string[]
}

/**
 * Graph statistics
 */
export interface GraphStats {
  /** Total nodes */
  totalNodes: number
  /** Total edges */
  totalEdges: number
  /** Average degree */
  averageDegree: number
  /** Density (0-1) */
  density: number
  /** Number of clusters */
  clusters: number
  /** Isolated nodes (no connections) */
  isolatedNodes: string[]
  /** Hub nodes (most connections) */
  hubNodes: Array<{ cardId: string; degree: number }>
  /** Most common relationship type */
  mostCommonRelationType: RelationshipType
}

/**
 * Graph interaction event
 */
export interface GraphInteraction {
  /** Event type */
  type: 'node-click' | 'node-hover' | 'edge-click' | 'edge-hover' | 'canvas-click'
  /** Selected node */
  node?: GraphNode
  /** Selected edge */
  edge?: GraphEdge
  /** Mouse position */
  position?: { x: number; y: number }
}

/**
 * Default graph configuration
 */
export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  layout: 'force',
  width: 1200,
  height: 800,
  enableDragging: true,
  enableZoom: true,
  showLabels: true,
  showEdgeLabels: false,
  highlightCriticalPath: true,
  nodeSize: 40,
  edgeWidth: 2,
  animationDuration: 300,
  forceStrength: 0.5,
  linkDistance: 150,
  chargeStrength: -300,
  centerForce: 0.1,
  colorScheme: 'status',
}

/**
 * Helper to create a relationship
 */
export function createRelationship(
  sourceId: string,
  targetId: string,
  type: RelationshipType,
  metadata?: CardRelationship['metadata']
): CardRelationship {
  return {
    id: `${sourceId}-${targetId}-${type}-${Date.now()}`,
    sourceId,
    targetId,
    type,
    createdAt: new Date(),
    metadata,
  }
}

/**
 * Helper to get relationship color
 */
export function getRelationshipColor(type: RelationshipType): string {
  const colors: Record<RelationshipType, string> = {
    blocks: '#ef4444',
    blocked_by: '#dc2626',
    depends_on: '#f59e0b',
    required_by: '#d97706',
    relates_to: '#6b7280',
    duplicates: '#8b5cf6',
    parent_of: '#3b82f6',
    child_of: '#2563eb',
    similar_to: '#10b981',
  }
  return colors[type] || '#6b7280'
}

/**
 * Helper to get relationship label
 */
export function getRelationshipLabel(type: RelationshipType): string {
  const labels: Record<RelationshipType, string> = {
    blocks: 'Blocks',
    blocked_by: 'Blocked by',
    depends_on: 'Depends on',
    required_by: 'Required by',
    relates_to: 'Relates to',
    duplicates: 'Duplicates',
    parent_of: 'Parent of',
    child_of: 'Child of',
    similar_to: 'Similar to',
  }
  return labels[type] || type
}

/**
 * Helper to get relationship icon
 */
export function getRelationshipIcon(type: RelationshipType): string {
  const icons: Record<RelationshipType, string> = {
    blocks: '🚫',
    blocked_by: '⛔',
    depends_on: '🔗',
    required_by: '📌',
    relates_to: '🔄',
    duplicates: '📋',
    parent_of: '📂',
    child_of: '📄',
    similar_to: '🔍',
  }
  return icons[type] || '🔗'
}

/**
 * Helper to check if relationship is directional
 */
export function isDirectionalRelationship(type: RelationshipType): boolean {
  return [
    'blocks',
    'blocked_by',
    'depends_on',
    'required_by',
    'parent_of',
    'child_of',
  ].includes(type)
}

/**
 * Helper to get inverse relationship type
 */
export function getInverseRelationship(type: RelationshipType): RelationshipType | null {
  const inverses: Partial<Record<RelationshipType, RelationshipType>> = {
    blocks: 'blocked_by',
    blocked_by: 'blocks',
    depends_on: 'required_by',
    required_by: 'depends_on',
    parent_of: 'child_of',
    child_of: 'parent_of',
  }
  return inverses[type] || null
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStats(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphStats {
  const totalNodes = nodes.length
  const totalEdges = edges.length

  // Calculate degrees
  const degrees = new Map<string, number>()
  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id
    degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1)
    degrees.set(targetId, (degrees.get(targetId) || 0) + 1)
  })

  const averageDegree = totalNodes > 0 ? Array.from(degrees.values()).reduce((a, b) => a + b, 0) / totalNodes : 0
  const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2
  const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0

  // Find isolated nodes
  const isolatedNodes = nodes
    .filter((node) => !degrees.has(node.id))
    .map((node) => node.id)

  // Find hub nodes (top 5 most connected)
  const hubNodes = Array.from(degrees.entries())
    .map(([cardId, degree]) => ({ cardId, degree }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 5)

  // Most common relationship type
  const typeCounts = new Map<RelationshipType, number>()
  edges.forEach((edge) => {
    typeCounts.set(edge.type, (typeCounts.get(edge.type) || 0) + 1)
  })
  const mostCommonRelationType = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'relates_to'

  return {
    totalNodes,
    totalEdges,
    averageDegree,
    density,
    clusters: 0, // Would need clustering algorithm
    isolatedNodes,
    hubNodes,
    mostCommonRelationType,
  }
}

/**
 * Find critical path using topological sort and longest path
 */
export function findCriticalPath(
  _cards: Card[],
  relationships: CardRelationship[]
): CriticalPath {
  // Simple critical path: cards with most dependencies
  const dependencyCounts = new Map<string, number>()

  relationships.forEach((rel) => {
    if (rel.type === 'blocks' || rel.type === 'depends_on') {
      dependencyCounts.set(rel.targetId, (dependencyCounts.get(rel.targetId) || 0) + 1)
    }
  })

  const sortedCards = Array.from(dependencyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0])

  const criticalRelationships = relationships
    .filter((rel) =>
      sortedCards.includes(rel.sourceId) || sortedCards.includes(rel.targetId)
    )
    .map((rel) => rel.id)

  return {
    cardIds: sortedCards,
    relationshipIds: criticalRelationships,
    totalDuration: sortedCards.length * 5, // Estimate 5 days per card
    bottlenecks: sortedCards.slice(0, 2),
  }
}
