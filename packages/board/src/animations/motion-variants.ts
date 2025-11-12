/**
 * Motion Variants - Premium Framer Motion animations
 * Inspired by: Notion, Linear, ClickUp
 * @module animations/motion-variants
 */

import type { Variants, Transition } from 'framer-motion'

// ============================================================================
// EASING FUNCTIONS (Premium feel)
// ============================================================================

export const easing = {
  // Notion-style smooth easing
  smooth: [0.25, 0.1, 0.25, 1],
  // Linear-style snappy
  snappy: [0.4, 0, 0.2, 1],
  // ClickUp bounce
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Natural spring
  spring: [0.175, 0.885, 0.32, 1.275],
  // Gentle entrance
  gentle: [0.33, 1, 0.68, 1],
} as const

// ============================================================================
// TRANSITIONS (Reusable timing configs)
// ============================================================================

export const transitions = {
  fast: {
    duration: 0.15,
    ease: easing.snappy,
  },
  smooth: {
    duration: 0.3,
    ease: easing.smooth,
  },
  gentle: {
    duration: 0.4,
    ease: easing.gentle,
  },
  spring: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300,
  },
  bounce: {
    type: 'spring' as const,
    damping: 10,
    stiffness: 200,
  },
} satisfies Record<string, Transition>

// ============================================================================
// CARD ANIMATIONS
// ============================================================================

/**
 * Card entrance animation (when added to board)
 */
export const cardEnter: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: -20,
    transition: transitions.fast,
  },
}

/**
 * Card hover animation (micro-interaction)
 */
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transition: transitions.smooth,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: transitions.fast,
  },
}

/**
 * Card drag preview (physics-based)
 */
export const cardDrag: Variants = {
  dragging: {
    scale: 1.05,
    rotate: 2,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 1000,
    cursor: 'grabbing',
    transition: {
      ...transitions.spring,
      rotate: {
        duration: 0.2,
        ease: easing.bounce,
      },
    },
  },
  notDragging: {
    scale: 1,
    rotate: 0,
    zIndex: 1,
    cursor: 'grab',
    transition: transitions.smooth,
  },
}

/**
 * Card flip animation (front/back toggle)
 */
export const cardFlip: Variants = {
  front: {
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: easing.smooth,
    },
  },
  back: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: easing.smooth,
    },
  },
}

/**
 * Card swipe to archive (gesture)
 */
export const cardSwipe: Variants = {
  rest: {
    x: 0,
    opacity: 1,
  },
  swipeLeft: {
    x: '-100%',
    opacity: 0,
    transition: transitions.fast,
  },
  swipeRight: {
    x: '100%',
    opacity: 0,
    transition: transitions.fast,
  },
}

// ============================================================================
// COLUMN ANIMATIONS
// ============================================================================

/**
 * Column entrance (staggered children)
 */
export const columnEnter: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      ...transitions.smooth,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

/**
 * Column collapse/expand
 */
export const columnCollapse: Variants = {
  collapsed: {
    width: 60,
    transition: transitions.smooth,
  },
  expanded: {
    width: 'auto',
    transition: transitions.smooth,
  },
}

// ============================================================================
// MODAL ANIMATIONS
// ============================================================================

/**
 * Modal backdrop fade
 */
export const modalBackdrop: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: transitions.fast,
  },
}

/**
 * Modal content slide up
 */
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...transitions.gentle,
      scale: {
        ...transitions.spring,
      },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: transitions.fast,
  },
}

// ============================================================================
// BUTTON ANIMATIONS
// ============================================================================

/**
 * Button press animation (satisfying feedback)
 */
export const buttonPress: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
    transition: transitions.fast,
  },
}

/**
 * Button with shimmer effect
 */
export const buttonShimmer = {
  hover: {
    backgroundPosition: '200% center',
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// ============================================================================
// LIST ANIMATIONS
// ============================================================================

/**
 * Staggered list entrance
 */
export const listContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
}

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

/**
 * Skeleton pulse animation (premium loading)
 */
export const skeletonPulse: Variants = {
  loading: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
}

/**
 * Shimmer loading effect
 */
export const shimmer = {
  backgroundPosition: ['0% 50%', '200% 50%'],
  transition: {
    duration: 2,
    ease: 'linear',
    repeat: Infinity,
  },
}

// ============================================================================
// NOTIFICATION ANIMATIONS
// ============================================================================

/**
 * Toast notification slide in
 */
export const toastSlide: Variants = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      ...transitions.spring,
      damping: 25,
    },
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: transitions.fast,
  },
}

// ============================================================================
// PROGRESS ANIMATIONS
// ============================================================================

/**
 * Progress bar fill animation
 */
export const progressFill = (progress: number): Variants => ({
  empty: {
    width: '0%',
  },
  filled: {
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: easing.smooth,
    },
  },
})

// ============================================================================
// UTILITY ANIMATIONS
// ============================================================================

/**
 * Fade in/out
 */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.smooth },
  exit: { opacity: 0, transition: transitions.fast },
}

/**
 * Slide from direction
 */
export const slide = (direction: 'up' | 'down' | 'left' | 'right'): Variants => {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const value = direction === 'right' || direction === 'down' ? 100 : -100

  return {
    hidden: axis === 'x'
      ? { x: value, opacity: 0 }
      : { y: value, opacity: 0 },
    visible: axis === 'x'
      ? { x: 0, opacity: 1, transition: transitions.smooth }
      : { y: 0, opacity: 1, transition: transitions.smooth },
    exit: axis === 'x'
      ? { x: value, opacity: 0, transition: transitions.fast }
      : { y: value, opacity: 0, transition: transitions.fast },
  }
}

/**
 * Scale in/out
 */
export const scale: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: transitions.spring,
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: transitions.fast,
  },
}

/**
 * Rotate animation
 */
export const rotate = (degrees: number = 360): Variants => ({
  rotating: {
    rotate: degrees,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
})
