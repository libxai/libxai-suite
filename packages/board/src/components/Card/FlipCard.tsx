/**
 * FlipCard - Advanced card flip animations with 3D transforms
 * Features: Click to flip, automatic flip, controlled flip, custom transitions
 * Inspired by: Stripe pricing cards, Apple product cards, Material Design
 * @module components/Card
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Card as CardType } from '../../types'

export interface FlipCardProps {
  /** Card data */
  card?: CardType
  /** Front content */
  frontContent: React.ReactNode
  /** Back content */
  backContent: React.ReactNode
  /** Controlled flip state */
  isFlipped?: boolean
  /** Flip callback */
  onFlip?: (flipped: boolean) => void
  /** Enable click to flip */
  enableClickFlip?: boolean
  /** Enable hover to flip */
  enableHoverFlip?: boolean
  /** Auto flip interval (ms) - 0 to disable */
  autoFlipInterval?: number
  /** Flip direction */
  flipDirection?: 'horizontal' | 'vertical'
  /** Flip duration (seconds) */
  flipDuration?: number
  /** Custom className */
  className?: string
  /** Card width */
  width?: string | number
  /** Card height */
  height?: string | number
  /** Perspective depth (px) */
  perspective?: number
  /** Disable interaction */
  disabled?: boolean
}

/**
 * FlipCard - 3D flip card component
 *
 * @example
 * ```tsx
 * <FlipCard
 *   frontContent={<CardFront card={card} />}
 *   backContent={<CardBack card={card} />}
 *   enableClickFlip
 *   flipDirection="horizontal"
 * />
 * ```
 */
