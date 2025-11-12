/**
 * LoadingSkeleton - Animated placeholder components for loading states
 * Provides visual feedback while content loads using shimmer and pulse effects.
 * Supports multiple variants (card, column, board, text, avatar, button, etc.)
 * @module components/LoadingSkeleton
 */

import React from 'react'
import { motion } from 'framer-motion'
import { skeletonPulse } from '../../animations/motion-variants'

export interface LoadingSkeletonProps {
  /** Skeleton variant */
  variant?: 'card' | 'column' | 'board' | 'text' | 'avatar' | 'button' | 'rect' | 'circle'
  /** Width (CSS value or number for pixels) */
  width?: string | number
  /** Height (CSS value or number for pixels) */
  height?: string | number
  /** Border radius */
  borderRadius?: string | number
  /** Enable shimmer effect (default: true) */
  shimmer?: boolean
  /** Enable pulse effect (default: false) */
  pulse?: boolean
  /** Number of lines for text variant */
  lines?: number
  /** Custom className */
  className?: string
  /** Animation speed in seconds */
  animationSpeed?: number
}

/**
 * Single skeleton element with shimmer/pulse animation
 */
export function LoadingSkeleton({
  variant = 'rect',
  width,
  height,
  borderRadius,
  shimmer: enableShimmer = true,
  pulse = false,
  lines = 3,
  className = '',
  animationSpeed = 2,
}: LoadingSkeletonProps) {
  // Default dimensions based on variant
  const getDefaultDimensions = () => {
    switch (variant) {
      case 'card':
        return { width: '100%', height: '200px', borderRadius: '8px' }
      case 'column':
        return { width: '320px', height: '100%', borderRadius: '8px' }
      case 'board':
        return { width: '100%', height: '600px', borderRadius: '12px' }
      case 'text':
        return { width: '100%', height: '16px', borderRadius: '4px' }
      case 'avatar':
        return { width: '40px', height: '40px', borderRadius: '50%' }
      case 'button':
        return { width: '100px', height: '36px', borderRadius: '6px' }
      case 'circle':
        return { width: '40px', height: '40px', borderRadius: '50%' }
      case 'rect':
      default:
        return { width: '100%', height: '20px', borderRadius: '4px' }
    }
  }

  const defaults = getDefaultDimensions()
  const finalWidth = width ?? defaults.width
  const finalHeight = height ?? defaults.height
  const finalBorderRadius = borderRadius ?? defaults.borderRadius

  const baseStyle: React.CSSProperties = {
    width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth,
    height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight,
    borderRadius: typeof finalBorderRadius === 'number' ? `${finalBorderRadius}px` : finalBorderRadius,
    backgroundColor: 'var(--skeleton-bg, #e5e7eb)',
    position: 'relative',
    overflow: 'hidden',
  }

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            style={{
              ...baseStyle,
              width: index === lines - 1 ? '80%' : '100%', // Last line shorter
            }}
            variants={pulse ? skeletonPulse : undefined}
            animate={pulse ? 'animate' : undefined}
            className="skeleton-item"
          >
            {enableShimmer && <ShimmerOverlay speed={animationSpeed} />}
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      style={baseStyle}
      variants={pulse ? skeletonPulse : undefined}
      animate={pulse ? 'animate' : undefined}
      className={`skeleton-item ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      {enableShimmer && <ShimmerOverlay speed={animationSpeed} />}
    </motion.div>
  )
}

/**
 * Shimmer overlay effect
 */
function ShimmerOverlay({ speed = 2 }: { speed?: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      }}
      animate={{
        x: ['0%', '200%'],
      }}
      transition={{
        repeat: Infinity,
        duration: speed,
        ease: 'linear',
      }}
    />
  )
}

/**
 * Card skeleton with structured layout
 */
export function CardSkeleton({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  showFooter = true,
  className = '',
}: {
  showAvatar?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showFooter?: boolean
  className?: string
}) {
  return (
    <div className={`p-4 bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with avatar and title */}
      <div className="flex items-start gap-3 mb-3">
        {showAvatar && <LoadingSkeleton variant="avatar" width={32} height={32} />}
        <div className="flex-1 space-y-2">
          {showTitle && <LoadingSkeleton variant="text" width="60%" height={14} />}
          {showTitle && <LoadingSkeleton variant="text" width="40%" height={12} />}
        </div>
      </div>

      {/* Description */}
      {showDescription && (
        <div className="mb-3">
          <LoadingSkeleton variant="text" lines={3} />
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className="flex items-center gap-2">
          <LoadingSkeleton variant="button" width={60} height={24} />
          <LoadingSkeleton variant="button" width={60} height={24} />
          <div className="flex-1" />
          <LoadingSkeleton variant="circle" width={24} height={24} />
        </div>
      )}
    </div>
  )
}

