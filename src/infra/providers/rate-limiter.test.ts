import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves immediately on the first call', async () => {
    const limiter = new RateLimiter(1000);

    // In fake timers environment, Date.now() doesn't advance unless we tick,
    // but the limiter should resolve instantly anyway.
    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });

    // We need to advance the timer just enough for any immediate setTimeout(0) bounds (if any),
    // but in RateLimiter it's Math.max(0, 1000 - largeNumber) -> 0ms.
    await vi.advanceTimersByTimeAsync(0);

    expect(resolved).toBe(true);
  });

  it('throttles subsequent calls to respect minDelayMs', async () => {
    const limiter = new RateLimiter(1000);

    let resolvedCount = 0;

    limiter.acquire().then(() => {
      resolvedCount++;
    });
    limiter.acquire().then(() => {
      resolvedCount++;
    });
    limiter.acquire().then(() => {
      resolvedCount++;
    });

    // First one should resolve immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(resolvedCount).toBe(1);

    // After 500ms, still only 1
    await vi.advanceTimersByTimeAsync(500);
    expect(resolvedCount).toBe(1);

    // After 1000ms total, 2 should be resolved
    await vi.advanceTimersByTimeAsync(500);
    expect(resolvedCount).toBe(2);

    // After 2000ms total, all 3 should be resolved
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolvedCount).toBe(3);
  });

  it('rejects properly if aborted while waiting in queue', async () => {
    const limiter = new RateLimiter(1000);
    const controller = new AbortController();

    let resolved = false;
    let rejectedError: unknown = null;

    // First call consumes the immediate allowance
    limiter.acquire();

    // Second call goes into queue
    limiter
      .acquire(controller.signal)
      .then(() => {
        resolved = true;
      })
      .catch((error) => {
        rejectedError = error;
      });

    // Abort before the delay passes
    controller.abort(new Error('Manual abort'));

    await vi.advanceTimersByTimeAsync(0);

    expect(resolved).toBe(false);
    expect(rejectedError).toBeInstanceOf(Error);
    expect((rejectedError as Error).message).toBe('Manual abort');
  });

  it('rejects synchronously if already aborted when passed in', async () => {
    const limiter = new RateLimiter(1000);
    const controller = new AbortController();
    controller.abort(new Error('Already aborted'));

    await expect(limiter.acquire(controller.signal)).rejects.toThrow('Already aborted');
  });

  it('does not process aborted items and processes subsequent items on time', async () => {
    const limiter = new RateLimiter(1000);
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    let resolvedCount = 0;

    // Immediate
    limiter.acquire().then(() => resolvedCount++);

    // In queue, aborted
    limiter
      .acquire(controller1.signal)
      .then(() => resolvedCount++)
      .catch(() => {});

    // In queue, aborted
    limiter
      .acquire(controller2.signal)
      .then(() => resolvedCount++)
      .catch(() => {});

    // In queue, NOT aborted. Should resolve at ~t=1000 (since the aborted ones are removed)
    limiter.acquire().then(() => resolvedCount++);

    await vi.advanceTimersByTimeAsync(0);
    expect(resolvedCount).toBe(1);

    controller1.abort();
    controller2.abort();

    await vi.advanceTimersByTimeAsync(1000);

    // The last item should now resolve (1 + 1 = 2)
    expect(resolvedCount).toBe(2);
  });
});
