/**
 * Serialization module - Unified serialization layer
 * @module serialization
 */

export {
  BaseSerializer,
  type Serializer,
  type SerializedData,
  type SerializationOptions,
} from './Serializer'

export { JSONSerializer, createJSONSerializer } from './JSONSerializer'
export { BinarySerializer, createBinarySerializer } from './BinarySerializer'

export {
  SerializerRegistry,
  serializerRegistry,
  type SerializerFormat,
} from './SerializerRegistry'
