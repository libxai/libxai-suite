/**
 * CoverImageManager - Elite UX for cover images
 *
 * Features:
 * - Drag & drop (primary action)
 * - Paste from clipboard
 * - File upload browser
 * - URL input
 * - Unsplash integration
 * - Recent uploads gallery
 * - Reposition tool
 *
 * Inspired by: Notion + Linear
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils'
import './cover-image-manager.css'

export interface RecentUpload {
  url: string
  thumbnail: string
  uploadedAt: Date
  usedCount: number
}

export interface UnsplashPhoto {
  id: string
  urls: {
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    username: string
  }
  description?: string
}

export interface CoverImageManagerProps {
  /** Current cover image URL */
  coverImage?: string

  /** Upload callback - returns URL after upload */
  onUpload?: (file: File) => Promise<string>

  /** Change callback */
  onChange: (url: string) => void

  /** Remove callback */
  onRemove: () => void

  /** Unsplash API access key (optional) */
  unsplashAccessKey?: string

  /** Max file size in MB */
  maxFileSize?: number

  /** Show recent uploads */
  showRecentUploads?: boolean
}

type TabType = 'upload' | 'link' | 'unsplash'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const RECENT_UPLOADS_KEY = 'asakaa-recent-uploads'
const MAX_RECENT_UPLOADS = 10

