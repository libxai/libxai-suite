/**
 * useRelationshipsGraph Hook
 * Manages card relationships and graph visualization state
 * @module hooks/useRelationshipsGraph
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Card } from '../types'
import type {
  CardRelationship,
  GraphNode,
  GraphEdge,
  GraphConfig,
  GraphFilter,
  CriticalPath,
  GraphStats,
  RelationshipType,
} from '../types/card-relationships'
import {
  DEFAULT_GRAPH_CONFIG,
  createRelationship,
  calculateGraphStats,
  findCriticalPath,
  getInverseRelationship,
} from '../types/card-relationships'

export interface UseRelationshipsGraphProps {
  /** All cards */
  cards: Card[]
  /** Initial relationships */
  initialRelationships?: CardRelationship[]
  /** Graph configuration */
  config?: Partial<GraphConfig>
  /** Callback when relationships change */
  onRelationshipsChange?: (relationships: CardRelationship[]) => void
}

export interface UseRelationshipsGraphResult {
  /** All relationships */
  relationships: CardRelationship[]
  /** Graph nodes */
  nodes: GraphNode[]
  /** Graph edges */
  edges: GraphEdge[]
  /** Current filter */
  filter: GraphFilter
  /** Set filter */
  setFilter: (filter: GraphFilter) => void
  /** Clear filter */
  clearFilter: () => void
  /** Graph configuration */
  config: GraphConfig
  /** Update configuration */
  updateConfig: (config: Partial<GraphConfig>) => void
  /** Add relationship */
  addRelationship: (
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    metadata?: CardRelationship['metadata']
  ) => void
  /** Remove relationship */
  removeRelationship: (relationshipId: string) => void
  /** Get relationships for a card */
  getCardRelationships: (cardId: string) => CardRelationship[]
  /** Check if two cards are connected */
  areCardsConnected: (cardId1: string, cardId2: string) => boolean
  /** Get critical path */
  criticalPath: CriticalPath | null
  /** Get graph statistics */
  stats: GraphStats
  /** Selected node */
  selectedNode: GraphNode | null
  /** Set selected node */
  setSelectedNode: (node: GraphNode | null) => void
  /** Hovered node */
  hoveredNode: GraphNode | null
  /** Set hovered node */
  setHoveredNode: (node: GraphNode | null) => void
  /** Auto-detect relationships using AI */
  detectRelationships: () => Promise<CardRelationship[]>
  /** Export relationships as JSON */
  exportRelationships: () => string
  /** Import relationships from JSON */
  importRelationships: (json: string) => void
}

/**
 * Hook for managing card relationships graph
 */
