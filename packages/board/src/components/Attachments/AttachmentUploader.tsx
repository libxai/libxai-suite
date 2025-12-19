/**
 * AttachmentUploader Component
 * Drag & drop file uploader with preview
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Attachment } from '../../types'
import './attachments.css'

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
  const [lightboxImage, setLightboxImage] = useState<Attachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle keyboard events for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxImage) return

      if (e.key === 'Escape') {
        setLightboxImage(null)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const imageAttachments = attachments.filter(a => isImage(a.type))
        const currentIndex = imageAttachments.findIndex(a => a.id === lightboxImage.id)
        if (currentIndex === -1) return

        let newIndex: number
        if (e.key === 'ArrowLeft') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : imageAttachments.length - 1
        } else {
          newIndex = currentIndex < imageAttachments.length - 1 ? currentIndex + 1 : 0
        }
        const nextImage = imageAttachments[newIndex]
        if (nextImage) {
          setLightboxImage(nextImage)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, attachments])

  // Handle image click to open lightbox
  const handleImageClick = useCallback((attachment: Attachment, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLightboxImage(attachment)
  }, [])

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxImage(null)
  }, [])

  // Navigate to previous/next image
  const navigateLightbox = useCallback((direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation()
    const imageAttachments = attachments.filter(a => isImage(a.type))
    const currentIndex = imageAttachments.findIndex(a => a.id === lightboxImage?.id)
    if (currentIndex === -1) return

    let newIndex: number
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : imageAttachments.length - 1
    } else {
      newIndex = currentIndex < imageAttachments.length - 1 ? currentIndex + 1 : 0
    }
    const nextImage = imageAttachments[newIndex]
    if (nextImage) {
      setLightboxImage(nextImage)
    }
  }, [attachments, lightboxImage])

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

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="attachment-lightbox" onClick={closeLightbox}>
          <div className="attachment-lightbox-backdrop" />

          {/* Close button */}
          <button
            type="button"
            className="attachment-lightbox-close"
            onClick={closeLightbox}
            title="Close (Esc)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Navigation arrows */}
          {attachments.filter(a => isImage(a.type)).length > 1 && (
            <>
              <button
                type="button"
                className="attachment-lightbox-nav attachment-lightbox-prev"
                onClick={(e) => navigateLightbox('prev', e)}
                title="Previous image (Left arrow)"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                type="button"
                className="attachment-lightbox-nav attachment-lightbox-next"
                onClick={(e) => navigateLightbox('next', e)}
                title="Next image (Right arrow)"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* Image container */}
          <div className="attachment-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="attachment-lightbox-image"
            />
            <div className="attachment-lightbox-info">
              <span className="attachment-lightbox-name">{lightboxImage.name}</span>
              <span className="attachment-lightbox-size">{formatFileSize(lightboxImage.size)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
