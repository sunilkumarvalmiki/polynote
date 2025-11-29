export class BaseConnector {
    enabled = false;
    maxRetries = 3;
    retryDelay = 1000;
    /**
     * Retry logic with exponential backoff
     */
    async retry(fn, retries = this.maxRetries) {
        try {
            return await fn();
        }
        catch (error) {
            if (retries === 0)
                throw error;
            await this.sleep(this.retryDelay * (this.maxRetries - retries + 1));
            return this.retry(fn, retries - 1);
        }
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Rate limiter helper
     */
    createRateLimiter(requestsPerSecond) {
        const minInterval = 1000 / requestsPerSecond;
        let lastCall = 0;
        return async (fn) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;
            if (timeSinceLastCall < minInterval) {
                await this.sleep(minInterval - timeSinceLastCall);
            }
            lastCall = Date.now();
            return fn();
        };
    }
    /**
     * Validate note structure
     */
    validateNote(note) {
        if (!note.title || note.title.trim() === '') {
            throw new Error('Note title is required');
        }
        if (!note.body) {
            throw new Error('Note body is required');
        }
    }
    /**
     * Sync helper
     */
    async sync(since) {
        const result = {
            connector: this.name,
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: [],
        };
        try {
            const changes = await this.pullChanges(since);
            result.pulled = changes.length;
        }
        catch (error) {
            result.errors.push(`Pull failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return result;
    }
}
