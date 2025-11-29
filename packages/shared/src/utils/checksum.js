import { createHash } from 'node:crypto';
/**
 * Generate SHA-256 checksum for content
 */
export function generateChecksum(content) {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
}
/**
 * Verify content matches checksum
 */
export function verifyChecksum(content, checksum) {
    return generateChecksum(content) === checksum;
}
/**
 * Generate checksum for file
 */
export function generateFileChecksum(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}
