import { Buffer } from 'node:buffer';

import { CryptographyKey } from 'sodium-plus';

/**
 * Normalize sodium-plus outputs to Node.js Buffers.
 */
export function ensureBuffer(
  value: Buffer | Uint8Array | ArrayBuffer | ArrayBufferView | CryptographyKey
): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof CryptographyKey) {
    return ensureBuffer(value.getBuffer());
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  return Buffer.from(value as unknown as Uint8Array);
}
