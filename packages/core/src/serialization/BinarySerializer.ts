/**
 * BinarySerializer - Binary serialization implementation
 * @module serialization/BinarySerializer
 *
 * Uses JSON as intermediate format, then converts to Uint8Array.
 * Future enhancement: Use Protocol Buffers or custom binary format.
 */

import { BaseSerializer, type SerializedData, type SerializationOptions } from './Serializer'

/**
 * Binary Serializer
 *
 * Serializes board data to/from binary format (Uint8Array).
 * Currently uses JSON as intermediate format with UTF-8 encoding.
 *
 * @example
 * ```typescript
 * const serializer = new BinarySerializer()
 *
 * const binary = await serializer.serialize({
 *   version: '0.7.0',
 *   timestamp: Date.now(),
 *   board: { id: 'b1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * const data = await serializer.deserialize(binary)
 * ```
 */
export class BinarySerializer extends BaseSerializer<Uint8Array> {
  private textEncoder = new TextEncoder()
  private textDecoder = new TextDecoder()

  /**
   * Serialize data to binary format
   */
  async serialize(
    data: SerializedData,
    _options: SerializationOptions = {}
  ): Promise<Uint8Array> {
    try {
      // Convert to JSON first
      const json = JSON.stringify(data)

      // Encode to UTF-8 bytes
      const bytes = this.textEncoder.encode(json)

      // TODO: Add compression support (gzip/deflate)
      return bytes
    } catch (error) {
      throw new Error(
        `Binary serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Deserialize binary format to data
   */
  async deserialize(
    input: Uint8Array,
    _options?: SerializationOptions
  ): Promise<SerializedData> {
    try {
      // TODO: Add decompression support

      // Decode UTF-8 bytes to string
      const json = this.textDecoder.decode(input)

      // Parse JSON
      const data = JSON.parse(json)

      this.validateSerializedData(data)
      return data
    } catch (error) {
      throw new Error(
        `Binary deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return 'application/octet-stream'
  }

  /**
   * Get file extension
   */
  getFileExtension(): string {
    return '.bin'
  }
}

/**
 * Create a binary serializer instance
 */
export function createBinarySerializer(): BinarySerializer {
  return new BinarySerializer()
}
