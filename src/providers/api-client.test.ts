import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secureFetch } from './api-client';
import { ProviderError, ProviderErrorCode } from './errors';

describe('secureFetch', () => {
  const originalFetch = global.fetch;
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should successfully fetch JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'success' }),
    });

    const result = await secureFetch('http://example.com');
    expect(result).toEqual({ data: 'success' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should translate 404 to ProviderErrorCode.NOT_FOUND', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '{"error": "Game not found"}',
    });

    expect.assertions(3);
    try {
      await secureFetch('http://example.com');
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe(ProviderErrorCode.NOT_FOUND);
      expect((error as ProviderError).originalError).toBeDefined();
    }
  });

  it('should translate 401/403 to ProviderErrorCode.AUTH_ERROR', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Missing API Key',
    });

    expect.assertions(2);
    try {
      await secureFetch('http://example.com');
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe(ProviderErrorCode.AUTH_ERROR);
    }
  });

  it('should translate 429 to ProviderErrorCode.RATE_LIMIT', async () => {
    // secureFetch has retry logic for 429, so we mock it returning 429 three times (exhausting retries)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limit exceeded',
    });

    expect.assertions(3);
    try {
      await secureFetch('http://example.com', { retryLimit: 2 });
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe(ProviderErrorCode.RATE_LIMIT);
    }
    
    // Initial call + 2 retries
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should parse and throw TimeoutError if fetch throws DOMException TimeoutError', async () => {
    const timeoutError = new DOMException('The operation timed out.', 'TimeoutError');
    fetchMock.mockRejectedValueOnce(timeoutError);

    expect.assertions(2);
    try {
       await secureFetch('http://example.com', { timeout: 100 });
    } catch (error) {
       expect(error).toBeInstanceOf(ProviderError);
       expect((error as ProviderError).code).toBe(ProviderErrorCode.TIMEOUT);
    }
  });
  
  it('should NOT retry on ProviderErrors natively generated (e.g. 404)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Not Found',
    });

    await expect(secureFetch('http://example.com')).rejects.toThrow(ProviderError);
    // Should immediately fail, no retries
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
