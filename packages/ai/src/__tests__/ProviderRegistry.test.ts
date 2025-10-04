/**
 * Unit tests for ProviderRegistry
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProviderRegistry } from '../ProviderRegistry';
import {
  ProviderType,
  ProviderLocation,
  OperationType,
  Language,
} from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    vi.clearAllMocks();

    // Default mock for Ollama
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ models: [{ name: 'llama2:7b' }] }),
        });
      }
      if (url.includes('/models')) {
        // OpenAI models endpoint
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create registry with default policy', () => {
      const policy = registry.getPolicy();
      expect(policy.preferLocal).toBe(true);
      expect(policy.cloudFallback).toBe(true);
      expect(policy.maxRetries).toBe(3);
      expect(policy.timeoutMs).toBe(30000);
    });

    it('should create registry with custom policy', () => {
      const customRegistry = new ProviderRegistry({
        preferLocal: false,
        cloudFallback: false,
        maxRetries: 5,
      });

      const policy = customRegistry.getPolicy();
      expect(policy.preferLocal).toBe(false);
      expect(policy.cloudFallback).toBe(false);
      expect(policy.maxRetries).toBe(5);
    });
  });

  describe('Provider Registration', () => {
    it('should register Ollama provider', async () => {
      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-local',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });

      const provider = registry.getProvider('ollama-local');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(ProviderType.OLLAMA);
      expect(provider?.location).toBe(ProviderLocation.LOCAL);
    });

    it('should register OpenAI provider', async () => {
      await registry.registerProvider({
        type: ProviderType.OPENAI,
        name: 'openai-cloud',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      });

      const provider = registry.getProvider('openai-cloud');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(ProviderType.OPENAI);
      expect(provider?.location).toBe(ProviderLocation.CLOUD);
    });

    it('should register Claude provider', async () => {
      await registry.registerProvider({
        type: ProviderType.CLAUDE,
        name: 'claude-cloud',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-3-sonnet',
      });

      const provider = registry.getProvider('claude-cloud');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe(ProviderType.CLAUDE);
    });

    it('should throw error for unsupported provider type', async () => {
      await expect(
        registry.registerProvider({
          type: 'UNSUPPORTED' as ProviderType,
          name: 'test',
          baseUrl: 'http://localhost',
          model: 'test',
        })
      ).rejects.toThrow('Unsupported provider type');
    });
  });

  describe('Provider Retrieval', () => {
    beforeEach(async () => {
      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'ollama-1',
        baseUrl: 'http://localhost:11434',
        model: 'llama2:7b',
      });

      await registry.registerProvider({
        type: ProviderType.OPENAI,
        name: 'openai-1',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4',
      });
    });

    it('should get provider by name', () => {
      const provider = registry.getProvider('ollama-1');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('ollama-1');
    });

    it('should return undefined for non-existent provider', () => {
      const provider = registry.getProvider('non-existent');
      expect(provider).toBeUndefined();
    });

    it('should get all providers', () => {
      const providers = registry.getAllProviders();
      expect(providers).toHaveLength(2);
    });

    it('should get local providers only', () => {
      const localProviders = registry.getLocalProviders();
      expect(localProviders).toHaveLength(1);
      expect(localProviders[0].location).toBe(ProviderLocation.LOCAL);
    });

    it('should get cloud providers only', () => {
      const cloudProviders = registry.getCloudProviders();
      expect(cloudProviders).toHaveLength(1);
      expect(cloudProviders[0].location).toBe(ProviderLocation.CLOUD);
    });
  });

  describe('Policy Management', () => {
    it('should update policy', () => {
      registry.updatePolicy({ preferLocal: false, maxRetries: 5 });

      const policy = registry.getPolicy();
      expect(policy.preferLocal).toBe(false);
      expect(policy.maxRetries).toBe(5);
      expect(policy.cloudFallback).toBe(true); // unchanged
    });

    it('should get policy copy', () => {
      const policy1 = registry.getPolicy();
      policy1.preferLocal = false;

      const policy2 = registry.getPolicy();
      expect(policy2.preferLocal).toBe(true); // original unchanged
    });
  });

  describe('Provider Unregistration', () => {
    it('should unregister provider', async () => {
      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'test-provider',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      });

      expect(registry.getProvider('test-provider')).toBeDefined();

      await registry.unregisterProvider('test-provider');
      expect(registry.getProvider('test-provider')).toBeUndefined();
    });

    it('should handle unregistering non-existent provider', async () => {
      await expect(
        registry.unregisterProvider('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all providers', async () => {
      await registry.registerProvider({
        type: ProviderType.OLLAMA,
        name: 'test-1',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
      });

      await registry.registerProvider({
        type: ProviderType.OPENAI,
        name: 'test-2',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4',
      });

      expect(registry.getAllProviders()).toHaveLength(2);

      await registry.shutdown();

      expect(registry.getAllProviders()).toHaveLength(0);
    });
  });
});
