import { useCallback, useState } from 'react'
import type { Priority, User } from '../../types'
import type { FilterState, SortState, SortBy } from '../../hooks/useFilters'
import type { GroupByOption } from '../../types'
import './filter-bar.css'

export interface FilterBarProps {
  filters: FilterState
  sort: SortState
  onFiltersChange: (filters: Partial<FilterState>) => void
  onSortChange: (sort: Partial<SortState>) => void
  onReset: () => void
  onFilterMyTasks?: () => void
  onFilterOverdue?: () => void
  onFilterHighPriority?: () => void
  availableUsers?: User[]
  availableLabels?: string[]
  availableColumns?: Array<{ id: string; title: string }>
  showQuickFilters?: boolean
  compact?: boolean
  groupBy?: GroupByOption
  onGroupByChange?: (value: GroupByOption) => void
}

const PRIORITY_OPTIONS: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'created', label: 'Date Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'title', label: 'Title' },
  { value: 'estimate', label: 'Estimate' },
]

const GROUPBY_OPTIONS: Array<{ value: GroupByOption; label: string }> = [
  { value: 'none', label: 'No Grouping' },
  { value: 'priority', label: 'By Priority' },
  { value: 'assignee', label: 'By Assignee' },
  { value: 'label', label: 'By Label' },
]

export function FilterBar({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onReset,
  onFilterMyTasks,
  onFilterOverdue,
  onFilterHighPriority,
  availableUsers = [],
  availableLabels = [],
  availableColumns: _availableColumns = [],
  showQuickFilters = true,
  compact = false,
  groupBy = 'none',
  onGroupByChange,
}: FilterBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ search: e.target.value })
    },
    [onFiltersChange]
  )

  const handleDateFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFiltersChange({ dateFilter: e.target.value as any })
    },
    [onFiltersChange]
  )

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSortChange({ by: e.target.value as SortBy })
    },
    [onSortChange]
  )

  const handleSortOrderToggle = useCallback(() => {
    onSortChange({ order: sort.order === 'asc' ? 'desc' : 'asc' })
  }, [sort.order, onSortChange])

  const hasActiveFilters =
    filters.search ||
    filters.dateFilter !== 'all' ||
    filters.priorities.length > 0 ||
    filters.assignees.length > 0 ||
    filters.labels.length > 0 ||
    sort.by !== 'none'

  return (
    <div
      className={`filter-bar ${compact ? 'filter-bar--compact' : ''} ${isCollapsed ? 'filter-bar--collapsed' : ''}`}
    >
      <div
        className="filter-bar__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: isCollapsed ? '0' : '12px',
          padding: '4px 6px',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'var(--theme-text-secondary)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="filter-bar__label" style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--theme-text-primary)' }}>
          Filters & Grouping
        </span>
        {hasActiveFilters && (
          <span
            style={{
              color: 'var(--theme-accent-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            ({[filters.search && 'search', filters.dateFilter !== 'all' && 'date', filters.priorities.length > 0 && 'priority', filters.assignees.length > 0 && 'assignee', filters.labels.length > 0 && 'label', sort.by !== 'none' && 'sort'].filter(Boolean).length} active)
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div className="filter-bar__content">
          {showQuickFilters && (
            <div className="filter-bar__quick" style={{ marginBottom: '12px' }}>
              <span className="filter-bar__label">Quick:</span>
              {onFilterMyTasks && (
                <button
                  onClick={onFilterMyTasks}
                  className="filter-bar__quick-btn"
                  title="Show only my tasks"
                >
                  My Tasks
                </button>
              )}
              {onFilterOverdue && (
                <button
                  onClick={onFilterOverdue}
                  className="filter-bar__quick-btn"
                  title="Show overdue tasks"
                >
                  Overdue
                </button>
              )}
              {onFilterHighPriority && (
                <button
                  onClick={onFilterHighPriority}
                  className="filter-bar__quick-btn"
                  title="Show high priority tasks"
                >
                  High Priority
                </button>
              )}
            </div>
          )}

          <div className="filter-bar__main">
            <div className="filter-bar__field">
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={handleSearchChange}
                className="filter-bar__search"
              />
            </div>

            <div className="filter-bar__field">
              <select
                value={filters.dateFilter}
                onChange={handleDateFilterChange}
                className="filter-bar__select"
              >
                <option value="all">All Dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
              </select>
            </div>

            <div className="filter-bar__field">
              <select
                value={filters.priorities[0] || 'all'}
                onChange={(e) => {
                  const value = e.target.value
                  onFiltersChange({
                    priorities: value === 'all' ? [] : [value as Priority],
                  })
                }}
                className="filter-bar__select"
              >
                <option value="all">All Priorities</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            {availableUsers.length > 0 && (
              <div className="filter-bar__field">
                <select
                  value={filters.assignees[0] || 'all'}
                  onChange={(e) => {
                    const value = e.target.value
                    onFiltersChange({
                      assignees: value === 'all' ? [] : [value],
                    })
                  }}
                  className="filter-bar__select"
                >
                  <option value="all">All Assignees</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableLabels.length > 0 && (
              <div className="filter-bar__field">
                <select
                  value={filters.labels[0] || 'all'}
                  onChange={(e) => {
                    const value = e.target.value
                    onFiltersChange({
                      labels: value === 'all' ? [] : [value],
                    })
                  }}
                  className="filter-bar__select"
                >
                  <option value="all">All Labels</option>
                  {availableLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-bar__field filter-bar__sort">
              <span className="filter-bar__label" style={{ color: 'var(--theme-text-secondary)' }}>Sort:</span>
              <select
                value={sort.by}
                onChange={handleSortChange}
                className="filter-bar__select filter-bar__select--sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {sort.by !== 'none' && (
                <button
                  onClick={handleSortOrderToggle}
                  className="filter-bar__sort-toggle"
                  title={`Sort ${sort.order === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sort.order === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>

            {onGroupByChange && (
              <div className="filter-bar__field">
                <select
                  value={groupBy}
                  onChange={(e) => onGroupByChange(e.target.value as GroupByOption)}
                  className="filter-bar__select"
                  style={{
                    fontWeight: 500,
                    borderWidth: '2px',
                  }}
                >
                  {GROUPBY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="filter-bar__reset"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
