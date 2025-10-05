/**
 * Rate Limiter for IPC Handlers
 * 
 * Implements token bucket algorithm to protect IPC channels from abuse.
 * Default: 100 calls per minute per channel
 */

interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per interval (ms)
  refillInterval: number; // Interval in milliseconds
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxTokens: config?.maxTokens ?? 100,           // 100 calls
      refillRate: config?.refillRate ?? 100,         // 100 tokens
      refillInterval: config?.refillInterval ?? 60000, // per 60 seconds
    };
  }

  /**
   * Check if a request is allowed
   * @param channel - IPC channel name
   * @returns true if request is allowed, false if rate limited
   */
  public checkLimit(channel: string): boolean {
    const bucket = this.getBucket(channel);
    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get or create token bucket for channel
   */
  private getBucket(channel: string): TokenBucket {
    let bucket = this.buckets.get(channel);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        lastRefill: Date.now(),
      };
      this.buckets.set(channel, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    
    if (timePassed >= this.config.refillInterval) {
      const intervalsPass = Math.floor(timePassed / this.config.refillInterval);
      const tokensToAdd = intervalsPass * this.config.refillRate;
      
      bucket.tokens = Math.min(
        this.config.maxTokens,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }
  }

  /**
   * Get current token count for a channel (for debugging)
   */
  public getTokens(channel: string): number {
    const bucket = this.getBucket(channel);
    this.refillBucket(bucket);
    return bucket.tokens;
  }

  /**
   * Reset rate limits for a channel
   */
  public reset(channel: string): void {
    this.buckets.delete(channel);
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.buckets.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter({
  maxTokens: 100,    // 100 calls
  refillRate: 100,   // refill 100 tokens
  refillInterval: 60000, // every 60 seconds
});

/**
 * Rate limit middleware for IPC handlers
 * @param channel - IPC channel name
 * @returns true if allowed, throws error if rate limited
 */
export function checkRateLimit(channel: string): boolean {
  if (!rateLimiter.checkLimit(channel)) {
    const error = new Error(`Rate limit exceeded for channel: ${channel}. Maximum 100 calls per minute.`);
    error.name = 'RateLimitError';
    throw error;
  }
  return true;
}

export default rateLimiter;