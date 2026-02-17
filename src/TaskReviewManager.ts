/**
 * TaskReviewManager - Core business logic for task review operations
 */
import {
  ReviewInput,
  ReviewResult,
  TaskStatusResult,
  ReviewSummary,
  ValidationResult,
  Transition,
  TaskStatus,
  StakeholderRole,
  PipelineRole,
  Task,
  TransitionTaskInput,
  TransitionTaskResult,
  GetNextTaskInput,
  GetNextTaskResult,
  GetNextStepInput,
  GetNextStepResult,
  UpdateAcceptanceCriteriaInput,
  UpdateAcceptanceCriteriaResult,
  GetTasksByStatusInput,
  GetTasksByStatusResult,
  VerifyAllTasksCompleteInput,
  VerifyAllTasksCompleteResult,
  CreateFeatureInput,
  CreateFeatureResult,
  AddTaskInput,
  AddTaskResult,
  ListFeaturesResult,
  DeleteFeatureResult,
  GetFeatureResult,
  UpdateTaskInput,
  UpdateTaskResult,
  DeleteTaskResult,
  RegisterRepoInput,
  RegisterRepoResult,
  ListReposResult,
  GetCurrentRepoResult,
  UpdateRefinementStepInput,
  UpdateRefinementStepResult,
  AddFeatureAcceptanceCriteriaInput,
  AddFeatureAcceptanceCriteriaResult,
  AddFeatureTestScenariosInput,
  AddFeatureTestScenariosResult,
  AddClarificationInput,
  AddClarificationResult,
  AddAttachmentAnalysisInput,
  AddAttachmentAnalysisResult,
  GetRefinementStatusInput,
  GetRefinementStatusResult,
  GenerateRefinementReportInput,
  GenerateRefinementReportResult,
} from './types.js';
import { DatabaseHandler } from './DatabaseHandler.js';
import { WorkflowValidator } from './WorkflowValidator.js';
import { ROLE_SYSTEM_PROMPTS } from './rolePrompts.js';

export class TaskReviewManager {
  private dbHandler: DatabaseHandler;
  private validator: WorkflowValidator;

  constructor(workspaceRoot?: string, dbPath?: string) {
    this.dbHandler = new DatabaseHandler(workspaceRoot, dbPath);
    this.validator = new WorkflowValidator();
  }

  /**
   * Add a stakeholder review to a task
   */
  async addReview(input: ReviewInput): Promise<ReviewResult> {
    try {
      // 1. Validate file exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug, input.repoName);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      // 2. Load task file with lock
      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug, input.repoName);

      // 3. Find specific task
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // 4. Validate task structure
      const structureValidation = this.validator.validateTaskStructure(task);
      if (!structureValidation.valid) {
        throw new Error(
          `Invalid task structure: ${structureValidation.errors.join(', ')}`
        );
      }

      // 5. Validate workflow state
      const validation = this.validator.validate(
        task.status,
        input.stakeholder,
        input.decision
      );

      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 6. Calculate new status
      const previousStatus = task.status;
      const newStatus =
        input.decision === 'approve'
          ? this.getApprovalStatus(task.status)
          : 'NeedsRefinement';

      // 7. Build transition record
      const transition: Transition = {
        from: previousStatus,
        to: newStatus as TaskStatus,
        approver: input.stakeholder,
        timestamp: new Date().toISOString(),
        notes: input.notes,
      };

      // 8. Update stakeholder review section
      const reviewData = {
        approved: input.decision === 'approve',
        notes: input.notes,
      };

      // Add role-specific fields
      if (input.stakeholder === 'productDirector') {
        task.stakeholderReview.productDirector = {
          ...reviewData,
          marketAnalysis: input.additionalFields?.marketAnalysis,
          competitorAnalysis: input.additionalFields?.competitorAnalysis,
        };
      } else if (input.stakeholder === 'architect') {
        task.stakeholderReview.architect = {
          ...reviewData,
          technologyRecommendations: input.additionalFields?.technologyRecommendations,
          designPatterns: input.additionalFields?.designPatterns,
        };
      } else if (input.stakeholder === 'uiUxExpert') {
        task.stakeholderReview.uiUxExpert = {
          ...reviewData,
          usabilityFindings: input.additionalFields?.usabilityFindings,
          accessibilityRequirements: input.additionalFields?.accessibilityRequirements,
          userBehaviorInsights: input.additionalFields?.userBehaviorInsights,
        };
      } else if (input.stakeholder === 'securityOfficer') {
        task.stakeholderReview.securityOfficer = {
          ...reviewData,
          securityRequirements: input.additionalFields?.securityRequirements,
          complianceNotes: input.additionalFields?.complianceNotes,
        };
      } else {
        (task.stakeholderReview as any)[input.stakeholder] = reviewData;
      }

      // 9. Update task object
      task.status = newStatus as TaskStatus;
      task.transitions.push(transition);

      // 10. Save atomically
      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile, input.repoName);

