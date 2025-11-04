/**
 * JSONSerializer - JSON serialization implementation
 * @module serialization/JSONSerializer
 */

import { BaseSerializer, type SerializedData, type SerializationOptions } from './Serializer'

/**
 * JSON Serializer
 *
 * Serializes board data to/from JSON format.
 * This is the most common and human-readable format.
 *
 * @example
 * ```typescript
 * const serializer = new JSONSerializer()
 *
 * const json = await serializer.serialize({
 *   version: '0.7.0',
 *   timestamp: Date.now(),
 *   board: { id: 'b1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * const data = await serializer.deserialize(json)
 * ```
 */
export class JSONSerializer extends BaseSerializer<string> {
  /**
   * Serialize data to JSON string
   */
  async serialize(
    data: SerializedData,
    options: SerializationOptions = {}
  ): Promise<string> {
    try {
      const indent = options.prettyPrint ? 2 : undefined
      return JSON.stringify(data, this.replacer, indent)
    } catch (error) {
      throw new Error(
        `JSON serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Deserialize JSON string to data
   */
  async deserialize(
    input: string,
    _options?: SerializationOptions
  ): Promise<SerializedData> {
    try {
      const data = JSON.parse(input, this.reviver)
      this.validateSerializedData(data)
      return data
    } catch (error) {
      throw new Error(
        `JSON deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return 'application/json'
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return '.json'
  }

  /**
   * JSON replacer for special types
   */
  private replacer(_key: string, value: any): any {
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }

    // Convert Map to array of entries
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) }
    }

    // Convert Set to array
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) }
    }

    return value
  }

  /**
   * JSON reviver for special types
   */
  private reviver(_key: string, value: any): any {
    // Restore Date objects
    if (value && value.__type === 'Date') {
      return new Date(value.value)
    }

    // Restore Map objects
    if (value && value.__type === 'Map') {
      return new Map(value.value)
    }

    // Restore Set objects
    if (value && value.__type === 'Set') {
      return new Set(value.value)
    }

    return value
  }
}

/**
 * Create a JSON serializer instance
 */
export function createJSONSerializer(): JSONSerializer {
  return new JSONSerializer()
}
