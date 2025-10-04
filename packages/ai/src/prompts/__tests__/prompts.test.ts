/**
 * Unit tests for prompt templates and secret redaction
 */

import { describe, it, expect } from 'vitest';
import {
  redactSecrets,
  getSummarizePrompt,
  getTranslatePrompt,
  getRewritePrompt,
  getChatPrompt,
  getPromptForOperation,
} from '../index';
import { OperationType, Language, RewriteStyle } from '../../types';

describe('Secret Redaction', () => {
  it('should redact API keys', () => {
    const text = 'My API key is sk_test_1234567890abcdefghijklmnopqrstuvwxyz';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('sk_test_');
  });

  it('should redact AWS keys', () => {
    const text = 'AWS key: AKIAIOSFODNN7EXAMPLE';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('AKIA');
  });

  it('should redact GitHub tokens', () => {
    const text = 'Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('ghp_');
  });

  it('should redact Bearer tokens', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should redact private keys', () => {
    const text = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890
-----END RSA PRIVATE KEY-----`;
    const redacted = redactSecrets(text);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should redact JWT tokens', () => {
    const text = 'JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123');
  });

  it('should redact passwords', () => {
    const text = 'password: mysecretpassword123';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('mysecretpassword');
  });

  it('should redact email addresses', () => {
    const text = 'Contact me at user@example.com';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('user@example.com');
  });

  it('should redact private IP addresses', () => {
    const text = 'Server at 192.168.1.1 and 10.0.0.1';
    const redacted = redactSecrets(text);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('192.168.1.1');
    expect(redacted).not.toContain('10.0.0.1');
  });

  it('should preserve normal text', () => {
    const text = 'This is a normal sentence with no secrets.';
    const redacted = redactSecrets(text);
    expect(redacted).toBe(text);
  });
});

describe('Summarize Prompt', () => {
  it('should generate valid summarize prompt', () => {
    const content = 'This is a long document that needs to be summarized.';
    const prompt = getSummarizePrompt(content);

    expect(prompt).toContain('summarize');
    expect(prompt).toContain(content);
    expect(prompt).toContain('Summary:');
  });

  it('should redact secrets in summarize prompt', () => {
    const content = 'API key: sk_test_1234567890abcdefghijk123456789 needs summarizing';
    const prompt = getSummarizePrompt(content);

    expect(prompt).toContain('[REDACTED]');
    expect(prompt).not.toContain('sk_test_1234567890abcdefghijk123456789');
  });
});

describe('Translate Prompt', () => {
  it('should generate valid English to Telugu translation prompt', () => {
    const content = 'Hello, how are you?';
    const prompt = getTranslatePrompt(content, Language.ENGLISH, Language.TELUGU);

    expect(prompt).toContain('translate');
    expect(prompt).toContain('English');
    expect(prompt).toContain('Telugu');
    expect(prompt).toContain(content);
  });

  it('should generate valid Telugu to Hindi translation prompt', () => {
    const content = 'నమస్కారం';
    const prompt = getTranslatePrompt(content, Language.TELUGU, Language.HINDI);

    expect(prompt).toContain('translate');
    expect(prompt).toContain('Telugu');
    expect(prompt).toContain('Hindi');
    expect(prompt).toContain(content);
  });

  it('should redact secrets in translation prompt', () => {
    const content = 'My password: secret1234567890123456789012345';
    const prompt = getTranslatePrompt(content, Language.ENGLISH, Language.HINDI);

    expect(prompt).toContain('[REDACTED]');
    expect(prompt).not.toContain('secret1234567890123456789012345');
  });
});

describe('Rewrite Prompt', () => {
  it('should generate formal rewrite prompt', () => {
    const content = 'Hey, wanna grab some coffee?';
    const prompt = getRewritePrompt(content, RewriteStyle.FORMAL);

    expect(prompt).toContain('formal');
    expect(prompt).toContain('professional');
    expect(prompt).toContain(content);
  });

  it('should generate casual rewrite prompt', () => {
    const content = 'Dear Sir/Madam, I am writing to inquire...';
    const prompt = getRewritePrompt(content, RewriteStyle.CASUAL);

    expect(prompt).toContain('casual');
    expect(prompt).toContain('conversational');
    expect(prompt).toContain(content);
  });

  it('should generate concise rewrite prompt', () => {
    const content = 'This is a very long and wordy sentence with lots of unnecessary details.';
    const prompt = getRewritePrompt(content, RewriteStyle.CONCISE);

    expect(prompt).toContain('concise');
    expect(prompt).toContain(content);
  });

  it('should generate detailed rewrite prompt', () => {
    const content = 'Brief note.';
    const prompt = getRewritePrompt(content, RewriteStyle.DETAILED);

    expect(prompt).toContain('Expand');
    expect(prompt).toContain('elaborate');
    expect(prompt).toContain(content);
  });

  it('should generate technical rewrite prompt', () => {
    const content = 'The program does some stuff with data.';
    const prompt = getRewritePrompt(content, RewriteStyle.TECHNICAL);

    expect(prompt).toContain('technical');
    expect(prompt).toContain(content);
  });

  it('should generate simple rewrite prompt', () => {
    const content = 'Utilize sophisticated methodologies to facilitate optimal outcomes.';
    const prompt = getRewritePrompt(content, RewriteStyle.SIMPLE);

    expect(prompt).toContain('Simplify');
    expect(prompt).toContain(content);
  });

  it('should redact secrets in rewrite prompt', () => {
    const content = 'Bearer token123 in the system';
    const prompt = getRewritePrompt(content, RewriteStyle.FORMAL);

    expect(prompt).toContain('[REDACTED]');
  });
});

describe('Chat Prompt', () => {
  it('should generate chat prompt with custom instructions', () => {
    const content = 'Some content to analyze';
    const instructions = 'Analyze this for sentiment';
    const prompt = getChatPrompt(content, instructions);

    expect(prompt).toContain(instructions);
    expect(prompt).toContain(content);
  });

  it('should generate chat prompt without custom instructions', () => {
    const content = 'Some content';
    const prompt = getChatPrompt(content);

    expect(prompt).toContain('Analyze');
    expect(prompt).toContain(content);
  });

  it('should redact secrets in chat prompt', () => {
    const content = 'Email: secret@example.com';
    const prompt = getChatPrompt(content);

    expect(prompt).toContain('[REDACTED]');
  });
});

describe('Get Prompt For Operation', () => {
  it('should get summarize prompt', () => {
    const prompt = getPromptForOperation(OperationType.SUMMARIZE, 'test content');
    expect(prompt).toContain('summarize');
  });

  it('should get translate prompt', () => {
    const prompt = getPromptForOperation(OperationType.TRANSLATE, 'test content', {
      sourceLanguage: Language.ENGLISH,
      targetLanguage: Language.HINDI,
    });
    expect(prompt).toContain('translate');
    expect(prompt).toContain('Hindi');
  });

  it('should throw error for translate without languages', () => {
    expect(() => {
      getPromptForOperation(OperationType.TRANSLATE, 'test content');
    }).toThrow('requires sourceLanguage and targetLanguage');
  });

  it('should get rewrite prompt', () => {
    const prompt = getPromptForOperation(OperationType.REWRITE, 'test content', {
      style: RewriteStyle.FORMAL,
    });
    expect(prompt).toContain('formal');
  });

  it('should throw error for rewrite without style', () => {
    expect(() => {
      getPromptForOperation(OperationType.REWRITE, 'test content');
    }).toThrow('requires style parameter');
  });

  it('should get chat prompt', () => {
    const prompt = getPromptForOperation(OperationType.CHAT, 'test content', {
      customInstructions: 'Do something',
    });
    expect(prompt).toContain('Do something');
  });

  it('should throw error for unknown operation', () => {
    expect(() => {
      getPromptForOperation('UNKNOWN' as OperationType, 'test content');
    }).toThrow('Unknown operation type');
  });
});