export function useRelationshipsGraph({
  cards,
  initialRelationships = [],
  config: customConfig,
  onRelationshipsChange,
}: UseRelationshipsGraphProps): UseRelationshipsGraphResult {
  const config = useMemo(
    () => ({ ...DEFAULT_GRAPH_CONFIG, ...customConfig }),
    [customConfig]
  )

  // State
  const [relationships, setRelationships] = useState<CardRelationship[]>(initialRelationships)
  const [filter, setFilter] = useState<GraphFilter>({})
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [graphConfig, setGraphConfig] = useState<GraphConfig>(config)

  // Notify parent when relationships change
  useEffect(() => {
    onRelationshipsChange?.(relationships)
  }, [relationships, onRelationshipsChange])

  // Create graph nodes from cards
  const nodes = useMemo((): GraphNode[] => {
    let filteredCards = [...cards]

    // Apply card filters
    if (filter.cardIds && filter.cardIds.length > 0) {
      filteredCards = filteredCards.filter((card) => filter.cardIds!.includes(card.id))
    }

    if (filter.columnIds && filter.columnIds.length > 0) {
      filteredCards = filteredCards.filter((card) => filter.columnIds!.includes(card.columnId))
    }

    return filteredCards.map((card) => ({
      id: card.id,
      card,
    }))
  }, [cards, filter])

  // Create graph edges from relationships
  const edges = useMemo((): GraphEdge[] => {
    let filteredRelationships = [...relationships]

    // Apply relationship filters
    if (filter.types && filter.types.length > 0) {
      filteredRelationships = filteredRelationships.filter((rel) =>
        filter.types!.includes(rel.type)
      )
    }

    if (filter.minStrength !== undefined) {
      filteredRelationships = filteredRelationships.filter(
        (rel) => (rel.strength || 1) >= filter.minStrength!
      )
    }

    // Only include edges where both nodes exist
    const nodeIds = new Set(nodes.map((n) => n.id))
    filteredRelationships = filteredRelationships.filter(
      (rel) => nodeIds.has(rel.sourceId) && nodeIds.has(rel.targetId)
    )

    return filteredRelationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      type: rel.type,
      strength: rel.strength,
    }))
  }, [relationships, filter, nodes])

  // Calculate critical path
  const criticalPath = useMemo(() => {
    if (!graphConfig.highlightCriticalPath) return null
    return findCriticalPath(cards, relationships)
  }, [cards, relationships, graphConfig.highlightCriticalPath])

  // Mark nodes and edges on critical path
  const nodesWithCriticalPath = useMemo((): GraphNode[] => {
    if (!criticalPath) return nodes

    return nodes.map((node) => ({
      ...node,
      onCriticalPath: criticalPath.cardIds.includes(node.id),
    }))
  }, [nodes, criticalPath])

  const edgesWithCriticalPath = useMemo((): GraphEdge[] => {
    if (!criticalPath) return edges

    return edges.map((edge) => ({
      ...edge,
      onCriticalPath: criticalPath.relationshipIds.includes(edge.id),
    }))
  }, [edges, criticalPath])

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateGraphStats(nodesWithCriticalPath, edgesWithCriticalPath)
  }, [nodesWithCriticalPath, edgesWithCriticalPath])

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({})
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<GraphConfig>) => {
    setGraphConfig((prev) => ({ ...prev, ...newConfig }))
  }, [])

  // Add relationship
  const addRelationship = useCallback(
    (
      sourceId: string,
      targetId: string,
      type: RelationshipType,
      metadata?: CardRelationship['metadata']
    ) => {
      const newRelationship = createRelationship(sourceId, targetId, type, metadata)
      setRelationships((prev) => [...prev, newRelationship])

      // Auto-create inverse relationship if applicable
      const inverse = getInverseRelationship(type)
      if (inverse && !metadata?.autoDetected) {
        const inverseRel = createRelationship(targetId, sourceId, inverse, {
          ...metadata,
          autoDetected: true,
        })
        setRelationships((prev) => [...prev, inverseRel])
      }
    },
    []
  )

  // Remove relationship
  const removeRelationship = useCallback((relationshipId: string) => {
    setRelationships((prev) => prev.filter((rel) => rel.id !== relationshipId))
  }, [])

  // Get relationships for a card
  const getCardRelationships = useCallback(
    (cardId: string): CardRelationship[] => {
      return relationships.filter(
        (rel) => rel.sourceId === cardId || rel.targetId === cardId
      )
    },
    [relationships]
  )

  // Check if two cards are connected
  const areCardsConnected = useCallback(
    (cardId1: string, cardId2: string): boolean => {
      return relationships.some(
        (rel) =>
          (rel.sourceId === cardId1 && rel.targetId === cardId2) ||
          (rel.sourceId === cardId2 && rel.targetId === cardId1)
      )
    },
    [relationships]
  )

  // Auto-detect relationships using AI (simplified version)
  const detectRelationships = useCallback(async (): Promise<CardRelationship[]> => {
    const detected: CardRelationship[] = []

    // Simple similarity detection based on shared labels
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const card1 = cards[i]
        const card2 = cards[j]

        // Check for shared labels
        const labels1 = card1.labels || []
        const labels2 = card2.labels || []
        const sharedLabels = labels1.filter((label) => labels2.includes(label))

        if (sharedLabels.length >= 2) {
          const confidence = sharedLabels.length / Math.max(labels1.length, labels2.length)
          if (confidence >= 0.5) {
            const rel = createRelationship(card1.id, card2.id, 'similar_to', {
              autoDetected: true,
              confidence,
              reason: `Shared labels: ${sharedLabels.join(', ')}`,
            })
            rel.strength = confidence
            detected.push(rel)
          }
        }

        // Check for dependency keywords in descriptions
        const desc1 = card1.description?.toLowerCase() || ''
        const desc2 = card2.description?.toLowerCase() || ''

        if (desc1.includes(card2.title.toLowerCase())) {
          detected.push(
            createRelationship(card1.id, card2.id, 'depends_on', {
              autoDetected: true,
              confidence: 0.7,
              reason: `Mentions "${card2.title}" in description`,
            })
          )
        }
      }
    }

    // Add detected relationships
    setRelationships((prev) => [...prev, ...detected])

    return detected
  }, [cards])

  // Export relationships
  const exportRelationships = useCallback(() => {
    return JSON.stringify(relationships, null, 2)
  }, [relationships])

  // Import relationships
  const importRelationships = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json)
      const imported = parsed.map((rel: any) => ({
        ...rel,
        createdAt: new Date(rel.createdAt),
      }))
      setRelationships(imported)
    } catch (e) {
      console.error('Failed to import relationships:', e)
    }
  }, [])

  return {
    relationships,
    nodes: nodesWithCriticalPath,
    edges: edgesWithCriticalPath,
    filter,
    setFilter,
    clearFilter,
    config: graphConfig,
    updateConfig,
    addRelationship,
    removeRelationship,
    getCardRelationships,
    areCardsConnected,
    criticalPath,
    stats,
    selectedNode,
    setSelectedNode,
    hoveredNode,
    setHoveredNode,
    detectRelationships,
    exportRelationships,
    importRelationships,
  }
}
