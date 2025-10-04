import { createHash } from 'node:crypto';

/**
 * Generate SHA-256 checksum for content
 */
export function generateChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Verify content matches checksum
 */
export function verifyChecksum(content: string, checksum: string): boolean {
  return generateChecksum(content) === checksum;
}

/**
 * Generate checksum for file
 */
export function generateFileChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}