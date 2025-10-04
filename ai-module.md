
# Task: AI Module Abstraction

## Goal
Normalize access to local (Ollama/GPT4All/llama.cpp) and cloud (OpenAI/Claude) providers.

## Sub‑tasks
- Provider registry + policy (local‑first, cloud fallback).
- Prompt templates; redaction of secrets.
- Streaming responses; token usage budgets.

## Micro‑tasks
- Implement `summarize(note)`; `translate(note, lang)`; `rewrite(note, style)`.
- Podman image with CPU AVX/NEON flags for Apple Silicon.
