/**
 * Settings routes - Role Prompts configuration CRUD
 */
import { Router, Request, Response } from 'express';
import { AIConductor } from '../../AIConductor.js';
import { PipelineRole } from '../../types.js';

const VALID_ROLES: PipelineRole[] = [
  'productDirector',
  'architect',
  'uiUxExpert',
  'securityOfficer',
  'developer',
  'codeReviewer',
  'qa',
];

const MAX_SYSTEM_PROMPT_LENGTH = 10_000;
const MAX_FIELD_LENGTH = 2_000;

function isValidRole(roleId: string): roleId is PipelineRole {
  return VALID_ROLES.includes(roleId as PipelineRole);
}

export function createSettingsRoutes(reviewManager: AIConductor): Router {
  const router = Router();

  /**
   * GET /api/settings/role-prompts
   * Returns all 7 role prompt configs from the database.
   */
  router.get('/settings/role-prompts', (_req: Request, res: Response): void => {
    try {
      const prompts = reviewManager.getAllRolePrompts();
      res.json({ success: true, rolePrompts: prompts });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/settings/role-prompts/:roleId
   * Returns the prompt config for one role.
   */
  router.get('/settings/role-prompts/:roleId', (req: Request, res: Response): void => {
    const roleId = req.params['roleId'] as string;

    if (!isValidRole(roleId)) {
      res.status(400).json({ success: false, error: `Invalid roleId: ${roleId}` });
      return;
    }

    try {
      const prompt = reviewManager.getRolePrompt(roleId);
      res.json({ success: true, roleId, ...prompt });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * PUT /api/settings/role-prompts/:roleId
   * Updates one or more fields of a role's prompt config.
   * Body: { systemPrompt?, focusAreas?, researchInstructions?, requiredOutputFields? }
   */
  router.put('/settings/role-prompts/:roleId', (req: Request, res: Response): void => {
    const roleId = req.params['roleId'] as string;

    if (!isValidRole(roleId)) {
      res.status(400).json({ success: false, error: `Invalid roleId: ${roleId}` });
      return;
    }

    const { systemPrompt, focusAreas, researchInstructions, requiredOutputFields } = req.body;

    // Validate lengths
    if (systemPrompt !== undefined && systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      res.status(400).json({ success: false, error: `systemPrompt exceeds max length of ${MAX_SYSTEM_PROMPT_LENGTH} chars` });
      return;
    }
    if (researchInstructions !== undefined && researchInstructions.length > MAX_FIELD_LENGTH) {
      res.status(400).json({ success: false, error: `researchInstructions exceeds max length of ${MAX_FIELD_LENGTH} chars` });
      return;
    }
    if (focusAreas !== undefined && !Array.isArray(focusAreas)) {
      res.status(400).json({ success: false, error: 'focusAreas must be an array of strings' });
      return;
    }
    if (requiredOutputFields !== undefined && !Array.isArray(requiredOutputFields)) {
      res.status(400).json({ success: false, error: 'requiredOutputFields must be an array of strings' });
      return;
    }

    try {
      reviewManager.updateRolePrompt(roleId, { systemPrompt, focusAreas, researchInstructions, requiredOutputFields });
      const updated = reviewManager.getRolePrompt(roleId);
      res.json({ success: true, roleId, ...updated });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/settings/role-prompts/:roleId/reset
   * Resets a role's prompt to the built-in static default.
   */
  router.post('/settings/role-prompts/:roleId/reset', (req: Request, res: Response): void => {
    const roleId = req.params['roleId'] as string;

    if (!isValidRole(roleId)) {
      res.status(400).json({ success: false, error: `Invalid roleId: ${roleId}` });
      return;
    }

    try {
      const defaults = reviewManager.resetRolePrompt(roleId);
      res.json({ success: true, roleId, ...defaults });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
