/**
 * AI Service
 * High-level service for AI operations (summarize, translate, rewrite)
 */

import { ProviderRegistry } from './ProviderRegistry';
import {
  OperationType,
  Language,
  RewriteStyle,
  AIRequest,
  AIResponse,
  StreamCallback,
  TokenBudget,
} from './types';

export interface SummarizeOptions {
  /** Preferred provider name */
  provider?: string;
  /** Enable streaming */
  stream?: boolean;
  /** Custom instructions */
  customInstructions?: string;
}

export interface TranslateOptions {
  /** Source language (auto-detect if not specified) */
  sourceLanguage?: Language;
  /** Target language */
  targetLanguage: Language;
  /** Preferred provider name */
  provider?: string;
  /** Enable streaming */
  stream?: boolean;
}

export interface RewriteOptions {
  /** Rewrite style */
  style: RewriteStyle;
  /** Preferred provider name */
  provider?: string;
  /** Enable streaming */
  stream?: boolean;
  /** Custom instructions */
  customInstructions?: string;
}

export class AIService {
  private registry: ProviderRegistry;
  private tokenUsage: Map<string, { date: string; tokens: number }> = new Map();

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  /**
   * Summarize text content
   */
  async summarize(
    content: string,
    options?: SummarizeOptions,
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    const request: AIRequest = {
      operation: OperationType.SUMMARIZE,
      content,
      params: {
        customInstructions: options?.customInstructions,
      },
      stream: options?.stream,
    };

    const response = await this.registry.execute(request, onStream, options?.provider);

    this.trackTokenUsage(response);
    return response;
  }

  /**
   * Translate text between languages
   */
  async translate(
    content: string,
    options: TranslateOptions,
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    const sourceLanguage = options.sourceLanguage || Language.ENGLISH;

    const request: AIRequest = {
      operation: OperationType.TRANSLATE,
      content,
      params: {
        sourceLanguage,
        targetLanguage: options.targetLanguage,
      },
      stream: options?.stream,
    };

    const response = await this.registry.execute(request, onStream, options?.provider);

    this.trackTokenUsage(response);
    return response;
  }

  /**
   * Rewrite text in a different style
   */
  async rewrite(
    content: string,
    options: RewriteOptions,
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    const request: AIRequest = {
      operation: OperationType.REWRITE,
      content,
      params: {
        style: options.style,
        customInstructions: options?.customInstructions,
      },
      stream: options?.stream,
    };

    const response = await this.registry.execute(request, onStream, options?.provider);

    this.trackTokenUsage(response);
    return response;
  }

  /**
   * Generic chat/custom operation
   */
  async chat(
    content: string,
    customInstructions: string,
    options?: {
      provider?: string;
      stream?: boolean;
    },
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    const request: AIRequest = {
      operation: OperationType.CHAT,
      content,
      params: {
        customInstructions,
      },
      stream: options?.stream,
    };

    const response = await this.registry.execute(request, onStream, options?.provider);

    this.trackTokenUsage(response);
    return response;
  }

  /**
   * Get token budget status
   */
  getTokenBudget(): TokenBudget {
    const today = new Date().toISOString().split('T')[0];
    const policy = this.registry.getPolicy();
    const dailyLimit = policy.tokenBudget?.daily || 100000;

    let usedToday = 0;
    for (const [date, usage] of this.tokenUsage.entries()) {
      if (date === today) {
        usedToday += usage.tokens;
      }
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      dailyLimit,
      usedToday,
      remaining: Math.max(0, dailyLimit - usedToday),
      resetsAt: tomorrow,
    };
  }

  /**
   * Check if request is within budget
   */
  isWithinBudget(estimatedTokens: number): boolean {
    const budget = this.getTokenBudget();
    const policy = this.registry.getPolicy();
    const perRequestLimit = policy.tokenBudget?.perRequest || 4096;

    return budget.remaining >= estimatedTokens && estimatedTokens <= perRequestLimit;
  }

  /**
   * Estimate tokens for content
   */
  async estimateTokens(content: string): Promise<number> {
    const provider = await this.registry.getBestProvider();
    if (!provider) {
      // Fallback estimation
      return Math.ceil(content.length / 4);
    }
    return provider.estimateTokens(content);
  }

  /**
   * Get health status of all providers
   */
  async getProvidersHealth() {
    return await this.registry.getHealthStatus();
  }

  /**
   * Track token usage
   */
  private trackTokenUsage(response: AIResponse): void {
    if (!response.usage) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const current = this.tokenUsage.get(today) || { date: today, tokens: 0 };
    current.tokens += response.usage.totalTokens;
    this.tokenUsage.set(today, current);

    // Clean up old entries (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

    for (const [date] of this.tokenUsage.entries()) {
      if (date < cutoffDate) {
        this.tokenUsage.delete(date);
      }
    }
  }

  /**
   * Reset token usage tracking
   */
  resetTokenUsage(): void {
    this.tokenUsage.clear();
  }

  /**
   * Get token usage history
   */
  getTokenUsageHistory(): Array<{ date: string; tokens: number }> {
    return Array.from(this.tokenUsage.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
