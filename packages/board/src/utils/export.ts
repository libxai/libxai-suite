import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import type { Board, ExportOptions, ExportFormat } from '../types'

export function exportToJSON(board: Board, _options?: ExportOptions): string {
  const data = {
    board: {
      id: board.id,
      title: board.title,
      metadata: board.metadata,
      exportedAt: new Date().toISOString(),
    },
    columns: board.columns,
    cards: board.cards,
    options: _options,
  }

  return JSON.stringify(data, null, 2)
}

export function exportToCSV(board: Board, _options?: ExportOptions): string {
  const headers = [
    'Card ID',
    'Title',
    'Description',
    'Column',
    'Priority',
    'Labels',
    'Assigned Users',
    'Start Date',
    'End Date',
    'Created At',
    'Updated At',
  ]

  const rows = board.cards.map((card) => {
    const column = board.columns.find((col) => col.id === card.columnId)

    return [
      card.id,
      escapeCSV(card.title),
      escapeCSV(card.description || ''),
      escapeCSV(column?.title || ''),
      card.priority || '',
      (card.labels || []).join(';'),
      (card.assignedUserIds || []).join(';'),
      card.startDate || '',
      card.endDate || '',
      card.createdAt || '',
      card.updatedAt || '',
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  return csvContent
}

export async function exportToPDF(
  board: Board,
  boardElement?: HTMLElement,
  _options?: ExportOptions
): Promise<jsPDF> {
  // Try to find board element automatically if not provided
  let element = boardElement

  if (!element) {
    // Look for the board element in the DOM
    const boardEl = document.querySelector<HTMLElement>('.asakaa-board')
    if (boardEl) {
      element = boardEl.parentElement || boardEl
    }
  }

  // If board element is available, capture it visually
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#0a0a0a',
        scale: 1.5, // Balance between quality and performance
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/png')

      // Calculate dimensions for landscape PDF
      const pdfWidth = 297 // A4 landscape width in mm
      const pdfHeight = 210 // A4 landscape height in mm
      const imgAspect = canvas.width / canvas.height

      let imgWidth = pdfWidth - 20 // margins
      let imgHeight = imgWidth / imgAspect

      // If image is too tall, scale to fit height
      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20
        imgWidth = imgHeight * imgAspect
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // Add title
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, pdfWidth, 15, 'F')
      doc.text(board.title || 'Kanban Board', 10, 10)

      // Add board image
      const xOffset = (pdfWidth - imgWidth) / 2
      doc.addImage(imgData, 'PNG', xOffset, 20, imgWidth, imgHeight)

      return doc
    } catch (error) {
      console.error('Error capturing board:', error)
      // Fall back to text-based export
    }
  }

  // Fallback: Text-based PDF export
  const doc = new jsPDF()
  let yPosition = 20

  doc.setFontSize(20)
  doc.text(board.title || 'Kanban Board', 20, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.setTextColor(128, 128, 128)
  doc.text(`Exported on ${new Date().toLocaleString()}`, 20, yPosition)
  yPosition += 15

  doc.setTextColor(0, 0, 0)

  board.columns.forEach((column) => {
    const columnCards = board.cards.filter((card) => card.columnId === column.id)

    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(column.title, 20, yPosition)
    yPosition += 8

    if (columnCards.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text('No cards in this column', 20, yPosition)
      doc.setTextColor(0, 0, 0)
      yPosition += 10
    } else {
      columnCards.forEach((card) => {
        if (yPosition > 260) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(card.title, 25, yPosition)
        yPosition += 6

        if (card.description) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          const lines = doc.splitTextToSize(card.description, 160)
          doc.text(lines, 25, yPosition)
          yPosition += lines.length * 5
        }

        const metadata: string[] = []
        if (card.priority) metadata.push(`Priority: ${card.priority}`)
        if (card.labels && card.labels.length > 0) {
          metadata.push(`Labels: ${card.labels.join(', ')}`)
        }
        if (card.assignedUserIds && card.assignedUserIds.length > 0) {
          metadata.push(`Assigned: ${card.assignedUserIds.length} user(s)`)
        }
        if (card.startDate || card.endDate) {
          const dates = []
          if (card.startDate) dates.push(`Start: ${card.startDate}`)
          if (card.endDate) dates.push(`End: ${card.endDate}`)
          metadata.push(dates.join(' → '))
        }

        if (metadata.length > 0) {
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(metadata.join(' • '), 25, yPosition)
          doc.setTextColor(0, 0, 0)
          yPosition += 5
        }

        yPosition += 5
      })
    }

    yPosition += 5
  })

  return doc
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportBoard(
  board: Board,
  format: ExportFormat,
  boardElement?: HTMLElement,
  options?: ExportOptions
): Promise<string | jsPDF> {
  switch (format) {
    case 'json':
      return exportToJSON(board, options)
    case 'csv':
      return exportToCSV(board, options)
    case 'pdf':
      return await exportToPDF(board, boardElement, options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export function downloadExport(
  content: string | jsPDF,
  format: ExportFormat,
  filename?: string
): void {
  const defaultFilename = `board-export-${new Date().getTime()}`

  // Check if content is a jsPDF object by checking for the save method
  if (format === 'pdf' && typeof content === 'object' && content !== null && 'save' in content) {
    const finalFilename = filename || `${defaultFilename}.pdf`
    ;(content as jsPDF).save(finalFilename)
    return
  }

  if (typeof content !== 'string') {
    throw new Error('Invalid content type for non-PDF export')
  }

  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    csv: 'csv',
    pdf: 'pdf',
  }

  const finalFilename = filename || `${defaultFilename}.${extensions[format]}`

  const mimeTypes: Record<ExportFormat, string> = {
    json: 'application/json',
    csv: 'text/csv',
    pdf: 'application/pdf',
  }

  const blob = new Blob([content], { type: mimeTypes[format] })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
