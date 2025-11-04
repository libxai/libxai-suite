/**
 * DistributionCharts Component
 * Shows distribution of cards by priority, status, or assignees
 */

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './charts.css'

export interface DistributionDataPoint {
  /** Category name */
  name: string
  /** Value/count */
  value: number
  /** Optional color */
  color?: string
}

export interface DistributionChartsProps {
  /** Distribution data */
  data: DistributionDataPoint[]
  /** Chart title */
  title?: string
  /** Chart type */
  type?: 'pie' | 'bar'
  /** Chart height in pixels */
  height?: number
  /** Show percentages */
  showPercentages?: boolean
}

// Default colors for priority
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#3B82F6',
  LOW: '#10B981',
}

// Default colors for common categories
const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

/**
 * Custom label for pie chart
 */
function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))

  if (percent < 0.05) return null // Don't show label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '12px', fontWeight: 600 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

/**
 * Custom tooltip
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const total = payload[0].payload.totalValue || 0
  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{data.name}</p>
      <p className="chart-tooltip-value" style={{ color: data.color || payload[0].color }}>
        Count: <strong>{data.value}</strong>
      </p>
      <p className="chart-tooltip-value" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        Percentage: <strong>{percentage}%</strong>
      </p>
    </div>
  )
}

export function DistributionCharts({
  data,
  title = 'Distribution',
  type = 'pie',
  height = 300,
  showPercentages = true,
}: DistributionChartsProps) {
  // Calculate total and add to each data point
  const total = data.reduce((sum, point) => sum + point.value, 0)
  const dataWithTotal = data.map((point) => ({
    ...point,
    totalValue: total,
    color: point.color || PRIORITY_COLORS[point.name] || DEFAULT_COLORS[data.indexOf(point) % DEFAULT_COLORS.length],
  }))

  // Get colors array
  const colors = dataWithTotal.map((point) => point.color)

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}

      <ResponsiveContainer width="100%" height={height}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={dataWithTotal}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showPercentages ? renderPieLabel : false}
              outerRadius={height * 0.35}
              fill="#8884d8"
              dataKey="value"
            >
              {dataWithTotal.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}
              formatter={(value, legendEntry: any) => {
                const point = legendEntry.payload
                const percentage = total > 0 ? ((point.value / total) * 100).toFixed(0) : '0'
                return `${value} (${point.value} - ${percentage}%)`
              }}
            />
          </PieChart>
        ) : (
          <BarChart
            data={dataWithTotal}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="name"
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
            <Bar dataKey="value" name="Count" radius={[8, 8, 0, 0]}>
              {dataWithTotal.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Stats */}
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="chart-stat-label">Total Cards</span>
          <span className="chart-stat-value" style={{ color: '#3B82F6' }}>
            {total}
          </span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-label">Categories</span>
          <span className="chart-stat-value" style={{ color: '#10B981' }}>
            {data.length}
          </span>
        </div>
        {data.length > 0 && (
          <div className="chart-stat">
            <span className="chart-stat-label">Largest Category</span>
            <span className="chart-stat-value" style={{ color: '#F59E0B' }}>
              {data.reduce((max, point) => (point.value > max.value ? point : max)).name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