export function CoverImageManager({
  coverImage,
  onUpload,
  onChange,
  onRemove,
  unsplashAccessKey,
  maxFileSize = MAX_FILE_SIZE,
  showRecentUploads = true,
}: CoverImageManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [unsplashQuery, setUnsplashQuery] = useState('')
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])
  const [repositionMode, setRepositionMode] = useState(false)
  const [repositionOffset, setRepositionOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recent uploads from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_UPLOADS_KEY)
      if (saved) {
        const uploads = JSON.parse(saved) as RecentUpload[]
        setRecentUploads(uploads.slice(0, MAX_RECENT_UPLOADS))
      }
    } catch (err) {
      console.error('Failed to load recent uploads:', err)
    }
  }, [])

  // Save recent upload
  const saveRecentUpload = useCallback((url: string, thumbnail?: string) => {
    const newUpload: RecentUpload = {
      url,
      thumbnail: thumbnail || url,
      uploadedAt: new Date(),
      usedCount: 1,
    }

    setRecentUploads((prev) => {
      // Check if already exists
      const existing = prev.find((u) => u.url === url)
      if (existing) {
        // Increment usage count
        const updated = prev.map((u) =>
          u.url === url ? { ...u, usedCount: u.usedCount + 1 } : u
        )
        // Sort by usage count, then date
        const sorted = updated.sort((a, b) => {
          if (a.usedCount !== b.usedCount) {
            return b.usedCount - a.usedCount
          }
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        })
        localStorage.setItem(RECENT_UPLOADS_KEY, JSON.stringify(sorted))
        return sorted
      }

      // Add new upload
      const updated = [newUpload, ...prev].slice(0, MAX_RECENT_UPLOADS)
      localStorage.setItem(RECENT_UPLOADS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null)

      // Validate file size
      if (file.size > maxFileSize) {
        setError(`File too large. Max size: ${maxFileSize / (1024 * 1024)}MB`)
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPG, PNG, GIF, WebP)')
        return
      }

      setIsUploading(true)
      setUploadProgress(0)

      try {
        let url: string

        if (onUpload) {
          // Custom upload handler
          url = await onUpload(file)
        } else {
          // Default: convert to base64 data URL
          url = await fileToDataURL(file)
        }

        // Simulate progress for UX
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress(i)
          await new Promise((resolve) => setTimeout(resolve, 50))
        }

        onChange(url)
        saveRecentUpload(url)
        setIsUploading(false)
        setUploadProgress(0)
      } catch (err) {
        console.error('Upload failed:', err)
        setError('Upload failed. Please try again.')
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [maxFileSize, onUpload, onChange, saveRecentUpload]
  )

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && acceptedFiles[0]) {
        handleFileUpload(acceptedFiles[0])
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: maxFileSize,
    multiple: false,
    noClick: true, // We handle click separately
  })

  // Paste detection
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            await handleFileUpload(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleFileUpload])

  // Handle URL input
  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return

    // Basic URL validation
    try {
      new URL(urlInput)
      onChange(urlInput)
      saveRecentUpload(urlInput)
      setUrlInput('')
      setError(null)
    } catch {
      setError('Please enter a valid URL')
    }
  }, [urlInput, onChange, saveRecentUpload])

  // Search Unsplash
  const searchUnsplash = useCallback(
    async (query: string) => {
      if (!unsplashAccessKey) {
        setError('Unsplash integration not configured')
        return
      }

      if (!query.trim()) return

      setIsSearching(true)
      setError(null)

      try {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
          {
            headers: {
              Authorization: `Client-ID ${unsplashAccessKey}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Unsplash search failed')
        }

        const data = await response.json()
        setUnsplashResults(data.results || [])
      } catch (err) {
        console.error('Unsplash search failed:', err)
        setError('Failed to search Unsplash. Please try again.')
      } finally {
        setIsSearching(false)
      }
    },
    [unsplashAccessKey]
  )

  // Select Unsplash photo
  const handleUnsplashSelect = useCallback(
    (photo: UnsplashPhoto) => {
      onChange(photo.urls.regular)
      saveRecentUpload(photo.urls.regular, photo.urls.thumb)
    },
    [onChange, saveRecentUpload]
  )

  if (coverImage && !repositionMode) {
    // Preview mode
    return (
      <div className="cover-image-preview">
        <div className="cover-image-preview-container">
          <img
            src={coverImage}
            alt="Cover"
            style={{ transform: `translateY(${repositionOffset}%)` }}
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/600x200?text=Image+Not+Found'
            }}
          />
        </div>

        <div className="cover-image-actions">
          <button
            className="cover-image-button"
            onClick={() => setRepositionMode(true)}
          >
            <RepositionIcon />
            Reposition
          </button>
          <button
            className="cover-image-button"
            onClick={() => {
              setRepositionMode(false)
              setRepositionOffset(0)
              // Clear cover and show uploader
              onRemove()
            }}
          >
            <ChangeIcon />
            Change
          </button>
          <button
            className="cover-image-button cover-image-button-danger"
            onClick={onRemove}
          >
            <RemoveIcon />
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cover-image-manager">
      {/* Tabs */}
      <div className="cover-image-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'upload'}
          className={cn('cover-image-tab', {
            'cover-image-tab-active': activeTab === 'upload',
          })}
          onClick={() => setActiveTab('upload')}
        >
          <UploadIcon />
          Upload
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'link'}
          className={cn('cover-image-tab', {
            'cover-image-tab-active': activeTab === 'link',
          })}
          onClick={() => setActiveTab('link')}
        >
          <LinkIcon />
          Link
        </button>
        {unsplashAccessKey && (
          <button
            role="tab"
            aria-selected={activeTab === 'unsplash'}
            className={cn('cover-image-tab', {
              'cover-image-tab-active': activeTab === 'unsplash',
            })}
            onClick={() => setActiveTab('unsplash')}
          >
            <UnsplashIcon />
            Unsplash
          </button>
        )}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="cover-image-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Panels */}
      <div className="cover-image-panels">
        {/* UPLOAD PANEL */}
        {activeTab === 'upload' && (
          <div className="cover-image-panel">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn('cover-image-dropzone', {
                'cover-image-dropzone-active': isDragActive,
                'cover-image-dropzone-reject': isDragReject,
              })}
            >
              <input {...getInputProps()} ref={fileInputRef} />

              {isUploading ? (
                <div className="cover-image-uploading">
                  <div className="cover-image-progress">
                    <div
                      className="cover-image-progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p>Uploading... {uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <UploadIcon size={48} />
                  <h3>Drop image here</h3>
                  <p className="cover-image-hint">
                    or paste from clipboard (Cmd/Ctrl+V)
                  </p>
                  <button
                    className="cover-image-button-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </button>
                  <p className="cover-image-meta">
                    Max {maxFileSize / (1024 * 1024)}MB · JPG, PNG, GIF, WebP
                  </p>
                </>
              )}
            </div>

            {/* Recent uploads */}
            {showRecentUploads && recentUploads.length > 0 && (
              <div className="cover-image-recent">
                <h4>Recent uploads</h4>
                <div className="cover-image-recent-grid">
                  {recentUploads.slice(0, 4).map((upload, index) => (
                    <button
                      key={index}
                      className="cover-image-recent-item"
                      onClick={() => onChange(upload.url)}
                      style={{ backgroundImage: `url(${upload.thumbnail})` }}
                      title="Click to use this image"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LINK PANEL */}
        {activeTab === 'link' && (
          <div className="cover-image-panel">
            <div className="cover-image-url-input">
              <input
                type="url"
                placeholder="Paste image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUrlSubmit()
                  }
                }}
              />
              <button
                className="cover-image-button-primary"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
              >
                Add image
              </button>
            </div>
          </div>
        )}

        {/* UNSPLASH PANEL */}
        {activeTab === 'unsplash' && unsplashAccessKey && (
          <div className="cover-image-panel">
            <div className="cover-image-search">
              <input
                type="search"
                placeholder="Search Unsplash..."
                value={unsplashQuery}
                onChange={(e) => setUnsplashQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchUnsplash(unsplashQuery)
                  }
                }}
              />
              <button
                className="cover-image-button-primary"
                onClick={() => searchUnsplash(unsplashQuery)}
                disabled={isSearching || !unsplashQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Unsplash results */}
            {unsplashResults.length > 0 && (
              <div className="cover-image-unsplash-grid">
                {unsplashResults.map((photo) => (
                  <button
                    key={photo.id}
                    className="cover-image-unsplash-item"
                    onClick={() => handleUnsplashSelect(photo)}
                    style={{ backgroundImage: `url(${photo.urls.small})` }}
                    title={`Photo by ${photo.user.name}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper: Convert file to base64 data URL
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Icons
function UploadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function UnsplashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.5 6.5H16.5V0H7.5V6.5ZM16.5 9H24V24H0V9H7.5V16.5H16.5V9Z" />
    </svg>
  )
}

function RepositionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="7 13 12 8 17 13" />
      <polyline points="7 17 12 12 17 17" />
    </svg>
  )
}

function ChangeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
