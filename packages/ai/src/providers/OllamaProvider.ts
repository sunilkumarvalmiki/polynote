/**
 * Ollama AI Provider
 * Local AI provider using Ollama
 */

import { getPromptForOperation } from '../prompts';
import { ProviderLocation, ProviderConfig, AIRequest, AIResponse, StreamCallback } from '../types';

import { BaseProvider } from './BaseProvider';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, ProviderLocation.LOCAL);
  }

  async initialize(): Promise<void> {
    try {
      // Test connection to Ollama
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }

      // Verify model is available
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const modelExists = models.some((m: { name: string }) => m.name === this.config.model);

      if (!modelExists) {
        console.warn(
          `Model ${this.config.model} not found in Ollama. Available models:`,
          models.map((m: { name: string }) => m.name).join(', ')
        );
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize Ollama provider: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
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

      const ollamaRequest: OllamaGenerateRequest = {
        model: this.config.model,
        prompt,
        stream: request.stream || false,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 2048,
        },
      };

      if (request.stream && onStream) {
        return await this.executeStreaming(ollamaRequest, onStream);
      } else {
        return await this.executeNonStreaming(ollamaRequest);
      }
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async executeNonStreaming(request: OllamaGenerateRequest): Promise<AIResponse> {
    const { result, durationMs } = await this.measureExecution(async () => {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    });

    const data = result as OllamaGenerateResponse;

    return {
      content: data.response,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      provider: this.name,
      model: this.config.model,
      durationMs,
      streamed: false,
    };
  }

  private async executeStreaming(
    request: OllamaGenerateRequest,
    onStream: StreamCallback
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let fullResponse = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
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
          if (line.trim()) {
            const data = JSON.parse(line) as OllamaGenerateResponse;
            if (data.response) {
              fullResponse += data.response;
              onStream(data.response);
            }

            if (data.done) {
              promptTokens = data.prompt_eval_count || 0;
              completionTokens = data.eval_count || 0;
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
    // Ollama doesn't require explicit shutdown
    await super.shutdown();
  }
}
