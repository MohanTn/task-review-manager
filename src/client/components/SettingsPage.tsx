import React, { useState, useEffect, useCallback } from 'react';
import { SettingsAPI, RolePromptConfig, QueueSettings } from '../api/settings.api.js';
import styles from './SettingsPage.module.css';

const ROLE_LABELS: Record<string, string> = {
  productDirector: 'Product Director',
  architect: 'Architect',
  uiUxExpert: 'UI/UX Expert',
  securityOfficer: 'Security Officer',
  developer: 'Developer',
  codeReviewer: 'Code Reviewer',
  qa: 'QA Engineer',
};

const ROLE_ORDER = [
  'productDirector',
  'architect',
  'uiUxExpert',
  'securityOfficer',
  'developer',
  'codeReviewer',
  'qa',
];

interface EditState {
  systemPrompt: string;
  focusAreas: string;         // newline-separated for textarea
  researchInstructions: string;
  requiredOutputFields: string; // comma-separated for textarea
}

interface SaveState {
  status: 'idle' | 'saving' | 'success' | 'error';
  message?: string;
}

const SettingsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<RolePromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  // Queue settings state
  const [queueSettings, setQueueSettings] = useState<QueueSettings>({
    cronIntervalSeconds: 60,
    baseReposFolder: '',
    cliTool: 'claude',
    workerEnabled: false,
  });
  const [queueDraft, setQueueDraft] = useState<QueueSettings>({
    cronIntervalSeconds: 60,
    baseReposFolder: '',
    cliTool: 'claude',
    workerEnabled: false,
  });
  const [queueSaveState, setQueueSaveState] = useState<SaveState>({ status: 'idle' });

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, qSettings] = await Promise.all([
        SettingsAPI.getAllRolePrompts(),
        SettingsAPI.getQueueSettings(),
      ]);
      const sorted = ROLE_ORDER
        .map(id => data.find(p => p.roleId === id))
        .filter(Boolean) as RolePromptConfig[];
      setPrompts(sorted);

      // Initialise edit state from loaded data
      const initialEdits: Record<string, EditState> = {};
      for (const p of sorted) {
        initialEdits[p.roleId] = promptToEditState(p);
      }
      setEditStates(initialEdits);

      // Initialise queue settings
      setQueueSettings(qSettings);
      setQueueDraft(qSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  function promptToEditState(p: RolePromptConfig): EditState {
    return {
      systemPrompt: p.systemPrompt,
      focusAreas: p.focusAreas.join('\n'),
      researchInstructions: p.researchInstructions,
      requiredOutputFields: p.requiredOutputFields.join(', '),
    };
  }

  function editStateToPayload(edit: EditState) {
    return {
      systemPrompt: edit.systemPrompt,
      focusAreas: edit.focusAreas.split('\n').map(s => s.trim()).filter(Boolean),
      researchInstructions: edit.researchInstructions,
      requiredOutputFields: edit.requiredOutputFields.split(',').map(s => s.trim()).filter(Boolean),
    };
  }

  const updateEdit = (roleId: string, field: keyof EditState, value: string) => {
    setEditStates(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId], [field]: value },
    }));
  };

  const saveRole = async (roleId: string) => {
    const edit = editStates[roleId];
    if (!edit) return;

    setSaveStates(prev => ({ ...prev, [roleId]: { status: 'saving' } }));

    try {
      const updated = await SettingsAPI.updateRolePrompt(roleId, editStateToPayload(edit));
      setPrompts(prev => prev.map(p => p.roleId === roleId ? { ...p, ...updated, isCustom: true } : p));
      setSaveStates(prev => ({ ...prev, [roleId]: { status: 'success', message: 'Saved successfully' } }));
      setTimeout(() => setSaveStates(prev => ({ ...prev, [roleId]: { status: 'idle' } })), 3000);
    } catch (err) {
      setSaveStates(prev => ({
        ...prev,
        [roleId]: { status: 'error', message: err instanceof Error ? err.message : String(err) },
      }));
    }
  };

  const resetRole = async (roleId: string) => {
    if (!window.confirm(`Reset "${ROLE_LABELS[roleId] ?? roleId}" prompt to built-in default? This cannot be undone.`)) {
      return;
    }

    setSaveStates(prev => ({ ...prev, [roleId]: { status: 'saving' } }));

    try {
      const defaults = await SettingsAPI.resetRolePrompt(roleId);
      setPrompts(prev => prev.map(p => p.roleId === roleId ? { ...p, ...defaults, isCustom: false } : p));
      setEditStates(prev => ({ ...prev, [roleId]: promptToEditState({ ...defaults, roleId, isCustom: false, updatedAt: '' }) }));
      setSaveStates(prev => ({ ...prev, [roleId]: { status: 'success', message: 'Reset to default' } }));
      setTimeout(() => setSaveStates(prev => ({ ...prev, [roleId]: { status: 'idle' } })), 3000);
    } catch (err) {
      setSaveStates(prev => ({
        ...prev,
        [roleId]: { status: 'error', message: err instanceof Error ? err.message : String(err) },
      }));
    }
  };

  const toggleExpanded = (roleId: string) => {
    setExpanded(prev => (prev === roleId ? null : roleId));
  };

  const saveQueueSettings = async () => {
    setQueueSaveState({ status: 'saving' });
    try {
      const updated = await SettingsAPI.updateQueueSettings(queueDraft);
      setQueueSettings(updated);
      setQueueDraft(updated);
      setQueueSaveState({ status: 'success', message: 'Queue settings saved' });
      setTimeout(() => setQueueSaveState({ status: 'idle' }), 3000);
    } catch (err) {
      setQueueSaveState({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const queueHasChanges =
    queueDraft.cronIntervalSeconds !== queueSettings.cronIntervalSeconds ||
    queueDraft.baseReposFolder !== queueSettings.baseReposFolder ||
    queueDraft.cliTool !== queueSettings.cliTool ||
    queueDraft.workerEnabled !== queueSettings.workerEnabled;

  if (loading) {
    return (
      <div className={styles.container} role="main">
        <div className={styles.loading}>Loading role prompt settings…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container} role="main">
        <div className={styles.errorBanner} role="alert">
          Failed to load role prompts: {error}
          <button className={styles.retryBtn} onClick={loadPrompts}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} role="main" id="main-content">
      <div className={styles.header}>
        <h1 className={styles.title}>Role Prompt Settings</h1>
        <p className={styles.subtitle}>
          Customize the system prompts, focus areas, research instructions, and output fields for each pipeline role.
          Changes are persisted to the database and used by AI agents at runtime.
          <span className={styles.customBadge} aria-label="Custom prompts indicator">
            {prompts.filter(p => p.isCustom).length} custom
          </span>
        </p>
      </div>

      <div className={styles.roleList}>
        {prompts.map(prompt => {
          const edit = editStates[prompt.roleId];
          const save = saveStates[prompt.roleId] ?? { status: 'idle' };
          const isOpen = expanded === prompt.roleId;
          const isSaving = save.status === 'saving';

          return (
            <div
              key={prompt.roleId}
              className={`${styles.roleCard} ${prompt.isCustom ? styles.isCustom : ''} ${isOpen ? styles.isOpen : ''}`}
            >
              {/* Accordion header */}
              <button
                className={styles.roleHeader}
                onClick={() => toggleExpanded(prompt.roleId)}
                aria-expanded={isOpen}
                aria-controls={`role-panel-${prompt.roleId}`}
              >
                <div className={styles.roleHeaderLeft}>
                  <span className={styles.rolePhase} aria-label={`Phase: ${prompt.phase}`}>
                    {prompt.phase === 'review' ? '📋' : '⚙️'}
                  </span>
                  <span className={styles.roleName}>{ROLE_LABELS[prompt.roleId] ?? prompt.roleId}</span>
                  {prompt.isCustom && (
                    <span className={styles.customTag} aria-label="Custom prompt">modified</span>
                  )}
                </div>
                <span className={styles.chevron} aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Accordion body */}
              {isOpen && edit && (
                <div
                  id={`role-panel-${prompt.roleId}`}
                  className={styles.roleBody}
                  role="region"
                  aria-label={`${ROLE_LABELS[prompt.roleId] ?? prompt.roleId} prompt settings`}
                >
                  {/* System Prompt */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`systemPrompt-${prompt.roleId}`}>
                      System Prompt
                      <span className={styles.hint}>Markdown supported. Max 10,000 characters.</span>
                    </label>
                    <textarea
                      id={`systemPrompt-${prompt.roleId}`}
                      className={styles.textarea}
                      rows={14}
                      value={edit.systemPrompt}
                      onChange={e => updateEdit(prompt.roleId, 'systemPrompt', e.target.value)}
                      aria-label={`System prompt for ${ROLE_LABELS[prompt.roleId]}`}
                      maxLength={10000}
                      disabled={isSaving}
                    />
                    <div className={styles.charCount}>{edit.systemPrompt.length.toLocaleString()} / 10,000</div>
                  </div>

                  {/* Focus Areas */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`focusAreas-${prompt.roleId}`}>
                      Focus Areas
                      <span className={styles.hint}>One item per line.</span>
                    </label>
                    <textarea
                      id={`focusAreas-${prompt.roleId}`}
                      className={`${styles.textarea} ${styles.textareaSmall}`}
                      rows={5}
                      value={edit.focusAreas}
                      onChange={e => updateEdit(prompt.roleId, 'focusAreas', e.target.value)}
                      aria-label={`Focus areas for ${ROLE_LABELS[prompt.roleId]}`}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Research Instructions */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`researchInstructions-${prompt.roleId}`}>
                      Research Instructions
                      <span className={styles.hint}>Max 2,000 characters.</span>
                    </label>
                    <textarea
                      id={`researchInstructions-${prompt.roleId}`}
                      className={`${styles.textarea} ${styles.textareaSmall}`}
                      rows={4}
                      value={edit.researchInstructions}
                      onChange={e => updateEdit(prompt.roleId, 'researchInstructions', e.target.value)}
                      aria-label={`Research instructions for ${ROLE_LABELS[prompt.roleId]}`}
                      maxLength={2000}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Required Output Fields */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`requiredOutputFields-${prompt.roleId}`}>
                      Required Output Fields
                      <span className={styles.hint}>Comma-separated field names (e.g. marketAnalysis, competitorAnalysis).</span>
                    </label>
                    <input
                      id={`requiredOutputFields-${prompt.roleId}`}
                      type="text"
                      className={styles.input}
                      value={edit.requiredOutputFields}
                      onChange={e => updateEdit(prompt.roleId, 'requiredOutputFields', e.target.value)}
                      aria-label={`Required output fields for ${ROLE_LABELS[prompt.roleId]}`}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Action buttons + status */}
                  <div className={styles.actions}>
                    <button
                      className={styles.saveBtn}
                      onClick={() => saveRole(prompt.roleId)}
                      disabled={isSaving}
                      aria-busy={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      className={styles.resetBtn}
                      onClick={() => resetRole(prompt.roleId)}
                      disabled={isSaving}
                      title="Restore this role's prompt to the built-in default"
                    >
                      Reset to Default
                    </button>

                    {save.status === 'success' && (
                      <span className={styles.successMsg} role="status">✓ {save.message}</span>
                    )}
                    {save.status === 'error' && (
                      <span className={styles.errorMsg} role="alert">✗ {save.message}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Queue & Worker Configuration ── */}
      <hr className={styles.sectionDivider} />

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Queue &amp; Worker Configuration</h2>
        <p className={styles.sectionSubtitle}>
          Configure the cron job interval, CLI tool, and base repository folder for the
          automated development queue worker.
        </p>
      </div>

      <div className={styles.queueCard}>
        <div className={styles.queueGrid}>
          {/* Worker Enabled */}
          <div className={styles.queueField}>
            <span className={styles.queueLabel}>Worker Enabled</span>
            <div className={styles.toggleRow}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleCheckbox}
                  checked={queueDraft.workerEnabled}
                  onChange={e => setQueueDraft(prev => ({ ...prev, workerEnabled: e.target.checked }))}
                  disabled={queueSaveState.status === 'saving'}
                  aria-label="Enable queue worker"
                />
                <span className={styles.toggleSlider} />
              </label>
              <span className={styles.toggleLabel}>
                {queueDraft.workerEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Cron Interval */}
          <div className={styles.queueField}>
            <label className={styles.queueLabel} htmlFor="cronInterval">
              Cron Interval (seconds)
            </label>
            <span className={styles.queueHint}>How often the scanner checks for new tasks (30–3600)</span>
            <input
              id="cronInterval"
              type="number"
              className={styles.numberInput}
              min={30}
              max={3600}
              step={1}
              value={queueDraft.cronIntervalSeconds}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setQueueDraft(prev => ({ ...prev, cronIntervalSeconds: val }));
              }}
              disabled={queueSaveState.status === 'saving'}
              aria-label="Cron interval in seconds"
            />
          </div>

          {/* CLI Tool */}
          <div className={styles.queueField}>
            <label className={styles.queueLabel} htmlFor="cliTool">
              CLI Tool
            </label>
            <span className={styles.queueHint}>
              Which AI CLI to use for automated task execution
            </span>
            <select
              id="cliTool"
              className={styles.selectInput}
              value={queueDraft.cliTool}
              onChange={e => setQueueDraft(prev => ({ ...prev, cliTool: e.target.value as 'claude' | 'copilot' }))}
              disabled={queueSaveState.status === 'saving'}
              aria-label="CLI tool selection"
            >
              <option value="claude">Claude Code CLI</option>
              <option value="copilot">Copilot CLI</option>
            </select>
          </div>

          {/* Base Repos Folder */}
          <div className={`${styles.queueField} ${styles.fullWidth}`}>
            <label className={styles.queueLabel} htmlFor="baseReposFolder">
              Base Repos Folder
            </label>
            <span className={styles.queueHint}>
              Absolute path to the directory containing all repository checkouts (e.g. /home/user/repos)
            </span>
            <input
              id="baseReposFolder"
              type="text"
              className={styles.input}
              value={queueDraft.baseReposFolder}
              onChange={e => setQueueDraft(prev => ({ ...prev, baseReposFolder: e.target.value }))}
              placeholder="/home/user/repos"
              disabled={queueSaveState.status === 'saving'}
              aria-label="Base repositories folder path"
            />
          </div>
        </div>

        {/* Save button & feedback */}
        <div className={styles.queueActions}>
          <button
            className={styles.saveBtn}
            onClick={saveQueueSettings}
            disabled={queueSaveState.status === 'saving' || !queueHasChanges}
            aria-busy={queueSaveState.status === 'saving'}
          >
            {queueSaveState.status === 'saving' ? 'Saving…' : 'Save Queue Settings'}
          </button>

          {queueSaveState.status === 'success' && (
            <span className={styles.successMsg} role="status">✓ {queueSaveState.message}</span>
          )}
          {queueSaveState.status === 'error' && (
            <span className={styles.errorMsg} role="alert">✗ {queueSaveState.message}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
