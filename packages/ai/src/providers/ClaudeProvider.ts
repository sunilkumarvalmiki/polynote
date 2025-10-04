/**
 * Claude AI Provider
 * Cloud AI provider using Anthropic Claude API
 */

import { getPromptForOperation } from '../prompts';
import {
  ProviderLocation,
  ProviderConfig,
  AIRequest,
  AIResponse,
  StreamCallback,
} from '../types';

import { BaseProvider } from './BaseProvider';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeStreamEvent {
  type: string;
  message?: ClaudeResponse;
  content_block?: {
    type: string;
    text: string;
  };
  delta?: {
    type: string;
    text?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider extends BaseProvider {
  private readonly apiVersion = '2023-06-01';

  constructor(config: ProviderConfig) {
    super(config, ProviderLocation.CLOUD);

    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }
  }

  async initialize(): Promise<void> {
    // Claude doesn't have a simple health check endpoint
    // We'll validate on first request
    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal request to check availability
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': this.apiVersion,
        },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return response.ok || response.status === 400; // 400 is ok, means API is reachable
    } catch {
      return false;
    }
  }

  async execute(request: AIRequest, onStream?: StreamCallback): Promise<AIResponse> {
    this.ensureInitialized();
    this.validateRequest(request);

    try {
      const prompt = getPromptForOperation(request.operation, request.content, request.params);

      const claudeRequest: ClaudeRequest = {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.7,
        stream: request.stream || false,
      };

      if (request.stream && onStream) {
        return await this.executeStreaming(claudeRequest, onStream);
      } else {
        return await this.executeNonStreaming(claudeRequest);
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async executeNonStreaming(request: ClaudeRequest): Promise<AIResponse> {
    const { result, durationMs } = await this.measureExecution(async () => {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          `Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`
        );
      }

      return await response.json();
    });

    const data = result as ClaudeResponse;
    const textContent = data.content.find((c) => c.type === 'text');

    return {
      content: textContent?.text || '',
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      provider: this.name,
      model: data.model,
      durationMs,
      streamed: false,
    };
  }

  private async executeStreaming(
    request: ClaudeRequest,
    onStream: StreamCallback
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let fullResponse = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          `Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`
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

            try {
              const event = JSON.parse(dataStr) as ClaudeStreamEvent;

              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullResponse += event.delta.text;
                onStream(event.delta.text);
              }

              if (event.type === 'message_start' && event.message?.usage) {
                promptTokens = event.message.usage.input_tokens;
              }

              if (event.type === 'message_delta' && event.usage) {
                completionTokens = event.usage.output_tokens;
              }
            } catch (e) {
              // Skip malformed JSON chunks
              console.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      }

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

  async shutdown(): Promise<void> {
    await super.shutdown();
  }
}
