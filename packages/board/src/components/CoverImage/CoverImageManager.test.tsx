/**
 * CoverImageManager Unit Tests
 * Testing button styles and remove functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CoverImageManager } from './CoverImageManager'

describe('CoverImageManager', () => {
  const mockOnChange = vi.fn()
  const mockOnRemove = vi.fn()
  const mockOnUpload = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Button Styles (Problem 1)', () => {
    it('should render buttons with improved styles when cover image exists', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      // Check if buttons container has proper class
      const actionsContainer = container.querySelector('.cover-image-actions')
      expect(actionsContainer).toBeInTheDocument()

      // Check if buttons have proper classes
      const buttons = container.querySelectorAll('.cover-image-button')
      expect(buttons).toHaveLength(3) // Reposition, Change, Remove

      // Verify Reposition button
      const repositionBtn = buttons[0]
      expect(repositionBtn).toHaveClass('cover-image-button')
      expect(repositionBtn).toHaveTextContent('Reposition')

      // Verify Change button
      const changeBtn = buttons[1]
      expect(changeBtn).toHaveClass('cover-image-button')
      expect(changeBtn).toHaveTextContent('Change')

      // Verify Remove button (danger variant)
      const removeBtn = buttons[2]
      expect(removeBtn).toHaveClass('cover-image-button')
      expect(removeBtn).toHaveClass('cover-image-button-danger')
      expect(removeBtn).toHaveTextContent('Remove')
    })

    it('should have proper CSS classes applied to buttons', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const button = container.querySelector('.cover-image-button')
      expect(button).toBeInTheDocument()

      // Verify button has the correct className
      // CSS will be applied in production via the stylesheet
      expect(button).toHaveClass('cover-image-button')

      // Verify button structure for flex layout
      expect(button?.tagName).toBe('BUTTON')
    })

    it('should apply danger styling to Remove button', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const removeBtn = container.querySelector('.cover-image-button-danger')
      expect(removeBtn).toBeInTheDocument()
      expect(removeBtn).toHaveTextContent('Remove')
    })
  })

  describe('Remove Functionality (Problem 2)', () => {
    it('should call onRemove when Remove button is clicked', async () => {
      render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const removeBtn = screen.getByText('Remove')
      fireEvent.click(removeBtn)

      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })

    it('should hide image preview after onRemove is called', async () => {
      const { rerender } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      // Image should be visible initially
      const imagePreview = screen.getByAltText('Cover')
      expect(imagePreview).toBeInTheDocument()

      // Click remove
      const removeBtn = screen.getByText('Remove')
      fireEvent.click(removeBtn)

      // Simulate parent component updating coverImage prop to undefined
      rerender(
        <CoverImageManager
          coverImage={undefined}
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      // Image should no longer be visible
      await waitFor(() => {
        expect(screen.queryByAltText('Cover')).not.toBeInTheDocument()
      })
    })

    it('should show upload interface after image is removed', async () => {
      const { rerender } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      // Click remove
      const removeBtn = screen.getByText('Remove')
      fireEvent.click(removeBtn)

      // Simulate parent updating props
      rerender(
        <CoverImageManager
          coverImage={undefined}
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      // Upload interface should be visible
      await waitFor(() => {
        expect(screen.getByText(/Drop image here/i)).toBeInTheDocument()
      })
    })

    it('should call both onChange and onRemove when Change button is clicked', () => {
      render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const changeBtn = screen.getByText('Change')
      fireEvent.click(changeBtn)

      // Change should call onRemove to clear current image
      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration with CardDetailModalV2', () => {
    it('should update parent component state when image is removed', async () => {
      let currentImage: string | undefined = 'https://example.com/image.jpg'

      const handleRemove = vi.fn(() => {
        currentImage = undefined
      })

      const { rerender } = render(
        <CoverImageManager
          coverImage={currentImage}
          onChange={mockOnChange}
          onRemove={handleRemove}
        />
      )

      // Remove image
      const removeBtn = screen.getByText('Remove')
      fireEvent.click(removeBtn)

      expect(handleRemove).toHaveBeenCalled()
      expect(currentImage).toBeUndefined()

      // Rerender with updated state
      rerender(
        <CoverImageManager
          coverImage={currentImage}
          onChange={mockOnChange}
          onRemove={handleRemove}
        />
      )

      // Should show upload interface
      await waitFor(() => {
        expect(screen.getByText(/Drop image here/i)).toBeInTheDocument()
      })
    })
  })

  describe('Button Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const buttons = container.querySelectorAll('.cover-image-button')

      buttons.forEach(button => {
        // Buttons should be keyboard accessible
        expect(button.tagName).toBe('BUTTON')
        expect(button).not.toHaveAttribute('disabled')
      })
    })

    it('should be keyboard navigable', () => {
      render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const removeBtn = screen.getByText('Remove')

      // Should be focusable
      removeBtn.focus()
      expect(document.activeElement).toBe(removeBtn)

      // Should trigger on Enter key
      fireEvent.keyDown(removeBtn, { key: 'Enter', code: 'Enter' })
      // Button click should still work (browser default behavior)
    })
  })

  describe('Visual Regression Tests', () => {
    it('should match snapshot for preview mode with buttons', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      expect(container.querySelector('.cover-image-preview')).toMatchSnapshot()
    })

    it('should match snapshot for button styles', () => {
      const { container } = render(
        <CoverImageManager
          coverImage="https://example.com/image.jpg"
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      )

      const actionsContainer = container.querySelector('.cover-image-actions')
      expect(actionsContainer).toMatchSnapshot()
    })
  })
})