export function FlipCard({
  card,
  frontContent,
  backContent,
  isFlipped: controlledFlipped,
  onFlip,
  enableClickFlip = true,
  enableHoverFlip = false,
  autoFlipInterval = 0,
  flipDirection = 'horizontal',
  flipDuration = 0.6,
  className = '',
  width = '100%',
  height = '200px',
  perspective = 1000,
  disabled = false,
}: FlipCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  // Auto flip interval
  useEffect(() => {
    if (autoFlipInterval > 0 && !disabled) {
      const interval = setInterval(() => {
        handleFlip()
      }, autoFlipInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [autoFlipInterval, disabled, isFlipped])

  const handleFlip = () => {
    if (disabled) return

    const newFlipped = !isFlipped
    if (controlledFlipped === undefined) {
      setInternalFlipped(newFlipped)
    }
    onFlip?.(newFlipped)
  }

  const handleClick = () => {
    if (enableClickFlip) {
      handleFlip()
    }
  }

  const handleMouseEnter = () => {
    if (enableHoverFlip && !isFlipped && !disabled) {
      handleFlip()
    }
  }

  const handleMouseLeave = () => {
    if (enableHoverFlip && isFlipped && !disabled) {
      handleFlip()
    }
  }

  const rotateAxis = flipDirection === 'horizontal' ? 'Y' : 'X'
  const frontRotate = `rotate${rotateAxis}(${isFlipped ? 180 : 0}deg)`
  const backRotate = `rotate${rotateAxis}(${isFlipped ? 0 : -180}deg)`

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    perspective: `${perspective}px`,
    position: 'relative',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    cursor: disabled ? 'default' : enableClickFlip ? 'pointer' : 'default',
  }

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  }

  return (
    <div
      className={`flip-card-container ${className}`}
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-card-id={card?.id}
    >
      <motion.div
        className="flip-card"
        style={cardStyle}
        animate={{
          rotateY: flipDirection === 'horizontal' ? (isFlipped ? 180 : 0) : 0,
          rotateX: flipDirection === 'vertical' ? (isFlipped ? 180 : 0) : 0,
        }}
        transition={{
          duration: flipDuration,
          ease: [0.4, 0.0, 0.2, 1], // Material Design easing
        }}
      >
        {/* Front face */}
        <motion.div
          className="flip-card-front"
          style={{
            ...faceStyle,
            transform: frontRotate,
          }}
        >
          {frontContent}
        </motion.div>

        {/* Back face */}
        <motion.div
          className="flip-card-back"
          style={{
            ...faceStyle,
            transform: backRotate,
          }}
        >
          {backContent}
        </motion.div>
      </motion.div>
    </div>
  )
}

/**
 * StackedFlipCards - Multiple cards that flip in sequence
 */
export function StackedFlipCards({
  cards,
  renderFront,
  renderBack,
  stagger = 0.1,
  className = '',
}: {
  cards: CardType[]
  renderFront: (card: CardType) => React.ReactNode
  renderBack: (card: CardType) => React.ReactNode
  stagger?: number
  className?: string
}) {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (flippedIndex === null) {
      // Start flip sequence
      let index = 0
      const interval = setInterval(() => {
        setFlippedIndex(index)
        index++
        if (index >= cards.length) {
          clearInterval(interval)
        }
      }, stagger * 1000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [])

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {cards.map((card, index) => (
        <FlipCard
          key={card.id}
          card={card}
          frontContent={renderFront(card)}
          backContent={renderBack(card)}
          isFlipped={flippedIndex !== null && index <= flippedIndex}
          flipDuration={0.4}
        />
      ))}
    </div>
  )
}

/**
 * CarouselFlipCard - Card that flips through multiple faces
 */
export function CarouselFlipCard({
  faces,
  autoPlay = false,
  interval = 3000,
  className = '',
}: {
  faces: React.ReactNode[]
  autoPlay?: boolean
  interval?: number
  className?: string
}) {
  const [currentFace, setCurrentFace] = useState(0)

  useEffect(() => {
    if (autoPlay && faces.length > 1) {
      const timer = setInterval(() => {
        setCurrentFace((prev) => (prev + 1) % faces.length)
      }, interval)
      return () => clearInterval(timer)
    }
    return undefined
  }, [autoPlay, interval, faces.length])

  const nextFace = () => {
    setCurrentFace((prev) => (prev + 1) % faces.length)
  }

  const prevFace = () => {
    setCurrentFace((prev) => (prev - 1 + faces.length) % faces.length)
  }

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFace}
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {faces[currentFace]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation controls */}
      {faces.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={prevFace}
            className="px-3 py-1 bg-white rounded shadow hover:bg-gray-100"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={nextFace}
            className="px-3 py-1 bg-white rounded shadow hover:bg-gray-100"
            aria-label="Next"
          >
            →
          </button>
        </div>
      )}

      {/* Indicators */}
      {faces.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1">
          {faces.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentFace(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentFace ? 'bg-blue-500 w-4' : 'bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Hook for managing flip card state
 */
export function useFlipCard(initialFlipped = false) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped)

  const flip = () => setIsFlipped(!isFlipped)
  const flipTo = (flipped: boolean) => setIsFlipped(flipped)
  const reset = () => setIsFlipped(initialFlipped)

  return {
    isFlipped,
    flip,
    flipTo,
    reset,
  }
}

/**
 * Preset flip card configurations
 */
export const flipCardPresets = {
  /** Stripe-style pricing card */
  pricing: {
    flipDuration: 0.5,
    enableClickFlip: true,
    enableHoverFlip: false,
    flipDirection: 'horizontal' as const,
    perspective: 1200,
  },
  /** Apple-style product showcase */
  showcase: {
    flipDuration: 0.8,
    enableClickFlip: true,
    enableHoverFlip: true,
    flipDirection: 'vertical' as const,
    perspective: 1500,
  },
  /** Quick info card */
  quick: {
    flipDuration: 0.3,
    enableClickFlip: true,
    enableHoverFlip: false,
    flipDirection: 'horizontal' as const,
    perspective: 1000,
  },
  /** Automatic slideshow */
  slideshow: {
    flipDuration: 0.6,
    autoFlipInterval: 4000,
    enableClickFlip: false,
    enableHoverFlip: false,
    flipDirection: 'horizontal' as const,
    perspective: 1200,
  },
} as const

export type FlipCardPreset = keyof typeof flipCardPresets
