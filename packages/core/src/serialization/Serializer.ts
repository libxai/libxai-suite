/**
 * Serializer - Unified serialization interface
 * @module serialization/Serializer
 *
 * Provides a consistent API for serializing and deserializing board data
 * across multiple formats (JSON, Binary, MessagePack, etc.)
 */

import type { BoardData, ColumnData, CardData } from '../types'

/**
 * Serialized data structure
 */
export interface SerializedData {
  version: string
  timestamp: number
  board: BoardData | null
  columns: ColumnData[]
  cards: CardData[]
  metadata?: Record<string, unknown>
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /**
   * Include metadata in serialization
   * @default true
   */
  includeMetadata?: boolean

  /**
   * Compress data (for binary formats)
   * @default false
   */
  compress?: boolean

  /**
   * Pretty-print JSON
   * @default false
   */
  prettyPrint?: boolean

  /**
   * Include timestamps
   * @default true
   */
  includeTimestamp?: boolean
}

/**
 * Serializer interface
 *
 * All serializers must implement this interface
 */
export interface Serializer<TOutput = string | Uint8Array> {
  /**
   * Serialize data
   *
   * @param data - Data to serialize
   * @param options - Serialization options
   * @returns Serialized output
   */
  serialize(data: SerializedData, options?: SerializationOptions): Promise<TOutput>

  /**
   * Deserialize data
   *
   * @param input - Serialized input
   * @param options - Deserialization options
   * @returns Deserialized data
   */
  deserialize(input: TOutput, options?: SerializationOptions): Promise<SerializedData>

  /**
   * Get MIME type for this format
   */
  getMimeType(): string

  /**
   * Get file extension for this format
   */
  getFileExtension(): string
}

/**
 * Base serializer with common functionality
 */
export abstract class BaseSerializer<TOutput = string | Uint8Array>
  implements Serializer<TOutput>
{
  protected version = '0.7.0'

  abstract serialize(
    data: SerializedData,
    options?: SerializationOptions
  ): Promise<TOutput>

  abstract deserialize(
    input: TOutput,
    options?: SerializationOptions
  ): Promise<SerializedData>

  abstract getMimeType(): string
  abstract getFileExtension(): string

  /**
   * Create serialized data structure
   */
  protected createSerializedData(
    board: BoardData | null,
    columns: ColumnData[],
    cards: CardData[],
    options: SerializationOptions = {}
  ): SerializedData {
    const data: SerializedData = {
      version: this.version,
      timestamp: options.includeTimestamp !== false ? Date.now() : 0,
      board,
      columns,
      cards,
    }

    if (options.includeMetadata !== false) {
      data.metadata = {
        serializer: this.constructor.name,
        nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      }
    }

    return data
  }

  /**
   * Validate serialized data structure
   */
  protected validateSerializedData(data: any): asserts data is SerializedData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid serialized data: not an object')
    }

    if (!data.version || typeof data.version !== 'string') {
      throw new Error('Invalid serialized data: missing or invalid version')
    }

    if (!Array.isArray(data.columns)) {
      throw new Error('Invalid serialized data: columns must be an array')
    }

    if (!Array.isArray(data.cards)) {
      throw new Error('Invalid serialized data: cards must be an array')
    }

    // board can be null
    if (data.board !== null && typeof data.board !== 'object') {
      throw new Error('Invalid serialized data: board must be an object or null')
    }
  }
}
