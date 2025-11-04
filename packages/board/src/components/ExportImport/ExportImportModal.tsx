/**
 * ExportImportModal Component
 * Modal for exporting and importing board data
 * @module components/ExportImport
 */

import { useState, useRef } from 'react'
import type { Board, ExportFormat, ImportResult } from '../../types'
import { exportBoard, downloadExport } from '../../utils/export'
import { readFile, importBoard } from '../../utils/import'
import { cn } from '../../utils'

export interface ExportImportModalProps {
  /** Board data to export */
  board: Board
  /** Is modal open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Import handler */
  onImport?: (result: ImportResult, content: string) => void
  /** Board element ref for PDF export */
  boardElementRef?: React.RefObject<HTMLElement>
  /** Custom className */
  className?: string
}

/**
 * ExportImportModal Component
 */
export function ExportImportModal({
  board,
  isOpen,
  onClose,
  onImport,
  boardElementRef,
  className,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleExport = async () => {
    const boardElement = boardElementRef?.current || undefined
    const content = await exportBoard(board, selectedFormat, boardElement)
    downloadExport(content, selectedFormat)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await readFile(file)
      const format = file.name.endsWith('.json') ? 'json' : 'csv'
      const result = importBoard(content, format)

      setImportResult(result)

      if (result.success && onImport) {
        onImport(result, content)
      }
    } catch (error) {
      setImportResult({
        success: false,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('fixed inset-0 z-[9999] flex items-center justify-center', className)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📦</span>
              Export / Import
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Transfer your board data
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-2xl leading-none p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('export')}
            className={cn(
              'flex-1 px-6 py-4 font-semibold transition-colors',
              activeTab === 'export'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={cn(
              'flex-1 px-6 py-4 font-semibold transition-colors',
              activeTab === 'import'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            Import
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-3">
                  Select format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['json', 'csv', 'pdf'] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-center',
                        selectedFormat === format
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-white/20 hover:border-white/40 text-white/70 hover:text-white'
                      )}
                    >
                      <div className="text-2xl mb-2">
                        {format === 'json' && '📄'}
                        {format === 'csv' && '📊'}
                        {format === 'pdf' && '📝'}
                      </div>
                      <div className="font-semibold uppercase text-xs">
                        {format}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white/90 mb-2">Preview</h3>
                <div className="text-xs text-white/60">
                  <div>Board: <span className="text-white/90">{board.title || 'Untitled'}</span></div>
                  <div>Columns: <span className="text-white/90">{board.columns.length}</span></div>
                  <div>Cards: <span className="text-white/90">{board.cards.length}</span></div>
                </div>
              </div>

              <button
                onClick={handleExport}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20"
              >
                Export Board
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-3">
                  Upload file
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 px-4 border-2 border-dashed border-white/30 hover:border-white/50 rounded-lg transition-colors text-white/70 hover:text-white"
                >
                  <div className="text-5xl mb-3">📁</div>
                  <div className="font-semibold mb-1">Click to select file</div>
                  <div className="text-xs text-white/50">Supports JSON and CSV files</div>
                </button>
              </div>

              {importResult && (
                <div
                  className={cn(
                    'p-4 rounded-lg',
                    importResult.success
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  )}
                >
                  <h3
                    className={cn(
                      'font-semibold mb-2',
                      importResult.success ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {importResult.success ? '✓ Import Successful' : '✗ Import Failed'}
                  </h3>
                  {importResult.success && (
                    <div className="text-sm text-white/80">
                      <div>Cards imported: {importResult.cardsImported}</div>
                      <div>Columns imported: {importResult.columnsImported}</div>
                    </div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-red-300">
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
