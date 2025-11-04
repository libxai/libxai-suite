/**
 * CardRelationshipsGraph Component
 * Interactive force-directed graph visualization of card relationships
 * @module components/CardRelationships
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type {
  GraphNode,
  GraphEdge,
  GraphConfig,
  GraphFilter,
  CriticalPath,
  GraphStats,
  GraphInteraction,
} from '../../types/card-relationships'
import {
  getRelationshipColor,
  getRelationshipLabel,
  getRelationshipIcon,
  isDirectionalRelationship,
} from '../../types/card-relationships'
import { cn } from '../../utils'

export interface CardRelationshipsGraphProps {
  /** Graph nodes */
  nodes: GraphNode[]
  /** Graph edges */
  edges: GraphEdge[]
  /** Graph configuration */
  config: GraphConfig
  /** Current filter */
  filter: GraphFilter
  /** Update filter */
  onFilterChange: (filter: GraphFilter) => void
  /** Critical path */
  criticalPath: CriticalPath | null
  /** Graph statistics */
  stats: GraphStats
  /** Interaction callback */
  onInteraction?: (interaction: GraphInteraction) => void
  /** Custom className */
  className?: string
}

/**
 * Simple force simulation (without D3.js dependency)
 */
interface SimulationNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  config: GraphConfig,
  iterations: number = 100
): SimulationNode[] {
  // Initialize positions
  const simNodes: SimulationNode[] = nodes.map((node) => ({
    ...node,
    x: node.x ?? width / 2 + Math.random() * 100 - 50,
    y: node.y ?? height / 2 + Math.random() * 100 - 50,
    vx: 0,
    vy: 0,
  }))

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations // Decay factor

    // Apply forces
    simNodes.forEach((node) => {
      // Center force
      const centerX = width / 2
      const centerY = height / 2
      node.vx += (centerX - node.x) * config.centerForce * alpha
      node.vy += (centerY - node.y) * config.centerForce * alpha

      // Repulsion force (charge)
      simNodes.forEach((other) => {
        if (node.id === other.id) return
        const dx = node.x - other.x
        const dy = node.y - other.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (config.chargeStrength * alpha) / (distance * distance)
        node.vx += (dx / distance) * force
        node.vy += (dy / distance) * force
      })
    })

    // Link forces
    edges.forEach((edge) => {
      const source = nodeMap.get(
        typeof edge.source === 'string' ? edge.source : edge.source.id
      )
      const target = nodeMap.get(
        typeof edge.target === 'string' ? edge.target : edge.target.id
      )
      if (!source || !target) return

      const dx = target.x - source.x
      const dy = target.y - source.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      const force =
        ((distance - config.linkDistance) / distance) * config.forceStrength * alpha

      source.vx += dx * force
      source.vy += dy * force
      target.vx -= dx * force
      target.vy -= dy * force
    })

    // Update positions
    simNodes.forEach((node) => {
      if (node.fx !== null && node.fx !== undefined) {
        node.x = node.fx
        node.vx = 0
      } else {
        node.x += node.vx
      }

      if (node.fy !== null && node.fy !== undefined) {
        node.y = node.fy
        node.vy = 0
      } else {
        node.y += node.vy
      }

      // Keep nodes in bounds
      node.x = Math.max(config.nodeSize, Math.min(width - config.nodeSize, node.x))
      node.y = Math.max(config.nodeSize, Math.min(height - config.nodeSize, node.y))

      // Apply damping
      node.vx *= 0.9
      node.vy *= 0.9
    })
  }

  return simNodes
}

/**
 * Graph visualization component
 */
