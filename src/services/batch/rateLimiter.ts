export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestsInWindow = 0;
  private windowStart = Date.now();
  
  constructor(
    private maxRequestsPerSecond: number = 3,
    private windowMs: number = 1000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
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
          await new Promise(resolve => setTimeout(resolve, 350)); // ~3 req/sec
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
}