/**
 * Prompt Template System
 * Provides structured prompts for AI operations with secret redaction
 */
import { OperationType, Language, RewriteStyle } from '../types';
/**
 * Secret patterns to redact from content
 */
const SECRET_PATTERNS = [
    // Private keys (check first as they're multi-line)
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
    // JWT tokens
    /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    // AWS Keys
    /AKIA[0-9A-Z]{16}/g,
    // GitHub tokens
    /gh[pousr]_[A-Za-z0-9]{36}/g,
    // Generic bearer tokens
    /Bearer\s+[A-Za-z0-9_\-.]+/gi,
    // Passwords in common formats
    /password["\s:=]+[^\s"]+/gi,
    /passwd["\s:=]+[^\s"]+/gi,
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // IP addresses (private ranges)
    /\b(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.[0-9]{1,3}\.[0-9]{1,3}\b/g,
    // API Keys (last, as it's more general)
    /\b[A-Za-z0-9_-]{32,}\b/g,
];
/**
 * Redact secrets from text
 */
export function redactSecrets(text) {
    let redacted = text;
    for (const pattern of SECRET_PATTERNS) {
        redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
}
/**
 * Prompt template for summarization
 */
export function getSummarizePrompt(content) {
    const safeContent = redactSecrets(content);
    return `You are a professional note summarizer. Create a concise, informative summary of the following note.

Requirements:
- Capture the main ideas and key points
- Keep the summary clear and well-structured
- Preserve important details and context
- Use bullet points if the note contains multiple topics
- Maintain the original tone and intent

Note to summarize:
${safeContent}

Summary:`;
}
/**
 * Prompt template for translation
 */
export function getTranslatePrompt(content, sourceLanguage, targetLanguage) {
    const safeContent = redactSecrets(content);
    const languageNames = {
        [Language.ENGLISH]: 'English',
        [Language.TELUGU]: 'Telugu',
        [Language.HINDI]: 'Hindi',
    };
    const sourceName = languageNames[sourceLanguage];
    const targetName = languageNames[targetLanguage];
    return `You are a professional translator. Translate the following text from ${sourceName} to ${targetName}.

Requirements:
- Maintain the original meaning and context
- Use natural, fluent ${targetName}
- Preserve formatting (markdown, lists, etc.)
- Keep technical terms and proper nouns as appropriate
- Ensure cultural and linguistic accuracy

Text to translate (${sourceName}):
${safeContent}

Translation (${targetName}):`;
}
/**
 * Prompt template for rewriting
 */
export function getRewritePrompt(content, style) {
    const safeContent = redactSecrets(content);
    const styleInstructions = {
        [RewriteStyle.FORMAL]: 'Rewrite in a formal, professional tone suitable for business or academic contexts',
        [RewriteStyle.CASUAL]: 'Rewrite in a casual, conversational tone suitable for informal communication',
        [RewriteStyle.CONCISE]: 'Rewrite to be more concise and to-the-point while preserving all key information',
        [RewriteStyle.DETAILED]: 'Expand and elaborate with more details and explanations',
        [RewriteStyle.TECHNICAL]: 'Rewrite with more technical precision and specialized terminology',
        [RewriteStyle.SIMPLE]: 'Simplify the language to make it easier to understand for a general audience',
    };
    const instruction = styleInstructions[style];
    return `You are a professional editor and writer. ${instruction}.

Requirements:
- Maintain the original meaning and key points
- Preserve formatting (markdown, lists, etc.)
- Ensure the rewritten version matches the requested style
- Keep the content clear and coherent

Original text:
${safeContent}

Rewritten text:`;
}
/**
 * Prompt template for chat/custom operations
 */
export function getChatPrompt(content, customInstructions) {
    const safeContent = redactSecrets(content);
    const instructions = customInstructions || 'Analyze and respond to the following content';
    return `${instructions}

Content:
${safeContent}

Response:`;
}
/**
 * Get appropriate prompt for operation type
 */
export function getPromptForOperation(operation, content, params) {
    switch (operation) {
        case OperationType.SUMMARIZE:
            return getSummarizePrompt(content);
        case OperationType.TRANSLATE:
            if (!params?.sourceLanguage || !params?.targetLanguage) {
                throw new Error('Translation requires sourceLanguage and targetLanguage');
            }
            return getTranslatePrompt(content, params.sourceLanguage, params.targetLanguage);
        case OperationType.REWRITE:
            if (!params?.style) {
                throw new Error('Rewrite requires style parameter');
            }
            return getRewritePrompt(content, params.style);
        case OperationType.CHAT:
            return getChatPrompt(content, params?.customInstructions);
        default:
            throw new Error(`Unknown operation type: ${operation}`);
    }
}
