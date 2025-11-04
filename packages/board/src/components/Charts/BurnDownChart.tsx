/**
 * BurnDownChart Component
 * Shows remaining work over time compared to ideal burndown
 */

import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './charts.css'

export interface BurnDownDataPoint {
  /** Day/Date label */
  day: string
  /** Remaining tasks */
  remaining: number
  /** Ideal burndown line */
  ideal: number
}

export interface BurnDownChartProps {
  /** Burndown data points */
  data: BurnDownDataPoint[]
  /** Chart title */
  title?: string
  /** Chart height in pixels */
  height?: number
  /** Total tasks at start */
  totalTasks?: number
  /** Use area chart instead of line */
  useArea?: boolean
}

/**
 * Custom tooltip for burndown chart
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].payload.day}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong> tasks
        </p>
      ))}
    </div>
  )
}

export function BurnDownChart({
  data,
  title = 'Sprint Burndown',
  height = 300,
  totalTasks,
  useArea = false,
}: BurnDownChartProps) {
  // Calculate total tasks if not provided
  const total = totalTasks ?? (data[0]?.ideal || data[0]?.remaining || 0)

  // Calculate stats
  const currentRemaining = data[data.length - 1]?.remaining || 0
  const idealRemaining = data[data.length - 1]?.ideal || 0
  const progress = total > 0 ? ((total - currentRemaining) / total) * 100 : 0
  const isOnTrack = currentRemaining <= idealRemaining

  const ChartComponent = useArea ? AreaChart : LineChart

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="day"
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

          {useArea ? (
            <>
              {/* Ideal burndown area */}
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="#F59E0B"
                fill="rgba(245, 158, 11, 0.2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Ideal"
              />
              {/* Actual burndown area */}
              <Area
                type="monotone"
                dataKey="remaining"
                stroke={isOnTrack ? '#10B981' : '#EF4444'}
                fill={isOnTrack ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                strokeWidth={3}
                name="Remaining"
              />
            </>
          ) : (
            <>
              {/* Ideal burndown line */}
              <Line
                type="linear"
                dataKey="ideal"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Ideal"
                dot={{ fill: '#F59E0B', r: 4 }}
              />
              {/* Actual burndown line */}
              <Line
                type="monotone"
                dataKey="remaining"
                stroke={isOnTrack ? '#10B981' : '#EF4444'}
                strokeWidth={3}
                name="Remaining"
                dot={{ fill: isOnTrack ? '#10B981' : '#EF4444', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="chart-stat-label">Progress</span>
          <span
            className="chart-stat-value"
            style={{ color: progress >= 50 ? '#10B981' : '#F59E0B' }}
          >
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-label">Remaining</span>
          <span
            className="chart-stat-value"
            style={{ color: isOnTrack ? '#10B981' : '#EF4444' }}
          >
            {currentRemaining}
          </span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-label">Status</span>
          <span
            className="chart-stat-badge"
            style={{
              background: isOnTrack
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: isOnTrack ? '#10B981' : '#EF4444',
            }}
          >
            {isOnTrack ? '✓ On Track' : '⚠ Behind'}
          </span>
        </div>
      </div>
    </div>
  )
}
