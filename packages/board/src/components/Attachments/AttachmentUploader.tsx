/**
 * AttachmentUploader Component
 * Drag & drop file uploader with preview
 */

import { useState, useCallback, useRef } from 'react'
import type { Attachment } from '../../types'
import './attachments.css'

// v0.17.171: Native DOM lightbox to escape all stacking contexts (framer-motion transform issue)
function openNativeLightbox(
  imageUrl: string,
  imageName: string,
  allImages: Attachment[],
  currentIndex: number,
  onNavigate: (newIndex: number) => void
) {
  // Remove any existing lightbox
  const existing = document.getElementById('attachment-lightbox-native')
  if (existing) existing.remove()

  // Create lightbox container
  const lightbox = document.createElement('div')
  lightbox.id = 'attachment-lightbox-native'
  lightbox.className = 'attachment-lightbox'
  lightbox.style.cssText = `
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(0, 0, 0, 0.95) !important;
    cursor: pointer !important;
  `

  // Create image
  const img = document.createElement('img')
  img.src = imageUrl
  img.alt = imageName
  img.className = 'attachment-lightbox-image'
  img.style.cssText = `
    max-width: 92vw !important;
    max-height: 92vh !important;
    object-fit: contain !important;
    cursor: default !important;
  `
  img.onclick = (e) => e.stopPropagation()

  // Create hint
  const hint = document.createElement('div')
  hint.className = 'attachment-lightbox-hint'
  hint.textContent = 'Click anywhere or press ESC to close'
  hint.style.cssText = `
    position: absolute !important;
    bottom: 24px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    font-size: 12px !important;
    color: rgba(255, 255, 255, 0.4) !important;
    pointer-events: none !important;
  `

  // Close function
  const closeLightbox = () => {
    lightbox.remove()
    document.removeEventListener('keydown', handleKeyDown)
  }

  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox()
    } else if (e.key === 'ArrowLeft' && allImages.length > 1) {
      const newIdx = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1
      closeLightbox()
      onNavigate(newIdx)
    } else if (e.key === 'ArrowRight' && allImages.length > 1) {
      const newIdx = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0
      closeLightbox()
      onNavigate(newIdx)
    }
  }

  lightbox.onclick = closeLightbox
  document.addEventListener('keydown', handleKeyDown)

  // Add navigation if multiple images
  if (allImages.length > 1) {
    // Dots container
    const dots = document.createElement('div')
    dots.className = 'attachment-lightbox-dots'
    dots.style.cssText = `
      position: absolute !important;
      bottom: 48px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      display: flex !important;
      gap: 8px !important;
      padding: 8px 12px !important;
      background: rgba(0, 0, 0, 0.4) !important;
      border-radius: 20px !important;
    `
    dots.onclick = (e) => e.stopPropagation()

    allImages.forEach((_, idx) => {
      const dot = document.createElement('button')
      dot.className = `attachment-lightbox-dot ${idx === currentIndex ? 'active' : ''}`
      dot.style.cssText = `
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        background: ${idx === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.3)'} !important;
        border: none !important;
        padding: 0 !important;
        cursor: pointer !important;
      `
      dot.onclick = (e) => {
        e.stopPropagation()
        closeLightbox()
        onNavigate(idx)
      }
      dots.appendChild(dot)
    })

    // Navigation arrows
    const prevBtn = document.createElement('button')
    prevBtn.className = 'attachment-lightbox-nav-area attachment-lightbox-nav-prev'
    prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    prevBtn.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 120px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
      opacity: 0.5 !important;
    `
    prevBtn.onmouseenter = () => { prevBtn.style.opacity = '1' }
    prevBtn.onmouseleave = () => { prevBtn.style.opacity = '0.5' }
    prevBtn.onclick = (e) => {
      e.stopPropagation()
      const newIdx = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1
      closeLightbox()
      onNavigate(newIdx)
    }

    const nextBtn = document.createElement('button')
    nextBtn.className = 'attachment-lightbox-nav-area attachment-lightbox-nav-next'
    nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    nextBtn.style.cssText = `
      position: absolute !important;
      right: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 120px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
      opacity: 0.5 !important;
    `
    nextBtn.onmouseenter = () => { nextBtn.style.opacity = '1' }
    nextBtn.onmouseleave = () => { nextBtn.style.opacity = '0.5' }
    nextBtn.onclick = (e) => {
      e.stopPropagation()
      const newIdx = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0
      closeLightbox()
      onNavigate(newIdx)
    }

    lightbox.appendChild(dots)
    lightbox.appendChild(prevBtn)
    lightbox.appendChild(nextBtn)
  }

  lightbox.appendChild(img)
  lightbox.appendChild(hint)
  document.body.appendChild(lightbox)

  // Fade out hint after 2 seconds
  setTimeout(() => {
    hint.style.transition = 'opacity 0.5s ease'
    hint.style.opacity = '0'
  }, 2000)
}

export interface AttachmentUploaderProps {
  /** Card ID for attachments */
  cardId: string
  /** Existing attachments */
  attachments?: Attachment[]
  /** Callback when files are uploaded */
  onUpload?: (files: File[]) => Promise<void> | void
  /** Callback when attachment is deleted */
  onDelete?: (attachmentId: string) => void
  /** Current user ID */
  currentUserId?: string
  /** Max file size in MB */
  maxSizeMB?: number
  /** Allowed file types (MIME types) */
  allowedTypes?: string[]
  /** Max number of files */
  maxFiles?: number
}

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('video/')) return '🎥'
  if (type.startsWith('audio/')) return '🎵'
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('sheet') || type.includes('excel')) return '📊'
  if (type.includes('presentation') || type.includes('powerpoint')) return '📽️'
  if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return '🗜️'
  if (type.includes('text')) return '📃'
  return '📎'
}

/**
 * Check if file is an image
 */
function isImage(type: string): boolean {
  return type.startsWith('image/')
}

export function AttachmentUploader({
  attachments = [],
  onUpload,
  onDelete,
  maxSizeMB = 10,
  allowedTypes,
  maxFiles = 10,
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Store attachments ref for native lightbox navigation
  const attachmentsRef = useRef(attachments)
  attachmentsRef.current = attachments

  // v0.17.171: Handle image click - use native DOM lightbox to escape all stacking contexts
  const handleImageClick = useCallback((attachment: Attachment, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const imageAttachments = attachmentsRef.current.filter(a => isImage(a.type))
    const currentIndex = imageAttachments.findIndex(a => a.id === attachment.id)

    const handleNavigate = (newIndex: number) => {
      const imgs = attachmentsRef.current.filter(a => isImage(a.type))
      const newImg = imgs[newIndex]
      if (newImg) {
        openNativeLightbox(newImg.url, newImg.name, imgs, newIndex, handleNavigate)
      }
    }

    openNativeLightbox(attachment.url, attachment.name, imageAttachments, currentIndex, handleNavigate)
  }, [])

  // Handle file validation
  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = []
      const errors: string[] = []

      // Check max files
      if (attachments.length + files.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`)
        return { valid, errors }
      }

      files.forEach((file) => {
        // Check file size
        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > maxSizeMB) {
          errors.push(`${file.name} is too large (max ${maxSizeMB}MB)`)
          return
        }

        // Check file type
        if (allowedTypes && !allowedTypes.some((type) => file.type.match(type))) {
          errors.push(`${file.name} has invalid file type`)
          return
        }

        valid.push(file)
      })

      return { valid, errors }
    },
    [attachments.length, maxFiles, maxSizeMB, allowedTypes]
  )

  // Handle file upload
  const handleUpload = useCallback(
    async (files: File[]) => {
      const { valid, errors } = validateFiles(files)

      if (errors.length > 0) {
        setError(errors.join(', '))
        setTimeout(() => setError(null), 5000)
        return
      }

      if (valid.length === 0) return

      setIsUploading(true)
      setError(null)

      try {
        await onUpload?.(valid)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        setTimeout(() => setError(null), 5000)
      } finally {
        setIsUploading(false)
      }
    },
    [validateFiles, onUpload]
  )

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      handleUpload(files)
    },
    [handleUpload]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      handleUpload(files)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleUpload]
  )

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle delete
  const handleDelete = useCallback(
    (attachmentId: string) => {
      if (confirm('Are you sure you want to delete this attachment?')) {
        onDelete?.(attachmentId)
      }
    },
    [onDelete]
  )

  return (
    <div className="attachment-uploader">
      {/* Drop zone */}
      <div
        className={`attachment-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          accept={allowedTypes?.join(',')}
        />

        <div className="attachment-dropzone-content">
          {isUploading ? (
            <>
              <div className="attachment-spinner" />
              <p className="attachment-dropzone-text">Uploading...</p>
            </>
          ) : (
            <>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="attachment-dropzone-icon"
              >
                <path
                  d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 8L12 3L7 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 3V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="attachment-dropzone-text">
                {isDragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="attachment-dropzone-subtext">or click to browse</p>
              <p className="attachment-dropzone-info">
                Max {maxSizeMB}MB • {attachments.length}/{maxFiles} files
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="attachment-error">
          <span className="attachment-error-icon">⚠️</span>
          <span className="attachment-error-text">{error}</span>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-item">
              <div className="attachment-preview">
                {isImage(attachment.type) && attachment.url ? (
                  <button
                    type="button"
                    className="attachment-thumbnail-btn"
                    onClick={(e) => handleImageClick(attachment, e)}
                    title="Click to view full size"
                  >
                    <img
                      src={attachment.thumbnailUrl || attachment.url}
                      alt={attachment.name}
                      className="attachment-thumbnail"
                    />
                    <div className="attachment-thumbnail-overlay">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 21H3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 3L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 21L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className="attachment-icon">{getFileIcon(attachment.type)}</div>
                )}
              </div>

              <div className="attachment-info">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-name"
                  title={attachment.name}
                >
                  {attachment.name}
                </a>
                <div className="attachment-meta">
                  <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                  <span className="attachment-separator">•</span>
                  <span className="attachment-date">
                    {new Date(attachment.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(attachment.id)}
                className="attachment-delete"
                title="Delete attachment"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* v0.17.171: Lightbox is now handled via native DOM (openNativeLightbox) to escape all stacking contexts */}
    </div>
  )
}
