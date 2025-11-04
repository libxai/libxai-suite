/**
 * SerializerRegistry - Central registry for all serializers
 * @module serialization/SerializerRegistry
 */

import type { Serializer, SerializedData, SerializationOptions } from './Serializer'
import { JSONSerializer } from './JSONSerializer'
import { BinarySerializer } from './BinarySerializer'

/**
 * Serializer format types
 */
export type SerializerFormat = 'json' | 'binary' | 'msgpack'

/**
 * Serializer Registry
 *
 * Manages all available serializers and provides a unified API.
 *
 * @example
 * ```typescript
 * const registry = new SerializerRegistry()
 *
 * // Serialize to JSON
 * const json = await registry.serialize('json', data)
 *
 * // Deserialize from binary
 * const data = await registry.deserialize('binary', binaryData)
 *
 * // Get supported formats
 * const formats = registry.getSupportedFormats() // ['json', 'binary']
 * ```
 */
export class SerializerRegistry {
  private serializers = new Map<SerializerFormat, Serializer<any>>()

  constructor() {
    // Register default serializers
    this.register('json', new JSONSerializer())
    this.register('binary', new BinarySerializer())
  }

  /**
   * Register a serializer
   *
   * @param format - Format identifier
   * @param serializer - Serializer instance
   */
  register<T>(format: SerializerFormat, serializer: Serializer<T>): void {
    this.serializers.set(format, serializer)
  }

  /**
   * Unregister a serializer
   *
   * @param format - Format identifier
   */
  unregister(format: SerializerFormat): void {
    this.serializers.delete(format)
  }

  /**
   * Get a serializer by format
   *
   * @param format - Format identifier
   * @returns Serializer instance
   * @throws Error if format not found
   */
  getSerializer<T = string | Uint8Array>(format: SerializerFormat): Serializer<T> {
    const serializer = this.serializers.get(format)
    if (!serializer) {
      throw new Error(`Serializer for format '${format}' not found`)
    }
    return serializer as Serializer<T>
  }

  /**
   * Check if a format is supported
   *
   * @param format - Format to check
   */
  isSupported(format: SerializerFormat): boolean {
    return this.serializers.has(format)
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): SerializerFormat[] {
    return Array.from(this.serializers.keys())
  }

  /**
   * Serialize data using specified format
   *
   * @param format - Serialization format
   * @param data - Data to serialize
   * @param options - Serialization options
   * @returns Serialized output
   */
  async serialize<T = string | Uint8Array>(
    format: SerializerFormat,
    data: SerializedData,
    options?: SerializationOptions
  ): Promise<T> {
    const serializer = this.getSerializer<T>(format)
    return serializer.serialize(data, options)
  }

  /**
   * Deserialize data using specified format
   *
   * @param format - Serialization format
   * @param input - Serialized input
   * @param options - Deserialization options
   * @returns Deserialized data
   */
  async deserialize<T = string | Uint8Array>(
    format: SerializerFormat,
    input: T,
    options?: SerializationOptions
  ): Promise<SerializedData> {
    const serializer = this.getSerializer<T>(format)
    return serializer.deserialize(input, options)
  }

  /**
   * Get MIME type for a format
   *
   * @param format - Format identifier
   * @returns MIME type string
   */
  getMimeType(format: SerializerFormat): string {
    return this.getSerializer(format).getMimeType()
  }

  /**
   * Get file extension for a format
   *
   * @param format - Format identifier
   * @returns File extension (e.g., '.json')
   */
  getFileExtension(format: SerializerFormat): string {
    return this.getSerializer(format).getFileExtension()
  }
}

/**
 * Global serializer registry instance
 */
export const serializerRegistry = new SerializerRegistry()
