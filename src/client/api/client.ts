import { Feature, Task, ReviewSummary } from '../types';

const API_BASE = '/api';

export class APIClient {
  private static async request<T>(
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

  // Repo Operations
  static async listRepos(): Promise<Record<string, any>> {
    return this.request(`${API_BASE}/repos`);
  }

  static async registerRepo(repoName: string, description?: string): Promise<any> {
    return this.request(`${API_BASE}/repos`, {
      method: 'POST',
      body: JSON.stringify({ repoName, description }),
    });
  }

  // Feature Operations
  static async listFeatures(repoName: string = 'default'): Promise<Feature[]> {
    const response = await this.request<any>(`${API_BASE}/features?repoName=${encodeURIComponent(repoName)}`);
    return response.features || [];
  }

  static async getFeature(repoName: string, featureSlug: string): Promise<Feature> {
    return this.request(`${API_BASE}/features/${encodeURIComponent(featureSlug)}?repoName=${encodeURIComponent(repoName)}`);
  }

  static async createFeature(data: {
    repoName: string;
    featureSlug: string;
    title: string;
    description?: string;
  }): Promise<any> {
    return this.request(`${API_BASE}/features`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async deleteFeature(repoName: string, featureSlug: string): Promise<any> {
    return this.request(
      `${API_BASE}/features/${encodeURIComponent(featureSlug)}?repoName=${encodeURIComponent(repoName)}`,
      { method: 'DELETE' }
    );
  }

  // Task Operations
  static async getTasks(repoName: string, featureSlug: string): Promise<ReviewSummary> {
    return this.request(
      `${API_BASE}/tasks?featureSlug=${encodeURIComponent(featureSlug)}&repoName=${encodeURIComponent(repoName)}`
    );
  }

  static async getTask(repoName: string, featureSlug: string, taskId: string): Promise<Task> {
    return this.request(
      `${API_BASE}/task?featureSlug=${encodeURIComponent(featureSlug)}&id=${encodeURIComponent(taskId)}&repoName=${encodeURIComponent(repoName)}`
    );
  }

  static async getFullTask(repoName: string, featureSlug: string, taskId: string): Promise<Task> {
    return this.request(
      `${API_BASE}/task/full?featureSlug=${encodeURIComponent(featureSlug)}&id=${encodeURIComponent(taskId)}&repoName=${encodeURIComponent(repoName)}`
    );
  }

  static async createTask(data: {
    repoName: string;
    featureSlug: string;
    taskId: string;
    title: string;
    description: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateTask(
    taskId: string,
    featureSlug: string,
    repoName: string,
    updates: Partial<Task>
  ): Promise<any> {
    return this.request(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify({ featureSlug, updates, repoName }),
    });
  }

  static async deleteTask(repoName: string, featureSlug: string, taskId: string): Promise<any> {
    return this.request(
      `${API_BASE}/tasks/${encodeURIComponent(taskId)}?featureSlug=${encodeURIComponent(featureSlug)}&repoName=${encodeURIComponent(repoName)}`,
      { method: 'DELETE' }
    );
  }

  static async getTasksByStatus(
    repoName: string,
    featureSlug: string,
    status: string
  ): Promise<any> {
    return this.request(
      `${API_BASE}/tasks/by-status?featureSlug=${encodeURIComponent(featureSlug)}&status=${encodeURIComponent(status)}&repoName=${encodeURIComponent(repoName)}`
    );
  }
}
