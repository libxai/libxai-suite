/**
 * Portal Component
 * Renders children outside the parent DOM hierarchy
 * Solves z-index stacking context issues
 */

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface PortalProps {
  children: ReactNode
  /** Element to portal into (defaults to document.body) */
  container?: HTMLElement
}

/**
 * Portal component that renders children at the root level
 * Perfect for modals, tooltips, dropdowns that need to escape stacking context
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) {
    return null
  }

  const target = container || (typeof document !== 'undefined' ? document.body : null)

  if (!target) {
    return null
  }

  return createPortal(children, target)
}
