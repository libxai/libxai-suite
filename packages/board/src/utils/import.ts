/**
 * Import utility functions
 * @module utils/import
 */

import type { Board, Card, Column, ImportResult } from '../types'

/**
 * Import board from JSON format
 */
export function importFromJSON(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString)

    if (!data.board || !data.columns || !data.cards) {
      return {
        success: false,
        errors: ['Invalid JSON format: missing required fields (board, columns, cards)'],
      }
    }

    const board: Board = {
      id: data.board.id,
      title: data.board.title,
      columns: data.columns,
      cards: data.cards,
      metadata: data.board.metadata,
    }

    return {
      success: true,
      cardsImported: board.cards.length,
      columnsImported: board.columns.length,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

/**
 * Import board from CSV format
 */
export function importFromCSV(csvString: string): ImportResult {
  try {
    const lines = csvString.trim().split('\n')

    if (lines.length < 1 || !lines[0]) {
      return {
        success: false,
        errors: ['CSV file is empty or invalid'],
      }
    }

    const headers = parseCSVLine(lines[0])
    const cards: Card[] = []
    const columnsMap = new Map<string, Column>()
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i] || '')

        if (values.length > headers.length) {
          errors.push(`Line ${i + 1}: Too many columns`)
          continue
        }

        // If missing more than 3 columns, likely a malformed row
        const missingColumns = headers.length - values.length
        if (missingColumns > 3) {
          errors.push(`Line ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`)
          continue
        }

        // Pad trailing empty columns
        while (values.length < headers.length) {
          values.push('')
        }

        const cardData: Record<string, string> = {}
        headers.forEach((header, index) => {
          cardData[header] = values[index] || ''
        })

        // Create column if it doesn't exist
        const columnTitle = cardData['Column'] || 'Unnamed'
        if (!columnsMap.has(columnTitle)) {
          columnsMap.set(columnTitle, {
            id: `col-${columnsMap.size + 1}`,
            title: columnTitle,
            position: columnsMap.size + 1,
            cardIds: [],
          })
        }

        const column = columnsMap.get(columnTitle)!

        const card: Card = {
          id: cardData['Card ID'] || `card-${i}`,
          title: cardData['Title'] || 'Untitled',
          description: cardData['Description'] ? cardData['Description'] : undefined,
          columnId: column.id,
          position: column.cardIds.length + 1,
          priority: (cardData['Priority'] as any) || undefined,
          labels: cardData['Labels'] ? cardData['Labels'].split(';').filter(Boolean) : undefined,
          assignedUserIds: cardData['Assigned Users']
            ? cardData['Assigned Users'].split(';').filter(Boolean)
            : undefined,
          startDate: cardData['Start Date'] ? (cardData['Start Date'] as any) : undefined,
          endDate: cardData['End Date'] ? (cardData['End Date'] as any) : undefined,
          createdAt: cardData['Created At'] ? (cardData['Created At'] as any) : undefined,
          updatedAt: cardData['Updated At'] ? (cardData['Updated At'] as any) : undefined,
        }

        cards.push(card)
        column.cardIds.push(card.id)
      } catch (error) {
        errors.push(
          `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    if (cards.length === 0) {
      return {
        success: false,
        errors: ['No valid cards found in CSV', ...errors],
      }
    }

    return {
      success: true,
      cardsImported: cards.length,
      columnsImported: columnsMap.size,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

/**
 * Parse a CSV line with proper quote handling
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      i++ // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Main import function
 */
export function importBoard(content: string, format: 'json' | 'csv'): ImportResult {
  switch (format) {
    case 'json':
      return importFromJSON(content)
    case 'csv':
      return importFromCSV(content)
    default:
      return {
        success: false,
        errors: [`Unsupported import format: ${format}`],
      }
  }
}

/**
 * Read file content
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