/**
 * Column skeleton with multiple cards
 */
export function ColumnSkeleton({
  cardCount = 3,
  className = '',
}: {
  cardCount?: number
  className?: string
}) {
  return (
    <div className={`w-80 flex-shrink-0 ${className}`}>
      {/* Column header */}
      <div className="p-4 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <LoadingSkeleton variant="text" width={120} height={16} />
          <LoadingSkeleton variant="circle" width={24} height={24} />
        </div>
        <LoadingSkeleton variant="text" width={40} height={12} />
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 bg-gray-100 rounded-b-lg">
        {Array.from({ length: cardCount }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

/**
 * Board skeleton with multiple columns
 */
export function BoardSkeleton({
  columnCount = 4,
  cardsPerColumn = 3,
  className = '',
}: {
  columnCount?: number
  cardsPerColumn?: number
  className?: string
}) {
  return (
    <div className={`flex gap-4 p-6 overflow-x-auto ${className}`}>
      {Array.from({ length: columnCount }).map((_, index) => (
        <ColumnSkeleton key={index} cardCount={cardsPerColumn} />
      ))}
    </div>
  )
}

/**
 * List skeleton for task lists, tables, etc.
 */
export function ListSkeleton({
  itemCount = 5,
  showAvatar = true,
  className = '',
}: {
  itemCount?: number
  showAvatar?: boolean
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
          {showAvatar && <LoadingSkeleton variant="avatar" width={32} height={32} />}
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" width="70%" height={14} />
            <LoadingSkeleton variant="text" width="40%" height={12} />
          </div>
          <LoadingSkeleton variant="button" width={60} height={28} />
        </div>
      ))}
    </div>
  )
}

/**
 * Table skeleton
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Table header */}
      {showHeader && (
        <div className="flex gap-4 p-4 bg-gray-50 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="flex-1">
              <LoadingSkeleton variant="text" width="60%" height={14} />
            </div>
          ))}
        </div>
      )}

      {/* Table rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <LoadingSkeleton variant="text" width="80%" height={14} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Gantt chart skeleton
 */
export function GanttSkeleton({
  taskCount = 8,
  className = '',
}: {
  taskCount?: number
  className?: string
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex border-b border-gray-200">
        <div className="w-64 p-4 bg-gray-50">
          <LoadingSkeleton variant="text" width="50%" height={14} />
        </div>
        <div className="flex-1 flex gap-2 p-4 bg-gray-50 overflow-x-auto">
          {Array.from({ length: 12 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="text" width={60} height={12} />
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div>
        {Array.from({ length: taskCount }).map((_, index) => (
          <div key={index} className="flex border-b border-gray-200 hover:bg-gray-50">
            {/* Task info */}
            <div className="w-64 p-4 space-y-2">
              <LoadingSkeleton variant="text" width="70%" height={14} />
              <LoadingSkeleton variant="text" width="40%" height={12} />
            </div>

            {/* Timeline bar */}
            <div className="flex-1 p-4 relative">
              <LoadingSkeleton
                variant="rect"
                width={`${Math.random() * 40 + 20}%`}
                height={32}
                borderRadius={4}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Custom skeleton composer for complex layouts
 */
export function SkeletonGroup({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`skeleton-group ${className}`} aria-busy="true" aria-live="polite">
      {children}
    </div>
  )
}
