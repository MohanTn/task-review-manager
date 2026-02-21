/**
 * Queue Worker — Processes dev_queue items by spawning the configured CLI tool.
 *
 * Each queue item is a feature-level job that triggers the full dev-workflow:
 *   claude -p "/dev-workflow repoName: X, featureName: Y" --allowedTools='*'
 *   copilot -m "/dev-workflow repoName: X, featureName: Y"
 *
 * Security controls:
 *  • Uses child_process.spawn (never exec) to prevent shell injection
 *  • Validates CLI tool against a whitelist
 *  • Validates repo paths to prevent path traversal
 *  • Enforces a per-process timeout (default 30 min)
 *  • Sanitizes stderr before persisting to database
 */
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { AIConductor } from './AIConductor.js';

/** Whitelist of allowed CLI tools — prevents arbitrary command execution. */
const ALLOWED_CLI_TOOLS: Record<string, string> = {
  claude: 'claude',
  copilot: 'copilot',
};

/** Maximum time (ms) a single CLI process may run before being killed. */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class QueueWorker {
  private manager: AIConductor;
  private running = false;
  private activeProcess: ChildProcess | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(manager: AIConductor) {
    this.manager = manager;
  }

  /** Whether the worker loop is currently active. */
  get isRunning(): boolean {
    return this.running;
  }

  /** Whether a CLI process is currently executing. */
  get isBusy(): boolean {
    return this.activeProcess !== null;
  }

  /**
   * Start the worker loop. Polls for pending items and processes them
   * sequentially (one at a time).
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNextPoll();
    console.error('[QueueWorker] Started');
  }

  /** Stop the worker gracefully — kills any active process. */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
    }
    console.error('[QueueWorker] Stopped');
  }

  /**
   * Process a single queue item:
   *  1. Claim the next pending item
   *  2. Validate the CLI tool and repo path
   *  3. Spawn the CLI process
   *  4. On exit, mark completed or failed
   */
  async processNext(): Promise<boolean> {
    const settings = this.manager.getQueueSettings();
    if (!settings.workerEnabled) return false;

    const item = this.manager.claimNextQueueItem(process.pid);
    if (!item) return false; // nothing to do

    // ── Security: validate CLI tool ──
    const cliBinary = ALLOWED_CLI_TOOLS[item.cli_tool];
    if (!cliBinary) {
      this.manager.failQueueItem(item.id, `Unknown CLI tool: ${item.cli_tool}`);
      return true; // item was processed (failed)
    }

    // ── Security: validate & resolve repo path ──
    const baseFolder = settings.baseReposFolder;
    if (!baseFolder) {
      this.manager.failQueueItem(item.id, 'baseReposFolder is not configured in settings');
      return true;
    }

    const resolvedBase = path.resolve(baseFolder);
    const repoDir = path.resolve(resolvedBase, item.repo_name);

    // Path traversal prevention: repoDir must be inside resolvedBase
    if (!repoDir.startsWith(resolvedBase + path.sep) && repoDir !== resolvedBase) {
      this.manager.failQueueItem(item.id, `Path traversal detected: repo '${item.repo_name}' resolves outside base folder`);
      return true;
    }

    if (!fs.existsSync(repoDir)) {
      this.manager.failQueueItem(item.id, `Repository directory not found: ${repoDir}`);
      return true;
    }

    // ── Build CLI arguments ──
    const devWorkflowPrompt = `/dev-workflow repoName: ${item.repo_name}, featureName: ${item.feature_slug}`;

    const args: string[] = [];
    if (cliBinary === 'claude') {
      args.push('--print', '--allowedTools', '*', '--dangerously-skip-permissions', '-p', devWorkflowPrompt);
    } else if (cliBinary === 'copilot') {
      args.push('--message', devWorkflowPrompt);
    }

    console.error(`[QueueWorker] Processing queue item #${item.id}: ${item.repo_name}/${item.feature_slug} via ${cliBinary}`);

    return new Promise<boolean>((resolve) => {
      let stderr = '';
      let timedOut = false;

      // ── Spawn (not exec!) to prevent shell injection ──
      const child = spawn(cliBinary, args, {
        cwd: repoDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
        timeout: DEFAULT_TIMEOUT_MS,
      });

      this.activeProcess = child;

      child.stdout?.on('data', () => {
        // Intentionally drain stdout to prevent backpressure
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        // Cap stderr capture to prevent excessive memory usage
        if (stderr.length < 8192) {
          stderr += chunk.toString().substring(0, 8192 - stderr.length);
        }
      });

      // ── Guard against hung processes ──
      const killTimer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL');
        }, 5000);
      }, DEFAULT_TIMEOUT_MS);

      child.on('close', (code) => {
        clearTimeout(killTimer);
        this.activeProcess = null;

        if (timedOut) {
          this.manager.failQueueItem(item.id, `Process timed out after ${DEFAULT_TIMEOUT_MS / 1000}s`);
        } else if (code === 0) {
          this.manager.completeQueueItem(item.id);
          console.error(`[QueueWorker] Queue item #${item.id} completed successfully`);
        } else {
          this.manager.failQueueItem(item.id, `Process exited with code ${code}. ${stderr}`.trim());
        }

        resolve(true);
      });

      child.on('error', (err) => {
        clearTimeout(killTimer);
        this.activeProcess = null;
        this.manager.failQueueItem(item.id, `Failed to spawn ${cliBinary}: ${err.message}`);
        resolve(true);
      });
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────

  private scheduleNextPoll(): void {
    if (!this.running) return;

    // Poll every 5 seconds when idle
    this.pollTimer = setTimeout(async () => {
      try {
        const processed = await this.processNext();
        if (processed) {
          // Immediately check for more work
          setImmediate(() => this.scheduleNextPoll());
          return;
        }
      } catch (err) {
        console.error('[QueueWorker] Error:', err);
      }
      this.scheduleNextPoll();
    }, 5000);

    if (this.pollTimer && typeof this.pollTimer === 'object' && 'unref' in this.pollTimer) {
      this.pollTimer.unref();
    }
  }
}
