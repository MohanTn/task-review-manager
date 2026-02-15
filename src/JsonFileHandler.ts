/**
 * JsonFileHandler - Provides atomic file operations with conflict prevention
 */
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { TaskFile } from './types.js';

export class JsonFileHandler {
  private locks: Map<string, Promise<void>> = new Map();
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    // Default to current working directory if not specified
    this.workspaceRoot = workspaceRoot || process.cwd();
  }

  /**
   * Resolve feature_slug to standard task file path
   */
  resolveFeatureSlugPath(featureSlug: string): string {
    return path.join(this.workspaceRoot, '.github', 'artifacts', featureSlug, 'task.json');
  }

  /**
   * Load task file by feature_slug
   */
  async loadByFeatureSlug(featureSlug: string): Promise<TaskFile> {
    const filePath = this.resolveFeatureSlugPath(featureSlug);
    return this.load(filePath);
  }

  /**
   * Load task file with lock by feature_slug
   */
  async loadByFeatureSlugWithLock(featureSlug: string): Promise<TaskFile> {
    const filePath = this.resolveFeatureSlugPath(featureSlug);
    return this.loadWithLock(filePath);
  }

  /**
   * Save task file by feature_slug
   */
  async saveByFeatureSlug(featureSlug: string, taskFile: TaskFile): Promise<void> {
    const filePath = this.resolveFeatureSlugPath(featureSlug);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    
    return this.saveWithBackup(filePath, taskFile);
  }

  /**
   * Validate task file exists by feature_slug
   */
  async validateFeatureSlug(featureSlug: string): Promise<{ valid: boolean; error?: string }> {
    const filePath = this.resolveFeatureSlugPath(featureSlug);
    return this.validate(filePath);
  }

  /**
   * Load task file with exclusive lock
   */
  async loadWithLock(filePath: string): Promise<TaskFile> {
    // Wait for any existing operations on this file
    const existingLock = this.locks.get(filePath);
    if (existingLock) {
      await existingLock;
    }

    // Create new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.locks.set(filePath, lockPromise);

    try {
      // Read and parse file
      const content = await fs.readFile(filePath, 'utf-8');
      const taskFile = JSON.parse(content) as TaskFile;
      return taskFile;
    } catch (error) {
      releaseLock!();
      this.locks.delete(filePath);
      throw new Error(
        `Failed to load task file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save task file atomically with backup
   */
  async saveWithBackup(filePath: string, taskFile: TaskFile): Promise<void> {
    try {
      // Update lastModified timestamp
      taskFile.lastModified = new Date().toISOString();

      // Create backup of existing file
      const backupPath = `${filePath}.backup-${Date.now()}`;
      if (await fs.pathExists(filePath)) {
        await fs.copy(filePath, backupPath);
      }

      // Write to temporary file first
      const tempPath = `${filePath}.tmp-${crypto.randomBytes(8).toString('hex')}`;
      const content = JSON.stringify(taskFile, null, 2);
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, filePath);

      // Clean up old backups (keep last 5)
      await this.cleanupBackups(filePath, 5);

      // Release lock
      this.locks.delete(filePath);
    } catch (error) {
      // Release lock on error
      this.locks.delete(filePath);
      throw new Error(
        `Failed to save task file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load task file without locking (read-only)
   */
  async load(filePath: string): Promise<TaskFile> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as TaskFile;
    } catch (error) {
      throw new Error(
        `Failed to load task file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate file exists and is readable
   */
  async validate(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file exists
      if (!(await fs.pathExists(filePath))) {
        return { valid: false, error: 'File does not exist' };
      }

      // Check file is readable
      await fs.access(filePath, fs.constants.R_OK);

      // Try to parse as JSON
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate basic structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        return { valid: false, error: 'Invalid task file structure: missing tasks array' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Clean up old backup files
   */
  private async cleanupBackups(filePath: string, keepCount: number): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath);
      const files = await fs.readdir(dir);

      // Find all backup files for this task file
      const backups = files
        .filter((f) => f.startsWith(`${basename}.backup-`))
        .map((f) => ({
          name: f,
          path: path.join(dir, f),
          time: parseInt(f.split('-').pop() || '0', 10),
        }))
        .sort((a, b) => b.time - a.time); // Sort newest first

      // Delete old backups
      const toDelete = backups.slice(keepCount);
      for (const backup of toDelete) {
        await fs.remove(backup.path);
      }
    } catch (error) {
      // Log but don't fail on backup cleanup errors
      console.warn(
        `Failed to cleanup backups: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Restore from latest backup
   */
  async restoreFromBackup(filePath: string): Promise<boolean> {
    try {
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath);
      const files = await fs.readdir(dir);

      // Find latest backup
      const backups = files
        .filter((f) => f.startsWith(`${basename}.backup-`))
        .map((f) => ({
          name: f,
          path: path.join(dir, f),
          time: parseInt(f.split('-').pop() || '0', 10),
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length === 0) {
        return false;
      }

      // Restore latest backup
      await fs.copy(backups[0].path, filePath, { overwrite: true });
      return true;
    } catch (error) {
      console.error(
        `Failed to restore from backup: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}