      return {
        success: true,
        taskId: input.taskId,
        previousStatus,
        newStatus: newStatus as TaskStatus,
        transition,
        message: validation.warnings.length > 0
          ? `Review recorded with warnings: ${validation.warnings.join(', ')}`
          : 'Review recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        previousStatus: 'PendingProductDirector' as TaskStatus,
        newStatus: 'PendingProductDirector' as TaskStatus,
        transition: {
          from: 'PendingProductDirector' as TaskStatus,
          to: 'PendingProductDirector' as TaskStatus,
          approver: input.stakeholder,
          timestamp: new Date().toISOString(),
          notes: '',
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get status of a specific task
   */
  async getTaskStatus(repoName: string, featureSlug: string, taskId: string): Promise<TaskStatusResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug, repoName);

      const task = taskFile.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const progress = this.validator.getReviewProgress(task);
      const allowedTransitions = this.validator.getAllowedTransitions(task.status);

      return {
        taskId: task.taskId,
        status: task.status,
        currentStakeholder: progress.currentStakeholder,
        completedReviews: progress.completed,
        pendingReviews: progress.pending,
        canTransitionTo: allowedTransitions,
        orderOfExecution: task.orderOfExecution,
      };
    } catch (error) {
      throw new Error(
        `Failed to get task status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate review summary for all tasks
   */
  async getReviewSummary(repoName: string, featureSlug: string): Promise<ReviewSummary> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug, repoName);

      // Count tasks by status
      const tasksByStatus: Record<TaskStatus, number> = {
        PendingProductDirector: 0,
        PendingArchitect: 0,
        PendingUiUxExpert: 0,
        PendingSecurityOfficer: 0,
        ReadyForDevelopment: 0,
        NeedsRefinement: 0,
        ToDo: 0,
        InProgress: 0,
        InReview: 0,
        InQA: 0,
        NeedsChanges: 0,
        Done: 0,
      };

      // Track stakeholder progress
      const stakeholderProgress = {
        productDirector: { completed: 0, pending: 0 },
        architect: { completed: 0, pending: 0 },
        uiUxExpert: { completed: 0, pending: 0 },
        securityOfficer: { completed: 0, pending: 0 },
      };

      // Analyze each task
      const taskSummaries = taskFile.tasks.map((task) => {
        tasksByStatus[task.status]++;

        const progress = this.validator.getReviewProgress(task);

        // Update stakeholder progress
        for (const stakeholder of progress.completed) {
          stakeholderProgress[stakeholder].completed++;
        }
        for (const stakeholder of progress.pending) {
          stakeholderProgress[stakeholder].pending++;
        }

        return {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          estimatedHours: task.estimatedHours,
          orderOfExecution: task.orderOfExecution,
        };
      });

      // Calculate completion percentage
      const completedTasks = tasksByStatus.ReadyForDevelopment;
      const totalTasks = taskFile.tasks.length;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        featureSlug: taskFile.featureSlug,
        featureName: taskFile.featureName,
        totalTasks,
        tasksByStatus,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        stakeholderProgress,
        tasks: taskSummaries,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate review summary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate workflow before performing a review
   */
  async validateWorkflow(
    repoName: string,
    featureSlug: string,
    taskId: string,
    stakeholder: StakeholderRole
  ): Promise<ValidationResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug, repoName);

      const task = taskFile.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      return this.validator.validate(task.status, stakeholder, 'approve');
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        currentStatus: 'PendingProductDirector',
        expectedStakeholder: null,
        allowedTransitions: [],
      };
    }
  }

  /**
   * Helper to get approval status for each stage
   */
  private getApprovalStatus(currentStatus: TaskStatus): TaskStatus {
    const statusMap: Record<TaskStatus, TaskStatus> = {
      PendingProductDirector: 'PendingArchitect',
      PendingArchitect: 'PendingUiUxExpert',
      PendingUiUxExpert: 'PendingSecurityOfficer',
      PendingSecurityOfficer: 'ReadyForDevelopment',
      ReadyForDevelopment: 'ReadyForDevelopment',
      NeedsRefinement: 'NeedsRefinement',
      ToDo: 'ToDo',
      InProgress: 'InProgress',
      InReview: 'InReview',
      InQA: 'InQA',
      NeedsChanges: 'NeedsChanges',
      Done: 'Done',
    };
    return statusMap[currentStatus];
  }

  /**
   * Get the next step in the pipeline for a task.
   * Returns the role, system prompt, allowed decisions, and context.
   */
  async getNextStep(input: GetNextStepInput): Promise<GetNextStepResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug, input.repoName);
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      const status = task.status;

      // Map current status to the pipeline role that should act
      const roleMapping: Record<TaskStatus, PipelineRole | null> = {
        PendingProductDirector: 'productDirector',
        PendingArchitect: 'architect',
        PendingUiUxExpert: 'uiUxExpert',
        PendingSecurityOfficer: 'securityOfficer',
        ReadyForDevelopment: 'developer',
        ToDo: 'developer',
        InProgress: 'developer',
        InReview: 'codeReviewer',
        InQA: 'qa',
        NeedsChanges: 'developer',
        NeedsRefinement: 'productDirector',
        Done: null,
      };

      const nextRole = roleMapping[status];
      if (!nextRole) {
        return {
          success: true,
          taskId: input.taskId,
          currentStatus: status,
          phase: 'execution',
          nextRole: 'qa',
          systemPrompt: '',
          allowedDecisions: [],
          transitionOnSuccess: 'Done',
          transitionOnFailure: 'Done',
          focusAreas: [],
          researchInstructions: '',
          requiredOutputFields: [],
          previousRoleNotes: {},
          message: 'Task is complete. No further steps.',
        };
      }

      const roleConfig = ROLE_SYSTEM_PROMPTS[nextRole];

      // Determine transitions based on current status
      const { transitionOnSuccess, transitionOnFailure, allowedDecisions } =
        this.getTransitionsForStatus(status);

      // Gather previous role notes for context
      const previousRoleNotes = this.gatherPreviousNotes(task);

      // Build context-enhanced system prompt
      const contextualPrompt = this.buildContextualPrompt(
        roleConfig.systemPrompt, task, previousRoleNotes
      );

      return {
        success: true,
        taskId: input.taskId,
        currentStatus: status,
        phase: roleConfig.phase,
        nextRole,
        systemPrompt: contextualPrompt,
        allowedDecisions,
        transitionOnSuccess,
        transitionOnFailure,
        focusAreas: roleConfig.focusAreas,
        researchInstructions: roleConfig.researchInstructions,
        requiredOutputFields: roleConfig.requiredOutputFields,
        previousRoleNotes,
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        currentStatus: 'PendingProductDirector',
        phase: 'review',
        nextRole: 'productDirector',
        systemPrompt: '',
        allowedDecisions: [],
        transitionOnSuccess: 'PendingProductDirector',
        transitionOnFailure: 'PendingProductDirector',
        focusAreas: [],
        researchInstructions: '',
        requiredOutputFields: [],
        previousRoleNotes: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get transition targets for a given status
   */
  private getTransitionsForStatus(status: TaskStatus): {
    transitionOnSuccess: TaskStatus;
    transitionOnFailure: TaskStatus;
    allowedDecisions: string[];
  } {
    const map: Record<TaskStatus, { transitionOnSuccess: TaskStatus; transitionOnFailure: TaskStatus; allowedDecisions: string[] }> = {
      PendingProductDirector: { transitionOnSuccess: 'PendingArchitect', transitionOnFailure: 'NeedsRefinement', allowedDecisions: ['approve', 'reject'] },
      PendingArchitect: { transitionOnSuccess: 'PendingUiUxExpert', transitionOnFailure: 'NeedsRefinement', allowedDecisions: ['approve', 'reject'] },
      PendingUiUxExpert: { transitionOnSuccess: 'PendingSecurityOfficer', transitionOnFailure: 'NeedsRefinement', allowedDecisions: ['approve', 'reject'] },
      PendingSecurityOfficer: { transitionOnSuccess: 'ReadyForDevelopment', transitionOnFailure: 'NeedsRefinement', allowedDecisions: ['approve', 'reject'] },
      NeedsRefinement: { transitionOnSuccess: 'PendingProductDirector', transitionOnFailure: 'PendingProductDirector', allowedDecisions: ['restart'] },
      ReadyForDevelopment: { transitionOnSuccess: 'ToDo', transitionOnFailure: 'ToDo', allowedDecisions: ['start'] },
      ToDo: { transitionOnSuccess: 'InProgress', transitionOnFailure: 'InProgress', allowedDecisions: ['start'] },
      InProgress: { transitionOnSuccess: 'InReview', transitionOnFailure: 'InProgress', allowedDecisions: ['submitForReview'] },
      InReview: { transitionOnSuccess: 'InQA', transitionOnFailure: 'NeedsChanges', allowedDecisions: ['approve', 'reject'] },
      InQA: { transitionOnSuccess: 'Done', transitionOnFailure: 'NeedsChanges', allowedDecisions: ['approve', 'reject'] },
      NeedsChanges: { transitionOnSuccess: 'InProgress', transitionOnFailure: 'InProgress', allowedDecisions: ['startFix'] },
      Done: { transitionOnSuccess: 'Done', transitionOnFailure: 'Done', allowedDecisions: [] },
    };
    return map[status];
  }

  /**
   * Gather notes from all previous roles for context
   */
  private gatherPreviousNotes(task: Task): Record<string, string> {
    const notes: Record<string, string> = {};
    if (task.stakeholderReview.productDirector?.notes) {
      notes.productDirector = task.stakeholderReview.productDirector.notes;
    }
    if (task.stakeholderReview.architect?.notes) {
      notes.architect = task.stakeholderReview.architect.notes;
    }
    if (task.stakeholderReview.uiUxExpert?.notes) {
      notes.uiUxExpert = task.stakeholderReview.uiUxExpert.notes;
    }
    if (task.stakeholderReview.securityOfficer?.notes) {
      notes.securityOfficer = task.stakeholderReview.securityOfficer.notes;
    }
    return notes;
  }

  /**
   * Build a context-enhanced system prompt with task details
   */
  private buildContextualPrompt(
    basePrompt: string,
    task: Task,
    previousNotes: Record<string, string>
  ): string {
    let contextBlock = `\n\n## Task Context\n`;
    contextBlock += `- **Task ID**: ${task.taskId}\n`;
    contextBlock += `- **Title**: ${task.title}\n`;
    contextBlock += `- **Description**: ${task.description}\n`;
    contextBlock += `- **Current Status**: ${task.status}\n`;

    if (task.acceptanceCriteria.length > 0) {
      contextBlock += `\n## Acceptance Criteria\n`;
      for (const ac of task.acceptanceCriteria) {
        contextBlock += `- [${ac.verified ? 'x' : ' '}] (${ac.priority}) ${ac.criterion}\n`;
      }
    }

    if (task.testScenarios && task.testScenarios.length > 0) {
      contextBlock += `\n## Test Scenarios\n`;
      for (const ts of task.testScenarios) {
        contextBlock += `- **${ts.id}** (${ts.priority}): ${ts.title} - ${ts.description}\n`;
      }
    }

    if (Object.keys(previousNotes).length > 0) {
      contextBlock += `\n## Previous Stakeholder Notes\n`;
      for (const [role, note] of Object.entries(previousNotes)) {
        contextBlock += `### ${role}\n${note}\n\n`;
      }
    }

    return basePrompt + contextBlock;
  }

  /**
   * Transition task to a new status (for development workflow)
   */
  async transitionTaskStatus(input: TransitionTaskInput): Promise<TransitionTaskResult> {
    try {
      // 1. Validate file exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug, input.repoName);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      // 2. Load task file with lock
      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug, input.repoName);

      // 3. Find specific task
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // 4. Validate current status matches expected
      if (task.status !== input.fromStatus) {
        throw new Error(
          `Task status mismatch. Expected '${input.fromStatus}', but task is in '${task.status}'`
        );
      }

      // 5. Validate development workflow transition
      const validation = this.validator.validateDevTransition(
        input.fromStatus,
        input.toStatus,
        input.actor
      );

      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 6. Build transition record
      const transition: Transition = {
        from: input.fromStatus,
        to: input.toStatus,
        actor: input.actor,
        timestamp: new Date().toISOString(),
        notes: input.notes,
        ...input.metadata,
      };

      // 7. Update task
      task.status = input.toStatus;
      task.transitions.push(transition);

      // 8. Save atomically
      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile, input.repoName);

      return {
        success: true,
        taskId: input.taskId,
        previousStatus: input.fromStatus,
        newStatus: input.toStatus,
        transition,
        message:
          validation.warnings.length > 0
            ? `Transition recorded with warnings: ${validation.warnings.join(', ')}`
            : 'Transition recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        previousStatus: input.fromStatus,
        newStatus: input.fromStatus,
        transition: {
          from: input.fromStatus,
          to: input.fromStatus,
          actor: input.actor,
          timestamp: new Date().toISOString(),
          notes: '',
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get next task to work on based on status filter and orderOfExecution
   */
  async getNextTask(input: GetNextTaskInput): Promise<GetNextTaskResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug, input.repoName);

      const filteredTasks = taskFile.tasks.filter((t) =>
        input.statusFilter.includes(t.status)
      );

      if (filteredTasks.length === 0) {
        return {
          success: true,
          task: undefined,
          message: `No tasks found with status: ${input.statusFilter.join(', ')}`,
        };
      }

      const sortedTasks = filteredTasks.sort((a, b) => a.orderOfExecution - b.orderOfExecution);
      const nextTask = sortedTasks[0];

      return {
        success: true,
        task: nextTask,
        message: `Found task ${nextTask.taskId} with orderOfExecution ${nextTask.orderOfExecution}`,
      };
    } catch (error) {
      return {
        success: false,
        task: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update acceptance criteria verification status
   */
  async updateAcceptanceCriteria(
    input: UpdateAcceptanceCriteriaInput
  ): Promise<UpdateAcceptanceCriteriaResult> {
    try {
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug, input.repoName);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug, input.repoName);

      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      const criterion = task.acceptanceCriteria.find((ac) => ac.id === input.criterionId);
      if (!criterion) {
        throw new Error(
          `Acceptance criterion not found: ${input.criterionId} in task ${input.taskId}`
        );
      }

      criterion.verified = input.verified;

      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile, input.repoName);

      return {
        success: true,
        taskId: input.taskId,
        criterionId: input.criterionId,
        verified: input.verified,
        message: `Acceptance criterion ${input.criterionId} marked as ${input.verified ? 'verified' : 'unverified'}`,
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        criterionId: input.criterionId,
        verified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all tasks with a specific status
   */
  async getTasksByStatus(input: GetTasksByStatusInput): Promise<GetTasksByStatusResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug, input.repoName);

      const tasks = taskFile.tasks.filter((t) => t.status === input.status);

      return {
        success: true,
        tasks,
        count: tasks.length,
        message: `Found ${tasks.length} task(s) with status '${input.status}'`,
      };
    } catch (error) {
      return {
        success: false,
        tasks: [],
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify all tasks are complete
   */
  async verifyAllTasksComplete(
    input: VerifyAllTasksCompleteInput
  ): Promise<VerifyAllTasksCompleteResult> {
    try {
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug, input.repoName);

      const totalTasks = taskFile.tasks.length;
      const completedTasks = taskFile.tasks.filter((t) => t.status === 'Done').length;
      const incompleteTasks = taskFile.tasks
        .filter((t) => t.status !== 'Done')
        .map((t) => ({
          taskId: t.taskId,
          title: t.title,
          status: t.status,
        }));

      const allComplete = completedTasks === totalTasks;

      return {
        success: true,
        allComplete,
        totalTasks,
        completedTasks,
        incompleteTasks,
        message: allComplete
          ? 'All tasks are complete!'
          : `${completedTasks}/${totalTasks} tasks complete. ${incompleteTasks.length} task(s) remaining.`,
      };
    } catch (error) {
      return {
        success: false,
        allComplete: false,
        totalTasks: 0,
        completedTasks: 0,
        incompleteTasks: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new feature
   */
  async createFeature(input: CreateFeatureInput): Promise<CreateFeatureResult> {
    try {
      this.dbHandler.createFeature(input.featureSlug, input.featureName, input.repoName);
      return {
        success: true,
        featureSlug: input.featureSlug,
        message: `Feature '${input.featureName}' created with slug '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        featureSlug: input.featureSlug,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a task to a feature
   */
  async addTask(input: AddTaskInput): Promise<AddTaskResult> {
    try {
      const task: Partial<Task> = {
        taskId: input.taskId,
        title: input.title,
        description: input.description,
        orderOfExecution: input.orderOfExecution,
        acceptanceCriteria: input.acceptanceCriteria,
        testScenarios: input.testScenarios,
        outOfScope: input.outOfScope,
        estimatedHours: input.estimatedHours,
        dependencies: input.dependencies || [],
        tags: input.tags,
      };

      const taskId = this.dbHandler.addTask(input.featureSlug, task, input.repoName);
      return {
        success: true,
        featureSlug: input.featureSlug,
        taskId,
        message: `Task '${taskId}' added to feature '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        featureSlug: input.featureSlug,
        taskId: input.taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all features
   */
  async listFeatures(repoName: string): Promise<ListFeaturesResult> {
    try {
      const features = this.dbHandler.getAllFeatures(repoName);
      return {
        success: true,
        features,
        message: `Found ${features.length} feature(s)`,
      };
    } catch (error) {
      return {
        success: false,
        features: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a feature and all its tasks
   */
  async deleteFeature(repoName: string, featureSlug: string): Promise<DeleteFeatureResult> {
    try {
      this.dbHandler.deleteFeature(featureSlug, repoName);
      return {
        success: true,
        featureSlug,
        message: `Feature '${featureSlug}' deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        featureSlug,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a complete feature with all tasks
   */
  async getFeature(repoName: string, featureSlug: string): Promise<GetFeatureResult> {
    try {
      const feature = await this.dbHandler.loadByFeatureSlug(featureSlug, repoName);
      return {
        success: true,
        feature,
        message: `Feature '${featureSlug}' loaded with ${feature.tasks.length} task(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(input: UpdateTaskInput): Promise<UpdateTaskResult> {
    try {
      // Validate feature exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug, input.repoName);
      if (!fileValidation.valid) {
        throw new Error(`Invalid feature: ${fileValidation.error}`);
      }

      // Load task to verify it exists
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug, input.repoName);
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // Validate updates - ensure we're not trying to update status here
      if ('status' in input.updates) {
        throw new Error('Cannot update task status via update_task. Use transition_task_status instead.');
      }

      // Validate that we have at least one field to update
      if (Object.keys(input.updates).length === 0) {
        throw new Error('No fields to update');
      }

      // Perform the update
      this.dbHandler.updateTask(input.featureSlug, input.taskId, input.updates as Partial<Task>, input.repoName);

      return {
        success: true,
        featureSlug: input.featureSlug,
        taskId: input.taskId,
        message: `Task '${input.taskId}' updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        featureSlug: input.featureSlug,
        taskId: input.taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(repoName: string, featureSlug: string, taskId: string): Promise<DeleteTaskResult> {
    try {
      // Validate feature exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(featureSlug, repoName);
      if (!fileValidation.valid) {
        throw new Error(`Invalid feature: ${fileValidation.error}`);
      }

      // Load task file to check for dependencies
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug, repoName);
      const task = taskFile.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Check if other tasks depend on this one
      const dependentTasks = taskFile.tasks.filter((t) =>
        t.dependencies && t.dependencies.includes(taskId)
      );

      // Perform deletion
      this.dbHandler.deleteTask(featureSlug, taskId, repoName);

      let message = `Task '${taskId}' deleted successfully`;
      if (dependentTasks.length > 0) {
        const depIds = dependentTasks.map((t) => t.taskId).join(', ');
        message += `. Warning: ${dependentTasks.length} task(s) had dependencies on this task: ${depIds}`;
      }

      return {
        success: true,
        featureSlug,
        taskId,
        message,
      };
    } catch (error) {
      return {
        success: false,
        featureSlug,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Register a new repository
   */
  async registerRepo(input: RegisterRepoInput): Promise<RegisterRepoResult> {
    try {
      this.dbHandler.registerRepo(
        input.repoName,
        input.repoPath,
        input.repoUrl,
        input.defaultBranch,
        input.metadata
      );
      return {
        success: true,
        repoName: input.repoName,
        message: `Repository '${input.repoName}' registered successfully at path '${input.repoPath}'`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all registered repositories
   */
  async listRepos(): Promise<ListReposResult> {
    try {
      const repos = this.dbHandler.getAllRepos();
      return {
        success: true,
        repos,
        message: `Found ${repos.length} registered repository(ies)`,
      };
    } catch (error) {
      return {
        success: false,
        repos: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current repository based on working directory
   */
  async getCurrentRepo(): Promise<GetCurrentRepoResult> {
    try {
      const currentRepo = this.dbHandler.getCurrentRepo();
      if (!currentRepo) {
        return {
          success: false,
          registered: false,
          error: 'No repository found for current working directory',
        };
      }
      return {
        success: true,
        ...currentRepo,
        message: currentRepo.registered
          ? `Current repo: ${currentRepo.repoName}`
          : `Working directory ${currentRepo.repoPath} is not registered. Use register_repo first.`,
      };
    } catch (error) {
      return {
        success: false,
        registered: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update a refinement step
   */
  async updateRefinementStep(input: UpdateRefinementStepInput): Promise<UpdateRefinementStepResult> {
    try {
      this.dbHandler.updateRefinementStep(
        input.repoName,
        input.featureSlug,
        input.stepNumber,
        input.completed,
        input.summary,
        input.data
      );
      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        stepNumber: input.stepNumber,
        completed: input.completed,
        message: `Refinement step ${input.stepNumber} updated for feature '${input.featureSlug}' (${input.completed ? 'completed' : 'in progress'})`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        stepNumber: input.stepNumber,
        completed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add feature-level acceptance criteria
   */
  async addFeatureAcceptanceCriteria(input: AddFeatureAcceptanceCriteriaInput): Promise<AddFeatureAcceptanceCriteriaResult> {
    try {
      const count = this.dbHandler.addFeatureAcceptanceCriteria(
        input.repoName,
        input.featureSlug,
        input.criteria
      );
      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        criteriaAdded: count,
        message: `Added ${count} acceptance criteria to feature '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        criteriaAdded: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add feature-level test scenarios
   */
  async addFeatureTestScenarios(input: AddFeatureTestScenariosInput): Promise<AddFeatureTestScenariosResult> {
    try {
      const count = this.dbHandler.addFeatureTestScenarios(
        input.repoName,
        input.featureSlug,
        input.scenarios
      );
      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        scenariosAdded: count,
        message: `Added ${count} test scenarios to feature '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        scenariosAdded: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a clarification question
   */
  async addClarification(input: AddClarificationInput): Promise<AddClarificationResult> {
    try {
      const clarificationId = this.dbHandler.addClarification(
        input.repoName,
        input.featureSlug,
        input.question,
        input.answer,
        input.askedBy
      );
      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        clarificationId,
        message: `Clarification added to feature '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        clarificationId: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add attachment analysis
   */
  async addAttachmentAnalysis(input: AddAttachmentAnalysisInput): Promise<AddAttachmentAnalysisResult> {
    try {
      const attachmentId = this.dbHandler.addAttachmentAnalysis(
        input.repoName,
        input.featureSlug,
        input.attachmentName,
        input.attachmentType,
        input.analysisSummary,
        input.filePath,
        input.fileUrl,
        input.extractedData
      );
      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        attachmentId,
        message: `Attachment '${input.attachmentName}' analyzed and saved for feature '${input.featureSlug}'`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        attachmentId: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get refinement status for a feature
   */
  async getRefinementStatus(input: GetRefinementStatusInput): Promise<GetRefinementStatusResult> {
    try {
      const status = this.dbHandler.getRefinementStatus(input.repoName, input.featureSlug);
      return {
        success: true,
        ...status,
        message: `Refinement status retrieved for feature '${input.featureSlug}' (${status.progressPercentage}% complete)`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        featureName: '',
        currentStep: '',
        progressPercentage: 0,
        completedSteps: 0,
        totalSteps: 0,
        steps: [],
        acceptanceCriteriaCount: 0,
        testScenariosCount: 0,
        clarificationsCount: 0,
        attachmentsCount: 0,
        tasksCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate a refinement report in specified format
   */
  async generateRefinementReport(input: GenerateRefinementReportInput): Promise<GenerateRefinementReportResult> {
    try {
      const status = this.dbHandler.getRefinementStatus(input.repoName, input.featureSlug);

      // Determine which sections to include
      const allSections = ['steps', 'criteria', 'scenarios', 'clarifications', 'attachments'];
      const sectionsToInclude = input.includeSections || allSections;

      let content = '';

      if (input.format === 'markdown') {
        // Build markdown report
        content = `# Feature Refinement Report: ${status.featureName}\n\n`;
        content += `**Feature Slug**: ${input.featureSlug}  \n`;
        content += `**Repository**: ${input.repoName}  \n`;
        content += `**Progress**: ${status.progressPercentage}% (${status.completedSteps}/${status.totalSteps} steps)  \n\n`;
        content += `---\n\n`;

        // Refinement steps
        if (sectionsToInclude.includes('steps')) {
          content += `## Refinement Steps\n\n`;
          for (const step of status.steps) {
            const icon = step.completed ? '✅' : '⏸️';
            content += `### ${icon} Step ${step.step_number}: ${step.step_name}\n`;
            if (step.summary) {
              content += `**Summary**: ${step.summary}\n`;
            }
            if (step.completed_at) {
              content += `**Completed**: ${new Date(step.completed_at).toLocaleString()}\n`;
            }
            content += `\n`;
          }
          content += `---\n\n`;
        }

        // Feature Acceptance Criteria
        if (sectionsToInclude.includes('criteria') && status.featureAcceptanceCriteriaCount > 0) {
          content += `## Feature Acceptance Criteria (${status.featureAcceptanceCriteriaCount})\n\n`;
          const criteria = this.dbHandler.getFeatureAcceptanceCriteria(input.repoName, input.featureSlug);
          for (const ac of criteria) {
            content += `- **[${ac.criterion_id}]** (${ac.priority}) ${ac.criterion}\n`;
          }
          content += `\n---\n\n`;
        }

        // Feature Test Scenarios
        if (sectionsToInclude.includes('scenarios') && status.featureTestScenariosCount > 0) {
          content += `## Feature Test Scenarios (${status.featureTestScenariosCount})\n\n`;
          const scenarios = this.dbHandler.getFeatureTestScenarios(input.repoName, input.featureSlug);
          for (const ts of scenarios) {
            content += `### ${ts.scenario_id}: ${ts.title} (${ts.priority})\n`;
            content += `${ts.description}\n`;
            if (ts.preconditions) {
              content += `**Preconditions**: ${ts.preconditions}\n`;
            }
            if (ts.expected_result) {
              content += `**Expected Result**: ${ts.expected_result}\n`;
            }
            content += `\n`;
          }
          content += `---\n\n`;
        }

        // Clarifications
        if (sectionsToInclude.includes('clarifications') && status.clarificationsCount > 0) {
          content += `## Clarifications (${status.clarificationsCount})\n\n`;
          const clarifications = this.dbHandler.getClarifications(input.repoName, input.featureSlug);
          for (const clarification of clarifications) {
            content += `**Q**: ${clarification.question}\n`;
            if (clarification.answer) {
              content += `**A**: ${clarification.answer}\n`;
            } else {
              content += `**A**: _Pending response_\n`;
            }
            content += `\n`;
          }
          content += `---\n\n`;
        }

        // Attachments
        if (sectionsToInclude.includes('attachments') && status.attachmentsCount > 0) {
          content += `## Analyzed Attachments (${status.attachmentsCount})\n\n`;
          const attachments = this.dbHandler.getAttachments(input.repoName, input.featureSlug);
          for (const attachment of attachments) {
            content += `### ${attachment.attachment_name} (${attachment.attachment_type})\n`;
            content += `${attachment.analysis_summary}\n`;
            if (attachment.file_path) {
              content += `**File**: ${attachment.file_path}\n`;
            }
            if (attachment.file_url) {
              content += `**URL**: ${attachment.file_url}\n`;
            }
            content += `\n`;
          }
        }
      } else if (input.format === 'json') {
        // JSON format
        content = JSON.stringify(status, null, 2);
      } else {
        // HTML format (basic implementation)
        content = `<html><head><title>Refinement Report: ${status.featureName}</title></head><body>`;
        content += `<h1>Feature Refinement Report: ${status.featureName}</h1>`;
        content += `<p>Progress: ${status.progressPercentage}%</p>`;
        content += `</body></html>`;
      }

      return {
        success: true,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        format: input.format,
        content,
        sectionsIncluded: sectionsToInclude,
        message: `Refinement report generated for feature '${input.featureSlug}' in ${input.format} format`,
      };
    } catch (error) {
      return {
        success: false,
        repoName: input.repoName,
        featureSlug: input.featureSlug,
        format: input.format,
        content: '',
        sectionsIncluded: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
