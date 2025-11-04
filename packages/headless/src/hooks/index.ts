/**
 * @libxai/headless - Framework-agnostic hooks
 * Use with React, Vue, Svelte, or Vanilla JS
 *
 * @packageDocumentation
 */

export { createStore } from './createStore'
export { useBoardState } from './useBoardState'
export { useCardDrag } from './useCardDrag'
export { useMultiSelect } from './useMultiSelect'
export { useKeyboardNav } from './useKeyboardNav'

export type {
  UseBoardStateConfig,
  UseBoardStateReturn
} from './useBoardState'

export type {
  UseCardDragConfig,
  UseCardDragReturn
} from './useCardDrag'

export type {
  UseMultiSelectConfig,
  UseMultiSelectReturn
} from './useMultiSelect'

export type {
  UseKeyboardNavConfig,
  UseKeyboardNavReturn
} from './useKeyboardNav'
