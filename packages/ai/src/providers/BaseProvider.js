/**
 * Base AI Provider Implementation
 * Abstract class providing common functionality for all AI providers
 */
export class BaseProvider {
    type;
    name;
    location;
    config;
    initialized = false;
    constructor(config, location) {
        this.type = config.type;
        this.name = config.name;
        this.location = location;
        this.config = config;
    }
    /**
     * Get provider health status
     */
    async getHealth() {
        const startTime = Date.now();
        try {
            const available = await this.isAvailable();
            const responseTime = Date.now() - startTime;
            return {
                provider: this.name,
                available,
                responseTime,
            };
        }
        catch (error) {
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
    estimateTokens(text) {
        // Simple heuristic: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
    /**
     * Cleanup and shutdown - default implementation
     */
    async shutdown() {
        await Promise.resolve();
        this.initialized = false;
    }
    /**
     * Ensure provider is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`Provider ${this.name} is not initialized`);
        }
    }
    /**
     * Validate request
     */
    validateRequest(request) {
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
    createErrorResponse(error) {
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
    async measureExecution(fn) {
        const startTime = Date.now();
        const result = await fn();
        const durationMs = Date.now() - startTime;
        return { result, durationMs };
    }
    /**
     * Retry logic with exponential backoff
     */
    async retry(fn, maxRetries = 3, baseDelayMs = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    const delay = baseDelayMs * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('Max retries exceeded');
    }
}
