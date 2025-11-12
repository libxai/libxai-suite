/**
 * AnimatedCard - Framer Motion wrapper for premium card animations
 * Features: Hover effects, drag physics, flip animations, swipe gestures
 * @module components/Card
 */

import React, { useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { cardEnter, cardHover, cardDrag, cardFlip } from '../../animations/motion-variants'
import type { Card as CardType } from '../../types'

export interface AnimatedCardProps {
  /** Card data */
  card: CardType
  /** Card content renderer */
  children: React.ReactNode
  /** Enable hover animation */
  enableHoverEffect?: boolean
  /** Enable drag preview animation */
  enableDragPreview?: boolean
  /** Enable flip animation */
  enableFlip?: boolean
  /** Enable swipe to archive */
  enableSwipe?: boolean
  /** Flip state (controlled) */
  isFlipped?: boolean
  /** Flip callback */
  onFlipToggle?: () => void
  /** Back content (when flipped) */
  backContent?: React.ReactNode
  /** Swipe threshold (px) */
  swipeThreshold?: number
  /** Swipe callback */
  onSwipe?: (direction: 'left' | 'right') => void
  /** Archive callback */
  onArchive?: () => void
  /** Custom className */
  className?: string
  /** Dragging state (from DnD library) */
  isDragging?: boolean
  /** Layout animation */
  layoutId?: string
}

/**
 * AnimatedCard - Premium card with Framer Motion animations
 *
 * @example
 * ```tsx
 * <AnimatedCard
 *   card={card}
 *   enableHoverEffect
 *   enableDragPreview
 *   enableFlip
 *   backContent={<CardBackView card={card} />}
 * >
 *   <CardComponent card={card} />
 * </AnimatedCard>
 * ```
 */
export function AnimatedCard({
  children,
  enableHoverEffect = true,
  enableDragPreview = false,
  enableFlip = false,
  enableSwipe = false,
  isFlipped = false,
  onFlipToggle,
  backContent,
  swipeThreshold = 100,
  onSwipe,
  onArchive,
  className = '',
  isDragging = false,
  layoutId,
}: AnimatedCardProps) {
  const [localFlipped, setLocalFlipped] = useState(false)
  const flipped = isFlipped !== undefined ? isFlipped : localFlipped

  // Swipe gesture tracking
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
  const backgroundColor = useTransform(
    x,
    [-swipeThreshold, 0, swipeThreshold],
    ['rgba(239, 68, 68, 0.1)', 'rgba(255, 255, 255, 0)', 'rgba(34, 197, 94, 0.1)']
  )

  // Handle flip toggle
  const handleFlip = () => {
    if (onFlipToggle) {
      onFlipToggle()
    } else {
      setLocalFlipped(!flipped)
    }
  }

  // Handle swipe gesture
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 500) {
      const direction = offset > 0 ? 'right' : 'left'

      if (onSwipe) {
        onSwipe(direction)
      }

      if (onArchive) {
        onArchive()
      }
    }
  }

  // Combine motion props
  const motionProps: any = {
    layout: layoutId ? true : false,
    layoutId,
    variants: cardEnter,
    initial: 'hidden',
    animate: 'visible',
    exit: 'exit',
    className,
  }

  // Add hover effect
  if (enableHoverEffect && !isDragging) {
    motionProps.variants = cardHover
    motionProps.initial = 'rest'
    motionProps.whileHover = 'hover'
    motionProps.whileTap = 'tap'
  }

  // Add drag preview
  if (enableDragPreview && isDragging) {
    motionProps.variants = cardDrag
    motionProps.animate = 'dragging'
  }

  // Add swipe gesture
  if (enableSwipe && !isDragging) {
    motionProps.drag = 'x'
    motionProps.dragConstraints = { left: 0, right: 0 }
    motionProps.dragElastic = 0.7
    motionProps.onDragEnd = handleDragEnd
    motionProps.style = {
      x,
      opacity,
      backgroundColor,
    }
  }

  // Render flip animation
  if (enableFlip) {
    return (
      <motion.div
        {...motionProps}
        style={{
          perspective: 1000,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Front */}
        <motion.div
          variants={cardFlip}
          animate={flipped ? 'back' : 'front'}
          style={{
            backfaceVisibility: 'hidden',
            position: flipped ? 'absolute' : 'relative',
            width: '100%',
          }}
          onClick={handleFlip}
        >
          {children}
        </motion.div>

        {/* Back */}
        {backContent && (
          <motion.div
            variants={cardFlip}
            animate={flipped ? 'front' : 'back'}
            style={{
              backfaceVisibility: 'hidden',
              position: flipped ? 'relative' : 'absolute',
              width: '100%',
              rotateY: 180,
            }}
            onClick={handleFlip}
          >
            {backContent}
          </motion.div>
        )}
      </motion.div>
    )
  }

  // Standard animated card
  return <motion.div {...motionProps}>{children}</motion.div>
}

/**
 * Simple fade-in animation for card lists
 */
export function FadeInCard({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered list container for cards
 */
export function StaggeredCardList({
  children,
  className = '',
  staggerDelay = 0.05,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
