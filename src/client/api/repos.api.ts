/**
 * Repository API client
 */
import { BaseClient } from './base.js';

export class RepoAPI extends BaseClient {
  /**
   * List all registered repositories
   */
  static async listRepos(): Promise<Record<string, any>> {
    return this.request(`${this.apiBase}/repos`);
  }

  /**
   * Register a new repository
   */
  static async registerRepo(repoName: string, description?: string): Promise<any> {
    return this.request(`${this.apiBase}/repos`, {
      method: 'POST',
      body: JSON.stringify({ repoName, description }),
    });
  }
}
