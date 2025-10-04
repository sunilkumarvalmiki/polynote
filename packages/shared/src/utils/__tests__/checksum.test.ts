import { describe, it, expect } from 'vitest';

import { generateChecksum, verifyChecksum, generateFileChecksum } from '../checksum';

describe('Checksum Utility', () => {
  describe('generateChecksum', () => {
    it('should generate consistent checksums for same content', () => {
      const content = 'Hello, World!';
      const checksum1 = generateChecksum(content);
      const checksum2 = generateChecksum(content);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different content', () => {
      const content1 = 'Hello, World!';
      const content2 = 'Goodbye, World!';

      const checksum1 = generateChecksum(content1);
      const checksum2 = generateChecksum(content2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle empty strings', () => {
      const checksum = generateChecksum('');
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(100000);
      const checksum = generateChecksum(longContent);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا بالعالم';
      const checksum = generateChecksum(unicode);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
    });

    it('should be case-sensitive', () => {
      const lower = 'hello';
      const upper = 'HELLO';

      const checksum1 = generateChecksum(lower);
      const checksum2 = generateChecksum(upper);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should detect whitespace differences', () => {
      const content1 = 'hello world';
      const content2 = 'hello  world';

      const checksum1 = generateChecksum(content1);
      const checksum2 = generateChecksum(content2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle newlines and special characters', () => {
      const content = 'Line 1\nLine 2\r\nLine 3\tTabbed';
      const checksum = generateChecksum(content);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
    });
  });

  describe('verifyChecksum', () => {
    it('should return true for matching content and checksum', () => {
      const content = 'Test content';
      const checksum = generateChecksum(content);

      expect(verifyChecksum(content, checksum)).toBe(true);
    });

    it('should return false for non-matching content and checksum', () => {
      const content = 'Test content';
      const wrongContent = 'Wrong content';
      const checksum = generateChecksum(content);

      expect(verifyChecksum(wrongContent, checksum)).toBe(false);
    });

    it('should be case-sensitive in verification', () => {
      const content = 'Test';
      const checksum = generateChecksum(content);

      expect(verifyChecksum('test', checksum)).toBe(false);
    });

    it('should handle empty strings in verification', () => {
      const checksum = generateChecksum('');

      expect(verifyChecksum('', checksum)).toBe(true);
      expect(verifyChecksum('non-empty', checksum)).toBe(false);
    });
  });

  describe('generateFileChecksum', () => {
    it('should generate checksum for buffer', () => {
      const buffer = Buffer.from('Test file content', 'utf-8');
      const checksum = generateFileChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate consistent checksums for same buffer', () => {
      const buffer = Buffer.from('Test file content', 'utf-8');
      const checksum1 = generateFileChecksum(buffer);
      const checksum2 = generateFileChecksum(buffer);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different buffers', () => {
      const buffer1 = Buffer.from('Content 1', 'utf-8');
      const buffer2 = Buffer.from('Content 2', 'utf-8');

      const checksum1 = generateFileChecksum(buffer1);
      const checksum2 = generateFileChecksum(buffer2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle empty buffers', () => {
      const buffer = Buffer.from('', 'utf-8');
      const checksum = generateFileChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
    });

    it('should handle large buffers', () => {
      const buffer = Buffer.alloc(1000000, 'a'); // 1MB buffer
      const checksum = generateFileChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(64);
    });

    it('should handle binary data', () => {
      const buffer = Buffer.from([0x00, 0xff, 0xab, 0xcd, 0xef]);
      const checksum = generateFileChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
    });
  });
});