export function CardRelationshipsGraph({
  nodes,
  edges,
  config,
  filter: _filter,
  onFilterChange: _onFilterChange,
  criticalPath,
  stats,
  onInteraction,
  className,
}: CardRelationshipsGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [simulatedNodes, setSimulatedNodes] = useState<SimulationNode[]>([])
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Run force simulation when nodes/edges change
  useEffect(() => {
    if (nodes.length === 0) return

    const simulated = runForceSimulation(
      nodes,
      edges,
      config.width,
      config.height,
      config,
      150
    )
    setSimulatedNodes(simulated)
  }, [nodes, edges, config])

  // Handle node drag
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (!config.enableDragging) return
      e.stopPropagation()
      setDraggingNode(nodeId)
    },
    [config.enableDragging]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggingNode || !svgRef.current) return

      const svg = svgRef.current
      const rect = svg.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom

      setSimulatedNodes((prev) =>
        prev.map((node) =>
          node.id === draggingNode ? { ...node, x, y, fx: x, fy: y } : node
        )
      )
    },
    [draggingNode, zoom, pan]
  )

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null)
  }, [])

  // Handle node click
  const handleNodeClick = useCallback(
    (node: SimulationNode, e: React.MouseEvent) => {
      e.stopPropagation()
      onInteraction?.({
        type: 'node-click',
        node,
        position: { x: e.clientX, y: e.clientY },
      })
    },
    [onInteraction]
  )

  // Handle edge click
  const handleEdgeClick = useCallback(
    (edge: GraphEdge, e: React.MouseEvent) => {
      e.stopPropagation()
      onInteraction?.({
        type: 'edge-click',
        edge,
        position: { x: e.clientX, y: e.clientY },
      })
    },
    [onInteraction]
  )

  // Get node position
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } => {
      const node = simulatedNodes.find((n) => n.id === nodeId)
      return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
    },
    [simulatedNodes]
  )

  // Get node color based on color scheme
  const getNodeColor = useCallback(
    (node: SimulationNode): string => {
      if (node.onCriticalPath) return '#ef4444'

      switch (config.colorScheme) {
        case 'status':
          return node.card.columnId === 'done' ? '#10b981' : '#3b82f6'
        case 'priority':
          const priority = node.card.priority
          if (priority === 'URGENT') return '#ef4444' // urgent
          if (priority === 'HIGH') return '#f59e0b' // high
          if (priority === 'MEDIUM') return '#3b82f6' // medium
          return '#6b7280' // low or none
        case 'assignee':
          return node.card.assigneeId ? '#8b5cf6' : '#6b7280'
        default:
          return '#3b82f6'
      }
    },
    [config.colorScheme]
  )

  if (nodes.length === 0) {
    return (
      <div className={cn('relationships-graph-empty', className)}>
        <div className="relationships-graph-empty-icon">🔗</div>
        <p className="relationships-graph-empty-text">No relationships to display</p>
        <p className="relationships-graph-empty-subtext">
          Add relationships between cards to see the graph
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relationships-graph', className)}>
      {/* Controls */}
      <div className="relationships-graph-controls">
        <div className="relationships-graph-stats">
          <span className="relationships-graph-stat">
            <span className="relationships-graph-stat-value">{stats.totalNodes}</span>
            <span className="relationships-graph-stat-label">Cards</span>
          </span>
          <span className="relationships-graph-stat">
            <span className="relationships-graph-stat-value">{stats.totalEdges}</span>
            <span className="relationships-graph-stat-label">Relations</span>
          </span>
          {criticalPath && (
            <span className="relationships-graph-stat relationships-graph-stat-critical">
              <span className="relationships-graph-stat-value">
                {criticalPath.cardIds.length}
              </span>
              <span className="relationships-graph-stat-label">Critical Path</span>
            </span>
          )}
        </div>

        {/* Zoom controls */}
        {config.enableZoom && (
          <div className="relationships-graph-zoom-controls">
            <button
              className="relationships-graph-zoom-btn"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            >
              +
            </button>
            <span className="relationships-graph-zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              className="relationships-graph-zoom-btn"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            >
              −
            </button>
            <button
              className="relationships-graph-zoom-btn"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="relationships-graph-legend">
        {Array.from(new Set(edges.map((e) => e.type))).map((type) => (
          <div key={type} className="relationships-graph-legend-item">
            <div
              className="relationships-graph-legend-color"
              style={{ background: getRelationshipColor(type) }}
            />
            <span className="relationships-graph-legend-label">
              {getRelationshipIcon(type)} {getRelationshipLabel(type)}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="relationships-graph-canvas"
        width={config.width}
        height={config.height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          <g className="relationships-graph-edges">
            {edges.map((edge) => {
              const sourcePos = getNodePosition(
                typeof edge.source === 'string' ? edge.source : edge.source.id
              )
              const targetPos = getNodePosition(
                typeof edge.target === 'string' ? edge.target : edge.target.id
              )

              const isDirectional = isDirectionalRelationship(edge.type)
              const isHovered = hoveredEdge === edge.id
              const isCritical = edge.onCriticalPath

              return (
                <g
                  key={edge.id}
                  className={cn(
                    'relationships-graph-edge',
                    isHovered && 'hovered',
                    isCritical && 'critical'
                  )}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onClick={(e) => handleEdgeClick(edge, e)}
                >
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={getRelationshipColor(edge.type)}
                    strokeWidth={isCritical ? config.edgeWidth * 2 : config.edgeWidth}
                    strokeOpacity={isHovered ? 1 : 0.6}
                    markerEnd={isDirectional ? 'url(#arrowhead)' : undefined}
                  />
                  {config.showEdgeLabels && isHovered && (
                    <text
                      x={(sourcePos.x + targetPos.x) / 2}
                      y={(sourcePos.y + targetPos.y) / 2}
                      className="relationships-graph-edge-label"
                      textAnchor="middle"
                    >
                      {getRelationshipLabel(edge.type)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Nodes */}
          <g className="relationships-graph-nodes">
            {simulatedNodes.map((node) => {
              const isHovered = hoveredNode === node.id
              const isCritical = node.onCriticalPath

              return (
                <g
                  key={node.id}
                  className={cn(
                    'relationships-graph-node',
                    isHovered && 'hovered',
                    isCritical && 'critical'
                  )}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => handleNodeClick(node, e)}
                >
                  <circle
                    r={isCritical ? config.nodeSize * 1.2 : config.nodeSize}
                    fill={getNodeColor(node)}
                    stroke={isCritical ? '#fbbf24' : '#ffffff'}
                    strokeWidth={isCritical ? 3 : 2}
                    opacity={isHovered ? 1 : 0.9}
                  />
                  {config.showLabels && (
                    <text
                      y={config.nodeSize + 20}
                      className="relationships-graph-node-label"
                      textAnchor="middle"
                    >
                      {node.card.title.length > 20
                        ? node.card.title.substring(0, 20) + '...'
                        : node.card.title}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </g>

        {/* Arrow marker for directional edges */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
