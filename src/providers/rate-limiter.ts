/**
 * @file rate-limiter.ts
 * @description Provides a flexible mechanism to throttle outgoing requests.
 */

export class RateLimiter {
  private queue: Array<{ resolve: () => void; reject: (reason?: any) => void; signal?: AbortSignal }> = [];
  private isProcessing = false;
  private lastExecuted = 0;

  /**
   * @param minDelayMs Minimum time in milliseconds that must pass between requests.
   */
  constructor(private minDelayMs: number) {}

  /**
   * Acquires permission to execute a request, respecting the rate limit.
   * If the limit hasn't been reached, it resolves immediately.
   * Otherwise, it queues the request and resolves it after the appropriate delay.
   * @param signal An optional AbortSignal to cancel waiting in the queue.
   * @throws DOMException If the signal is aborted while waiting.
   */
  public async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw signal.reason || new DOMException('Aborted', 'AbortError');
    }

    return new Promise<void>((resolve, reject) => {
      const entry = { resolve, reject, signal };
      
      const onAbort = () => {
        // Remove from queue
        const index = this.queue.indexOf(entry);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
        reject(signal!.reason || new DOMException('Aborted', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
        
        // Wrap the original resolve/reject to also remove event listener
        entry.resolve = () => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        };
        entry.reject = (reason) => {
          signal.removeEventListener('abort', onAbort);
          reject(reason);
        };
      }

      this.queue.push(entry);
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const now = Date.now();
    const timeSinceLast = now - this.lastExecuted;
    const delayRequired = Math.max(0, this.minDelayMs - timeSinceLast);

    setTimeout(() => {
      // The queue might be empty if all items were aborted during the timeout
      if (this.queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const next = this.queue.shift();
      this.lastExecuted = Date.now(); // update based on reality, not prediction
      
      // Resolve the next item
      if (next) {
        next.resolve();
      }

      this.isProcessing = false;
      this.processQueue();
    }, delayRequired);
  }
}
