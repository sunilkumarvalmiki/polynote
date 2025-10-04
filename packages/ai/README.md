# @polynote/ai

AI provider abstraction layer for PolyNote with local-first policy and cloud fallback.

## Features

- **Multi-Provider Support**: Ollama, GPT4All, llama.cpp, OpenAI, Claude
- **Local-First Policy**: Prefer local AI providers, fallback to cloud when needed
- **Streaming Support**: Real-time response streaming for all providers
- **Token Budget Tracking**: Monitor and limit token usage
- **Secret Redaction**: Automatic redaction of API keys, passwords, and other sensitive data
- **Multiple Operations**: Summarize, translate (EN↔TE↔HI), rewrite with various styles

## Installation

```bash
pnpm add @polynote/ai
```

## Quick Start

```typescript
import { ProviderRegistry, AIService, ProviderType, Language, RewriteStyle } from '@polynote/ai';

// Create registry with local-first policy
const registry = new ProviderRegistry({
  preferLocal: true,
  cloudFallback: true,
  tokenBudget: {
    daily: 100000,
    perRequest: 4096,
  },
});

// Register Ollama (local)
await registry.registerProvider({
  type: ProviderType.OLLAMA,
  name: 'ollama-local',
  baseUrl: 'http://localhost:11434',
  model: 'llama2:7b',
});

// Register OpenAI (cloud fallback)
await registry.registerProvider({
  type: ProviderType.OPENAI,
  name: 'openai-gpt4',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
});

// Create AI service
const aiService = new AIService(registry);

// Summarize
const summary = await aiService.summarize('Long document text here...');
console.log(summary.content);

// Translate
const translation = await aiService.translate('Hello world', {
  targetLanguage: Language.TELUGU,
});
console.log(translation.content);

// Rewrite
const rewritten = await aiService.rewrite('Hey, what\'s up?', {
  style: RewriteStyle.FORMAL,
});
console.log(rewritten.content);
```

## Streaming Example

```typescript
const response = await aiService.summarize(
  'Long document...',
  { stream: true },
  (chunk) => {
    // Stream callback - called for each chunk
    process.stdout.write(chunk);
  }
);
```

## Token Budget

```typescript
// Check budget
const budget = aiService.getTokenBudget();
console.log(`Used: ${budget.usedToday}/${budget.dailyLimit}`);
console.log(`Remaining: ${budget.remaining}`);

// Check if request fits budget
const fits = aiService.isWithinBudget(1000);
```

## Secret Redaction

All prompts automatically redact:
- API keys
- AWS keys
- GitHub tokens
- Bearer tokens
- Private keys
- JWT tokens
- Passwords
- Email addresses
- Private IP addresses

```typescript
import { redactSecrets } from '@polynote/ai';

const text = 'My API key is sk_test_123456789';
const safe = redactSecrets(text);
// Output: 'My API key is [REDACTED]'
```

## Supported Languages

- English (EN)
- Telugu (TE)
- Hindi (HI)

## Rewrite Styles

- `FORMAL`: Professional, business-appropriate
- `CASUAL`: Conversational, informal
- `CONCISE`: Brief and to-the-point
- `DETAILED`: Expanded with more information
- `TECHNICAL`: Precise technical terminology
- `SIMPLE`: Easy to understand for general audience

## Provider Health

```typescript
const health = await aiService.getProvidersHealth();
health.forEach(h => {
  console.log(`${h.provider}: ${h.available ? 'UP' : 'DOWN'}`);
});
```

## License

MIT
