/**
 * Base HTTP client for API requests
 */

const API_BASE = '/api';

export class BaseClient {
  protected static async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error((error as any).error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  protected static get apiBase(): string {
    return API_BASE;
  }
}
