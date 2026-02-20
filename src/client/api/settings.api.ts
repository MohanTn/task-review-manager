/**
 * Settings API - Role Prompt configuration endpoints
 */
import { BaseClient } from './base.js';

export interface RolePromptConfig {
  roleId: string;
  systemPrompt: string;
  focusAreas: string[];
  researchInstructions: string;
  requiredOutputFields: string[];
  phase: 'review' | 'execution';
  isCustom: boolean;
  updatedAt: string;
}

export class SettingsAPI extends BaseClient {
  /**
   * Fetch all role prompt configs.
   */
  static async getAllRolePrompts(): Promise<RolePromptConfig[]> {
    const data = await this.request<{ success: boolean; rolePrompts: RolePromptConfig[] }>(
      `${this.apiBase}/settings/role-prompts`
    );
    return data.rolePrompts;
  }

  /**
   * Update one role's prompt config.
   */
  static async updateRolePrompt(
    roleId: string,
    update: Partial<Pick<RolePromptConfig, 'systemPrompt' | 'focusAreas' | 'researchInstructions' | 'requiredOutputFields'>>
  ): Promise<RolePromptConfig> {
    const data = await this.request<RolePromptConfig & { success: boolean }>(
      `${this.apiBase}/settings/role-prompts/${roleId}`,
      {
        method: 'PUT',
        body: JSON.stringify(update),
      }
    );
    return data;
  }

  /**
   * Reset a role's prompt to the built-in default.
   */
  static async resetRolePrompt(roleId: string): Promise<RolePromptConfig> {
    const data = await this.request<RolePromptConfig & { success: boolean }>(
      `${this.apiBase}/settings/role-prompts/${roleId}/reset`,
      { method: 'POST' }
    );
    return data;
  }
}
