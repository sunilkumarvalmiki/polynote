/**
 * Input Validation and Sanitization
 * Prevents XSS, SQL injection, and other input-based attacks
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// @ts-ignore - isomorphic-dompurify doesn't have type definitions
const sanitize = DOMPurify.sanitize;

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors?: string[];
}

export class InputValidator {
  private static instance: InputValidator;

  private constructor() {}

  static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(html: string, allowedTags?: string[]): string {
    const config: any = {
      ALLOWED_TAGS: allowedTags || [
        'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
        'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    };

    return DOMPurify.sanitize(html, config) as unknown as string;
  }

  /**
   * Sanitize markdown content (remove potentially dangerous elements)
   */
  sanitizeMarkdown(markdown: string): string {
    // Remove script tags
    let sanitized = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove data: URLs (except images)
    sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
    
    return sanitized;
  }

  /**
   * Validate and sanitize note title
   */
  validateNoteTitle(title: string): ValidationResult {
    const schema = z.string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be 200 characters or less')
      .regex(/^[^<>{}]*$/, 'Title contains invalid characters');

    const result = schema.safeParse(title.trim());

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate and sanitize note content
   */
  validateNoteContent(content: string): ValidationResult {
    const schema = z.string()
      .max(1000000, 'Content must be 1MB or less');

    const result = schema.safeParse(content);

    if (result.success) {
      return {
        valid: true,
        sanitized: this.sanitizeMarkdown(result.data),
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate tag name
   */
  validateTag(tag: string): ValidationResult {
    const schema = z.string()
      .min(1, 'Tag cannot be empty')
      .max(50, 'Tag must be 50 characters or less')
      .regex(/^[a-zA-Z0-9-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores');

    const result = schema.safeParse(tag.trim().toLowerCase());

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate URL
   */
  validateUrl(url: string): ValidationResult {
    const schema = z.string().url('Invalid URL format');

    const result = schema.safeParse(url.trim());

    if (result.success) {
      // Additional checks for safe protocols
      const parsedUrl = new URL(result.data);
      const safeProtocols = ['http:', 'https:'];
      
      if (!safeProtocols.includes(parsedUrl.protocol)) {
        return {
          valid: false,
          errors: ['Only HTTP and HTTPS protocols are allowed'],
        };
      }

      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate email
   */
  validateEmail(email: string): ValidationResult {
    const schema = z.string().email('Invalid email format');

    const result = schema.safeParse(email.trim().toLowerCase());

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate API key format
   */
  validateApiKey(key: string): ValidationResult {
    const schema = z.string()
      .min(8, 'API key must be at least 8 characters')
      .max(256, 'API key must be 256 characters or less')
      .regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters');

    const result = schema.safeParse(key.trim());

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate file path (prevent path traversal)
   */
  validateFilePath(path: string): ValidationResult {
    // Prevent path traversal
    if (path.includes('..') || path.includes('~')) {
      return {
        valid: false,
        errors: ['Path contains invalid sequences'],
      };
    }

    // Prevent absolute paths
    if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
      return {
        valid: false,
        errors: ['Absolute paths are not allowed'],
      };
    }

    const schema = z.string()
      .max(500, 'Path must be 500 characters or less')
      .regex(/^[a-zA-Z0-9_\-./]+$/, 'Path contains invalid characters');

    const result = schema.safeParse(path.trim());

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Validate JSON input
   */
  validateJson<T>(json: string, schema: z.ZodType<T>): {
    valid: boolean;
    data?: T;
    errors?: string[];
  } {
    try {
      const parsed = JSON.parse(json);
      const result = schema.safeParse(parsed);

      if (result.success) {
        return {
          valid: true,
          data: result.data,
        };
      }

      return {
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid JSON format'],
      };
    }
  }

  /**
   * Escape SQL special characters (for display purposes only - always use prepared statements)
   */
  escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Redact sensitive data from error messages and logs
   * Replaces passwords, tokens, keys, and other sensitive patterns
   */
  redactSensitiveData(data: string | Record<string, unknown>): string {
    let text = typeof data === 'string' ? data : JSON.stringify(data);

    // Redact common sensitive patterns
    const patterns = [
      // Passwords
      { pattern: /password["\s:=]+["']?([^"'\s,}]+)/gi, replacement: 'password="[REDACTED]"' },
      { pattern: /"password":\s*"[^"]+"/gi, replacement: '"password":"[REDACTED]"' },
      
      // API keys and tokens
      { pattern: /api[_-]?key["\s:=]+["']?([^"'\s,}]+)/gi, replacement: 'api_key="[REDACTED]"' },
      { pattern: /token["\s:=]+["']?([^"'\s,}]+)/gi, replacement: 'token="[REDACTED]"' },
      { pattern: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
      
      // Secret keys
      { pattern: /secret["\s:=]+["']?([^"'\s,}]+)/gi, replacement: 'secret="[REDACTED]"' },
      { pattern: /private[_-]?key["\s:=]+["']?([^"'\s,}]+)/gi, replacement: 'private_key="[REDACTED]"' },
      
      // Credit cards (basic pattern)
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CREDIT_CARD_REDACTED]' },
      
      // Email addresses (partial redaction)
      { pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        replacement: (_match: string, user: string, domain: string) => {
          const redactedUser = user.slice(0, 2) + '***';
          return `${redactedUser}@${domain}`;
        }
      },
      
      // URLs with credentials
      { pattern: /\/\/[^:@\s]+:[^:@\s]+@/g, replacement: '//[CREDENTIALS_REDACTED]@' },
    ];

    patterns.forEach(({ pattern, replacement }) => {
      if (typeof replacement === 'function') {
        text = text.replace(pattern as RegExp, replacement as any);
      } else {
        text = text.replace(pattern, replacement);
      }
    });

    return text;
  }

  /**
   * Validate IPC channel name
   */
  validateIpcChannel(channel: string): ValidationResult {
    const schema = z.string()
      .regex(/^[a-z0-9:-]+$/, 'Invalid IPC channel name');

    const result = schema.safeParse(channel);

    if (result.success) {
      return {
        valid: true,
        sanitized: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => e.message),
    };
  }

  /**
   * Sanitize object for safe logging (remove sensitive fields)
   */
  sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      'password',
      'apiKey',
      'api_key',
      'token',
      'secret',
      'credential',
      'masterPassword',
      'passphrase',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeForLogging(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Export singleton
export const inputValidator = InputValidator.getInstance();