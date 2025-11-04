/**
 * VelocityChart Component
 * Shows team velocity over time (cards completed per week/sprint)
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './charts.css'

export interface VelocityDataPoint {
  /** Period name (e.g., "Week 1", "Sprint 3") */
  period: string
  /** Number of cards completed */
  completed: number
  /** Number of cards planned */
  planned?: number
  /** Average velocity (optional) */
  average?: number
}

export interface VelocityChartProps {
  /** Velocity data points */
  data: VelocityDataPoint[]
  /** Chart title */
  title?: string
  /** Chart height in pixels */
  height?: number
  /** Show average line */
  showAverage?: boolean
  /** Show planned line */
  showPlanned?: boolean
}

/**
 * Custom tooltip for velocity chart
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].payload.period}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong> cards
        </p>
      ))}
    </div>
  )
}

export function VelocityChart({
  data,
  title = 'Team Velocity',
  height = 300,
  showAverage = true,
  showPlanned = true,
}: VelocityChartProps) {
  // Calculate average if not provided
  const dataWithAverage = data.map((point) => ({
    ...point,
    average:
      point.average ??
      data.reduce((sum, p) => sum + p.completed, 0) / data.length,
  }))

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={dataWithAverage}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="period"
            stroke="rgba(255, 255, 255, 0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.5)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}
          />

          {/* Completed cards line */}
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#10B981"
            strokeWidth={3}
            name="Completed"
            dot={{ fill: '#10B981', r: 5 }}
            activeDot={{ r: 7 }}
          />

          {/* Planned cards line */}
          {showPlanned && (
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Planned"
              dot={{ fill: '#3B82F6', r: 4 }}
            />
          )}

          {/* Average line */}
          {showAverage && (
            <Line
              type="monotone"
              dataKey="average"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="3 3"
              name="Average"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="chart-stat-label">Total Completed</span>
          <span className="chart-stat-value" style={{ color: '#10B981' }}>
            {data.reduce((sum, point) => sum + point.completed, 0)}
          </span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-label">Average Velocity</span>
          <span className="chart-stat-value" style={{ color: '#F59E0B' }}>
            {(data.reduce((sum, point) => sum + point.completed, 0) / data.length).toFixed(1)}
          </span>
        </div>
        {showPlanned && data.some((p) => p.planned) && (
          <div className="chart-stat">
            <span className="chart-stat-label">Total Planned</span>
            <span className="chart-stat-value" style={{ color: '#3B82F6' }}>
              {data.reduce((sum, point) => sum + (point.planned || 0), 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
