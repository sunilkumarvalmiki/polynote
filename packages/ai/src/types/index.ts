/**
 * AI Provider Types
 * Defines interfaces for AI provider abstraction layer
 */

/**
 * Supported AI provider types
 */
export enum ProviderType {
  OLLAMA = 'ollama',
  GPT4ALL = 'gpt4all',
  LLAMA_CPP = 'llama_cpp',
  OPENAI = 'openai',
  CLAUDE = 'claude',
}

/**
 * Provider execution location
 */
export enum ProviderLocation {
  LOCAL = 'local',
  CLOUD = 'cloud',
}

/**
 * AI operation types
 */
export enum OperationType {
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  REWRITE = 'rewrite',
  CHAT = 'chat',
}

/**
 * Translation language codes
 */
export enum Language {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi',
}

/**
 * Rewrite style options
 */
export enum RewriteStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  CONCISE = 'concise',
  DETAILED = 'detailed',
  TECHNICAL = 'technical',
  SIMPLE = 'simple',
}

/**
 * Configuration for a provider instance
 */
export interface ProviderConfig {
  /** Provider type */
  type: ProviderType;
  /** Display name */
  name: string;
  /** Base URL for API endpoint */
  baseUrl: string;
  /** API key (for cloud providers) */
  apiKey?: string;
  /** Model name to use */
  model: string;
  /** Maximum tokens for completion */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Prompt tokens */
  promptTokens: number;
  /** Completion tokens */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
}

/**
 * AI operation request
 */
export interface AIRequest {
  /** Operation type */
  operation: OperationType;
  /** Input text/note content */
  content: string;
  /** Additional operation-specific parameters */
  params?: {
    /** Target language for translation */
    targetLanguage?: Language;
    /** Source language for translation */
    sourceLanguage?: Language;
    /** Style for rewrite */
    style?: RewriteStyle;
    /** Custom instructions */
    customInstructions?: string;
  };
  /** Enable streaming response */
  stream?: boolean;
}

/**
 * AI operation response
 */
export interface AIResponse {
  /** Generated content */
  content: string;
  /** Token usage */
  usage?: TokenUsage;
  /** Provider that handled the request */
  provider: string;
  /** Model used */
  model: string;
  /** Operation duration in milliseconds */
  durationMs: number;
  /** Whether response was streamed */
  streamed: boolean;
}

/**
 * Streaming chunk callback
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Provider health status
 */
export interface ProviderHealth {
  /** Provider name */
  provider: string;
  /** Is provider available */
  available: boolean;
  /** Response time in ms */
  responseTime?: number;
  /** Error message if unavailable */
  error?: string;
}

/**
 * Token budget tracking
 */
export interface TokenBudget {
  /** Daily token limit */
  dailyLimit: number;
  /** Tokens used today */
  usedToday: number;
  /** Remaining tokens */
  remaining: number;
  /** Reset timestamp */
  resetsAt: Date;
}

/**
 * Core AI Provider Interface
 */
export interface IProvider {
  /** Provider type */
  readonly type: ProviderType;
  /** Provider name */
  readonly name: string;
  /** Provider location (local/cloud) */
  readonly location: ProviderLocation;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider health status
   */
  getHealth(): Promise<ProviderHealth>;

  /**
   * Execute an AI operation
   * @param request - AI request
   * @param onStream - Optional streaming callback
   */
  execute(request: AIRequest, onStream?: StreamCallback): Promise<AIResponse>;

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number;

  /**
   * Cleanup and shutdown
   */
  shutdown(): Promise<void>;
}

/**
 * Provider registry policy
 */
export interface ProviderPolicy {
  /** Prefer local providers */
  preferLocal: boolean;
  /** Fallback to cloud if local unavailable */
  cloudFallback: boolean;
  /** Maximum retries per provider */
  maxRetries: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Token budget limits */
  tokenBudget?: {
    daily: number;
    perRequest: number;
  };
}
