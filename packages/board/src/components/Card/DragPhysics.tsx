/**
 * DragPhysics - Advanced physics-based drag interactions
 * Features: Momentum, magnetic snapping, velocity throws, drag shadows
 * Inspired by: Apple iOS, Notion drag interactions, Linear board
 * @module components/Card
 */

import React, { useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, useSpring } from 'framer-motion'
import type { Card as CardType } from '../../types'

export interface DragPhysicsProps {
  /** Card data */
  card?: CardType
  /** Card content */
  children: React.ReactNode
  /** Enable physics-based drag */
  enablePhysics?: boolean
  /** Enable drag shadow */
  enableShadow?: boolean
  /** Enable magnetic snapping */
  enableMagneticSnap?: boolean
  /** Snap points (x, y coordinates) */
  snapPoints?: Array<{ x: number; y: number; radius?: number }>
  /** Drag axis constraint */
  dragConstraint?: 'x' | 'y' | 'both'
  /** Drag bounds */
  dragBounds?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  /** Friction coefficient (0-1, lower = more momentum) */
  friction?: number
  /** Mass (affects inertia, higher = more momentum) */
  mass?: number
  /** Magnetic snap distance threshold (px) */
  snapRadius?: number
  /** Callback when drag starts */
  onDragStart?: () => void
  /** Callback when dragging */
  onDrag?: (x: number, y: number) => void
  /** Callback when drag ends */
  onDragEnd?: (x: number, y: number, velocity: { x: number; y: number }) => void
  /** Callback when snapped to point */
  onSnap?: (point: { x: number; y: number }) => void
  /** Custom className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * DragPhysics - Advanced physics-based drag component
 *
 * @example
 * ```tsx
 * <DragPhysics
 *   card={card}
 *   enablePhysics
 *   enableShadow
 *   enableMagneticSnap
 *   snapPoints={[
 *     { x: 100, y: 100, radius: 80 },
 *     { x: 300, y: 100, radius: 80 },
 *   ]}
 *   friction={0.2}
 *   mass={1.2}
 *   onSnap={(point) => console.log('Snapped to', point)}
 * >
 *   <CardComponent card={card} />
 * </DragPhysics>
 * ```
 */
export function DragPhysics({
  children,
  enablePhysics = true,
  enableShadow = true,
  enableMagneticSnap = false,
  snapPoints = [],
  dragConstraint = 'both',
  dragBounds,
  friction = 0.15,
  mass = 1,
  snapRadius = 80,
  onDragStart,
  onDrag,
  onDragEnd,
  onSnap,
  className = '',
  disabled = false,
}: DragPhysicsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hasSnapped, setHasSnapped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Physics-based motion values
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Spring animations for smooth physics
  const springX = useSpring(x, {
    stiffness: 500,
    damping: 30,
    mass,
  })
  const springY = useSpring(y, {
    stiffness: 500,
    damping: 30,
    mass,
  })

  // Transform values for visual effects
  const rotateZ = useTransform(x, [-200, 0, 200], [-8, 0, 8])
  const scale = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const distance = Math.sqrt((latestX as number) ** 2 + (latestY as number) ** 2)
      return isDragging ? 1.05 + Math.min(distance / 1000, 0.05) : 1
    }
  )

  // Shadow intensity based on drag distance
  const shadowIntensity = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const distance = Math.sqrt((latestX as number) ** 2 + (latestY as number) ** 2)
      return Math.min(distance / 100, 1)
    }
  )

  const boxShadow = useTransform(
    shadowIntensity,
    (intensity) =>
      `0 ${20 + intensity * 20}px ${40 + intensity * 20}px -10px rgba(0, 0, 0, ${0.1 + intensity * 0.2})`
  )

  /**
   * Find nearest snap point
   */
  const findNearestSnapPoint = useCallback(
    (currentX: number, currentY: number) => {
      if (!enableMagneticSnap || snapPoints.length === 0) return null

      let nearest: { point: { x: number; y: number }; distance: number } | null = null

      for (const snapPoint of snapPoints) {
        const distance = Math.sqrt(
          (currentX - snapPoint.x) ** 2 + (currentY - snapPoint.y) ** 2
        )
        const effectiveRadius = snapPoint.radius ?? snapRadius

        if (distance <= effectiveRadius) {
          if (!nearest || distance < nearest.distance) {
            nearest = { point: snapPoint, distance }
          }
        }
      }

      return nearest?.point ?? null
    },
    [enableMagneticSnap, snapPoints, snapRadius]
  )

  /**
   * Handle drag start
   */
  const handleDragStart = () => {
    setIsDragging(true)
    setHasSnapped(false)
    onDragStart?.()
  }

  /**
   * Handle drag
   */
  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentX = info.point.x
    const currentY = info.point.y

    onDrag?.(currentX, currentY)

    // Check for magnetic snapping during drag
    if (enableMagneticSnap && !hasSnapped) {
      const snapPoint = findNearestSnapPoint(currentX, currentY)
      if (snapPoint) {
        // Apply magnetic pull
        const pullStrength = 0.3
        const deltaX = snapPoint.x - currentX
        const deltaY = snapPoint.y - currentY
        x.set(x.get() + deltaX * pullStrength)
        y.set(y.get() + deltaY * pullStrength)
      }
    }
  }

  /**
   * Handle drag end with physics
   */
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    const finalX = info.point.x
    const finalY = info.point.y
    const velocity = info.velocity

    // Check for snap on release
    if (enableMagneticSnap) {
      const snapPoint = findNearestSnapPoint(finalX, finalY)
      if (snapPoint) {
        // Snap to point
        x.set(snapPoint.x)
        y.set(snapPoint.y)
        setHasSnapped(true)
        onSnap?.(snapPoint)
        onDragEnd?.(snapPoint.x, snapPoint.y, velocity)
        return
      }
    }

    // Apply momentum based on velocity
    if (enablePhysics && (Math.abs(velocity.x) > 50 || Math.abs(velocity.y) > 50)) {
      const momentumX = velocity.x * friction
      const momentumY = velocity.y * friction
      x.set(info.offset.x + momentumX)
      y.set(info.offset.y + momentumY)
    }

    // Spring back if no snap
    if (!hasSnapped) {
      x.set(0)
      y.set(0)
    }

    onDragEnd?.(finalX, finalY, velocity)
  }

  // Drag configuration
  const dragConfig = {
    drag: disabled ? false : dragConstraint === 'both' ? true : dragConstraint,
    dragConstraints: dragBounds ?? { top: -500, right: 500, bottom: 500, left: -500 },
    dragElastic: enablePhysics ? 0.1 : 0.5,
    dragMomentum: enablePhysics,
    dragTransition: enablePhysics
      ? {
          bounceStiffness: 600,
          bounceDamping: 20,
          power: 0.3,
          timeConstant: friction * 1000,
        }
      : undefined,
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main draggable card */}
      <motion.div
        {...dragConfig}
        style={{
          x: enablePhysics ? springX : x,
          y: enablePhysics ? springY : y,
          rotate: enablePhysics ? rotateZ : 0,
          scale: enablePhysics ? scale : 1,
          boxShadow: enableShadow ? boxShadow : undefined,
          cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
          zIndex: isDragging ? 1000 : 1,
        }}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        className="relative"
      >
        {children}
      </motion.div>

      {/* Drag shadow (ghost element) */}
      {enableShadow && isDragging && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          style={{
            filter: 'blur(8px)',
            transform: 'scale(0.95)',
          }}
        >
          {children}
        </motion.div>
      )}

      {/* Snap point indicators (optional - for debugging) */}
      {process.env.NODE_ENV === 'development' && enableMagneticSnap && snapPoints.length > 0 && (
        <>
          {snapPoints.map((point, index) => (
            <div
              key={index}
              className="absolute rounded-full border-2 border-dashed border-blue-400 pointer-events-none"
              style={{
                left: point.x - (point.radius ?? snapRadius),
                top: point.y - (point.radius ?? snapRadius),
                width: (point.radius ?? snapRadius) * 2,
                height: (point.radius ?? snapRadius) * 2,
                opacity: 0.3,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

/**
 * Hook for managing drag physics state
 */
export function useDragPhysics() {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDrag = useCallback((x: number, y: number) => {
    setPosition({ x, y })
  }, [])

  const handleDragEnd = useCallback(
    (x: number, y: number, vel: { x: number; y: number }) => {
      setIsDragging(false)
      setPosition({ x, y })
      setVelocity(vel)
    },
    []
  )

  return {
    isDragging,
    position,
    velocity,
    handlers: {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  }
}

/**
 * Preset drag physics configurations
 */
export const dragPhysicsPresets = {
  /** iOS-style smooth physics */
  ios: {
    friction: 0.12,
    mass: 1,
    snapRadius: 100,
  },
  /** Notion-style snappy physics */
  notion: {
    friction: 0.25,
    mass: 0.8,
    snapRadius: 60,
  },
  /** Linear-style crisp physics */
  linear: {
    friction: 0.3,
    mass: 0.6,
    snapRadius: 50,
  },
  /** Heavy momentum physics */
  heavy: {
    friction: 0.05,
    mass: 2,
    snapRadius: 120,
  },
  /** Light snappy physics */
  light: {
    friction: 0.4,
    mass: 0.4,
    snapRadius: 40,
  },
} as const

export type DragPhysicsPreset = keyof typeof dragPhysicsPresets
