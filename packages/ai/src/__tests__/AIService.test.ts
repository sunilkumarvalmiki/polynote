/**
 * Unit tests for AIService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AIService } from '../AIService';
import { ProviderRegistry } from '../ProviderRegistry';
import { ProviderType, Language, RewriteStyle } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

describe('AIService', () => {
  let registry: ProviderRegistry;
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ProviderRegistry({
      tokenBudget: {
        daily: 10000,
        perRequest: 2048,
      },
    });
    service = new AIService(registry);
  });

  describe('Token Budget', () => {
    it('should get initial token budget', () => {
      const budget = service.getTokenBudget();
      expect(budget.dailyLimit).toBe(10000);
      expect(budget.usedToday).toBe(0);
      expect(budget.remaining).toBe(10000);
      expect(budget.resetsAt).toBeInstanceOf(Date);
    });

    it('should check if request is within budget', () => {
      expect(service.isWithinBudget(1000)).toBe(true);
      expect(service.isWithinBudget(15000)).toBe(false); // exceeds daily limit
      expect(service.isWithinBudget(3000)).toBe(false); // exceeds per-request limit
    });

    it('should estimate tokens for content', async () => {
      const content = 'This is a test sentence.';
      const tokens = await service.estimateTokens(content);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should reset token usage', () => {
      service.resetTokenUsage();
      const budget = service.getTokenBudget();
      expect(budget.usedToday).toBe(0);
    });

    it('should get token usage history', () => {
      const history = service.getTokenUsageHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Summarize Operation', () => {
    beforeEach(async () => {
      // Mock Ollama provider
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'llama2:7b' }] }),
          });
        }
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'This is a summary.',
                prompt_eval_count: 100,
                eval_count: 50,
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-test',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });
    });

    it('should summarize content', async () => {
      const response = await service.summarize('This is a long document.');

      expect(response.content).toContain('summary');
      expect(response.provider).toBe('ollama-test');
      expect(response.streamed).toBe(false);
    });

    it('should summarize with custom instructions', async () => {
      const response = await service.summarize('Content here', {
        customInstructions: 'Make it very short',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should summarize with specific provider', async () => {
      const response = await service.summarize('Content', {
        provider: 'ollama-test',
      });

      expect(response.provider).toBe('ollama-test');
    });
  });

  describe('Translate Operation', () => {
    beforeEach(async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'llama2:7b' }] }),
          });
        }
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'Translated text',
                prompt_eval_count: 100,
                eval_count: 50,
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-test',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });
    });

    it('should translate English to Telugu', async () => {
      const response = await service.translate('Hello world', {
        targetLanguage: Language.TELUGU,
      });

      expect(response.content).toBeDefined();
      expect(response.provider).toBe('ollama-test');
    });

    it('should translate with source language specified', async () => {
      const response = await service.translate('Hello', {
        sourceLanguage: Language.ENGLISH,
        targetLanguage: Language.HINDI,
      });

      expect(response.content).toBeDefined();
    });

    it('should translate with specific provider', async () => {
      const response = await service.translate('Hello', {
        targetLanguage: Language.HINDI,
        provider: 'ollama-test',
      });

      expect(response.provider).toBe('ollama-test');
    });
  });

  describe('Rewrite Operation', () => {
    beforeEach(async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'llama2:7b' }] }),
          });
        }
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'Rewritten text',
                prompt_eval_count: 100,
                eval_count: 50,
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-test',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });
    });

    it('should rewrite in formal style', async () => {
      const response = await service.rewrite('Hey, what\'s up?', {
        style: RewriteStyle.FORMAL,
      });

      expect(response.content).toBeDefined();
    });

    it('should rewrite in casual style', async () => {
      const response = await service.rewrite('Dear Sir/Madam', {
        style: RewriteStyle.CASUAL,
      });

      expect(response.content).toBeDefined();
    });

    it('should rewrite with custom instructions', async () => {
      const response = await service.rewrite('Some text', {
        style: RewriteStyle.CONCISE,
        customInstructions: 'Keep it under 10 words',
      });

      expect(response.content).toBeDefined();
    });

    it('should rewrite with specific provider', async () => {
      const response = await service.rewrite('Text', {
        style: RewriteStyle.SIMPLE,
        provider: 'ollama-test',
      });

      expect(response.provider).toBe('ollama-test');
    });
  });

  describe('Chat Operation', () => {
    beforeEach(async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'llama2:7b' }] }),
          });
        }
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'Chat response',
                prompt_eval_count: 100,
                eval_count: 50,
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-test',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });
    });

    it('should perform chat operation', async () => {
      const response = await service.chat(
        'Some content',
        'Analyze this content'
      );

      expect(response.content).toBeDefined();
    });

    it('should perform chat with specific provider', async () => {
      const response = await service.chat('Content', 'Do something', {
        provider: 'ollama-test',
      });

      expect(response.provider).toBe('ollama-test');
    });
  });

  describe('Provider Health', () => {
    it('should get providers health status', async () => {
      const health = await service.getProvidersHealth();
      expect(Array.isArray(health)).toBe(true);
    });
  });
});
