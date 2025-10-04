/**
 * OpenAI AI Provider
 * Cloud AI provider using OpenAI API
 */

import { getPromptForOperation } from '../prompts';
import { ProviderLocation, ProviderConfig, AIRequest, AIResponse, StreamCallback } from '../types';

import { BaseProvider } from './BaseProvider';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class OpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, ProviderLocation.CLOUD);

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async initialize(): Promise<void> {
    try {
      // Test connection with a simple model list request
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API returned ${response.status}`);
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(request: AIRequest, onStream?: StreamCallback): Promise<AIResponse> {
    this.ensureInitialized();
    this.validateRequest(request);

    try {
      const prompt = getPromptForOperation(request.operation, request.content, request.params);

      const openaiRequest: OpenAIChatRequest = {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        stream: request.stream || false,
      };

      if (request.stream && onStream) {
        return await this.executeStreaming(openaiRequest, onStream);
      } else {
        return await this.executeNonStreaming(openaiRequest);
      }
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async executeNonStreaming(request: OpenAIChatRequest): Promise<AIResponse> {
    const { result, durationMs } = await this.measureExecution(async () => {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          `OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`
        );
      }

      return await response.json();
    });

    const data = result as OpenAIChatResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      provider: this.name,
      model: data.model,
      durationMs,
      streamed: false,
    };
  }

  private async executeStreaming(
    request: OpenAIChatRequest,
    onStream: StreamCallback
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let fullResponse = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          `OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);

            if (dataStr === '[DONE]') {
              break;
            }

            try {
              const data = JSON.parse(dataStr) as OpenAIStreamChunk;
              const delta = data.choices[0]?.delta;

              if (delta?.content) {
                fullResponse += delta.content;
                onStream(delta.content);
              }
            } catch (e) {
              // Skip malformed JSON chunks
              console.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      }

      // Estimate token counts since streaming doesn't provide them
      promptTokens = this.estimateTokens(request.messages[0].content);
      completionTokens = this.estimateTokens(fullResponse);

      const durationMs = Date.now() - startTime;

      return {
        content: fullResponse,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        provider: this.name,
        model: this.config.model,
        durationMs,
        streamed: true,
      };
    } catch (error) {
      throw new Error(
        `Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * More accurate token estimation for OpenAI
   * Uses tiktoken-like approximation
   */
  estimateTokens(text: string): number {
    // GPT models: ~4 chars per token on average
    // More accurate would be to use tiktoken library
    return Math.ceil(text.length / 4);
  }

  async shutdown(): Promise<void> {
    await super.shutdown();
  }
}
