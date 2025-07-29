export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestsInWindow = 0;
  private windowStart = Date.now();
  private backoffUntil = 0; // Timestamp until which we should backoff due to 429s
  
  constructor(
    private maxRequestsPerSecond: number = 5,
    private windowMs: number = 1000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          // Handle 429 rate limit errors
          if (this.isRateLimitError(error)) {
            const retryAfter = this.extractRetryAfter(error);
            this.setBackoff(retryAfter);
          }
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      
      // Check if we're in a backoff period due to 429s
      if (now < this.backoffUntil) {
        const backoffWait = this.backoffUntil - now;
        await new Promise(resolve => setTimeout(resolve, backoffWait));
        continue;
      }
      
      // Reset window if needed
      if (now - this.windowStart >= this.windowMs) {
        this.windowStart = now;
        this.requestsInWindow = 0;
      }
      
      // Check if we can make a request
      if (this.requestsInWindow >= this.maxRequestsPerSecond) {
        // Wait until next window
        const waitTime = this.windowMs - (now - this.windowStart);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Process the next request
      const task = this.queue.shift();
      if (task) {
        this.requestsInWindow++;
        this.lastRequestTime = now;
        
        try {
          await task();
        } catch (error) {
          console.error('Rate limiter task error:', error);
        }
        
        // Add small delay between requests to be safe
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // ~5 req/sec
        }
      }
    }
    
    this.processing = false;
  }
  
  clearQueue() {
    this.queue = [];
  }
  
  getQueueLength() {
    return this.queue.length;
  }

  private isRateLimitError(error: unknown): boolean {
    // Check for 429 status in various error formats
    if (!error || typeof error !== 'object') return false;
    
    const errorObj = error as Record<string, unknown>;
    const response = errorObj.response as Record<string, unknown> | undefined;
    
    return (
      errorObj.status === 429 ||
      response?.status === 429 ||
      errorObj.isRateLimited === true ||
      (typeof errorObj.code === 'string' && errorObj.code.includes('RATE_LIMIT')) ||
      (typeof errorObj.message === 'string' && errorObj.message.toLowerCase().includes('rate limit'))
    );
  }

  private extractRetryAfter(error: unknown): number {
    // Try to extract retry-after from error
    if (!error || typeof error !== 'object') return 5000;
    
    const errorObj = error as Record<string, unknown>;
    const response = errorObj.response as Record<string, unknown> | undefined;
    const headers = response?.headers as Record<string, unknown> | undefined;
    const details = errorObj.details as Record<string, unknown> | undefined;
    
    const retryAfter = 
      errorObj.retryAfter ||
      headers?.['retry-after'] ||
      headers?.['x-retry-after'] ||
      details?.retryAfter;
    
    if (retryAfter && typeof retryAfter === 'string') {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed * 1000; // Convert seconds to ms
      }
    }
    
    // Default backoff of 5 seconds if no retry-after header
    return 5000;
  }

  private setBackoff(retryAfterMs: number): void {
    const now = Date.now();
    // Add some buffer to the retry-after time to be safe
    const backoffMs = Math.min(retryAfterMs + 1000, 30000); // Max 30 seconds
    this.backoffUntil = now + backoffMs;
    
    console.warn(`Rate limit detected, backing off for ${backoffMs}ms`);
  }
}