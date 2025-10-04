/**
 * Base AI Provider Implementation
 * Abstract class providing common functionality for all AI providers
 */

import {
  IProvider,
  ProviderType,
  ProviderLocation,
  ProviderConfig,
  AIRequest,
  AIResponse,
  StreamCallback,
  ProviderHealth,
} from '../types';

export abstract class BaseProvider implements IProvider {
  readonly type: ProviderType;
  readonly name: string;
  readonly location: ProviderLocation;
  protected config: ProviderConfig;
  protected initialized: boolean = false;

  constructor(config: ProviderConfig, location: ProviderLocation) {
    this.type = config.type;
    this.name = config.name;
    this.location = location;
    this.config = config;
  }

  /**
   * Initialize the provider - must be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if provider is available - must be implemented by subclasses
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Execute an AI operation - must be implemented by subclasses
   */
  abstract execute(
    request: AIRequest,
    onStream?: StreamCallback
  ): Promise<AIResponse>;

  /**
   * Get provider health status
   */
  async getHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const available = await this.isAvailable();
      const responseTime = Date.now() - startTime;

      return {
        provider: this.name,
        available,
        responseTime,
      };
    } catch (error) {
      return {
        provider: this.name,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Estimate token count for text
   * Simple estimation: ~4 characters per token (English)
   * Override in subclass for more accurate provider-specific estimation
   */
  estimateTokens(text: string): number {
    // Simple heuristic: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Cleanup and shutdown - default implementation
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Ensure provider is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.name} is not initialized`);
    }
  }

  /**
   * Validate request
   */
  protected validateRequest(request: AIRequest): void {
    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Request content cannot be empty');
    }

    if (!request.operation) {
      throw new Error('Request operation must be specified');
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(error: Error): AIResponse {
    return {
      content: `Error: ${error.message}`,
      provider: this.name,
      model: this.config.model,
      durationMs: 0,
      streamed: false,
    };
  }

  /**
   * Measure execution time
   */
  protected async measureExecution<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const startTime = Date.now();
    const result = await fn();
    const durationMs = Date.now() - startTime;
    return { result, durationMs };
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
