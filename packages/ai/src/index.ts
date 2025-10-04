/**
 * @polynote/ai - AI Provider Abstraction Layer
 *
 * Provides unified access to local and cloud AI providers with:
 * - Local-first policy with cloud fallback
 * - Streaming support
 * - Token budget tracking
 * - Secret redaction
 * - Multiple operations: summarize, translate, rewrite
 */

// Core types
export * from './types';

// Providers
export { BaseProvider } from './providers/BaseProvider';
export { OllamaProvider } from './providers/OllamaProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export { ClaudeProvider } from './providers/ClaudeProvider';

// Registry
export { ProviderRegistry } from './ProviderRegistry';

// AI Service
export {
  AIService,
  type SummarizeOptions,
  type TranslateOptions,
  type RewriteOptions,
} from './AIService';

// Prompt utilities
export {
  redactSecrets,
  getSummarizePrompt,
  getTranslatePrompt,
  getRewritePrompt,
  getChatPrompt,
  getPromptForOperation,
} from './prompts';
