/**
 * Type definitions for task review manager MCP server
 */

export type TaskStatus =
  | 'PendingProductDirector'
  | 'PendingArchitect'
  | 'PendingUiUxExpert'
  | 'PendingSecurityOfficer'
  | 'ReadyForDevelopment'
  | 'NeedsRefinement'
  | 'ToDo'
  | 'InProgress'
  | 'InReview'
  | 'InQA'
  | 'NeedsChanges'
  | 'Done';

export type StakeholderRole = 'productDirector' | 'architect' | 'uiUxExpert' | 'securityOfficer';

export type ActorType = StakeholderRole | 'system' | 'developer' | 'codeReviewer' | 'qa';

export type ReviewDecision = 'approve' | 'reject';

export type PipelineRole =
  | 'productDirector'
  | 'architect'
  | 'uiUxExpert'
  | 'securityOfficer'
  | 'developer'
  | 'codeReviewer'
  | 'qa';

export type PipelinePhase = 'review' | 'execution';

export interface Transition {
  from: TaskStatus;
  to: TaskStatus;
  approver?: StakeholderRole;
  actor?: ActorType;
  timestamp: string;
  notes?: string;
  // Product Director
  productDirectorNotes?: string;
  marketAnalysis?: string;
  competitorAnalysis?: string;
  requiredChanges?: string;
  // Architect
  architectNotes?: string;
  technologyRecommendations?: string;
  designPatterns?: string;
  technicalConcerns?: string;
  // UI/UX Expert
  uiUxNotes?: string;
  usabilityFindings?: string;
  accessibilityRequirements?: string;
  userBehaviorInsights?: string;
  // Security Officer
  securityOfficerNotes?: string;
  securityRequirements?: string;
  complianceGuidelines?: string;
  securityConcerns?: string;
  mandatoryControls?: string;
  // Developer
  developerNotes?: string;
  filesChanged?: string[];
  testFiles?: string[];
  // Code Reviewer
  codeReviewerNotes?: string;
  testResultsSummary?: string;
  codeQualityConcerns?: string;
  // QA
  qaNotes?: string;
  bugsFound?: string;
  deploymentReadiness?: string;
  acceptanceCriteriaMet?: boolean;
  testExecutionSummary?: string;
}

export interface AcceptanceCriterion {
  id: string;
  criterion: string;
  priority: 'Must Have' | 'Should Have' | 'Could Have';
  verified: boolean;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  manualOnly: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface StakeholderReview {
  productDirector?: {
    approved: boolean;
    notes: string;
    marketAnalysis?: string;
    competitorAnalysis?: string;
  };
  architect?: {
    approved: boolean;
    notes: string;
    technologyRecommendations?: string[];
    designPatterns?: string[];
  };
  uiUxExpert?: {
    approved: boolean;
    notes: string;
    usabilityFindings?: string;
    accessibilityRequirements?: string[];
    userBehaviorInsights?: string;
  };
  securityOfficer?: {
    approved: boolean;
    notes: string;
    securityRequirements?: string[];
    complianceNotes?: string;
  };
}

export interface Task {
  taskId: string;
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  testScenarios?: TestScenario[];
  outOfScope?: string[];
  estimatedHours?: number;
  status: TaskStatus;
  assignedTo?: string;
  dependencies: string[];
  transitions: Transition[];
  stakeholderReview: StakeholderReview;
  order?: number;
  orderOfExecution: number;
  tags?: string[];
}

export interface TaskFile {
  featureSlug: string;
  featureName: string;
  createdAt: string;
  lastModified: string;
  tasks: Task[];
}

export interface ReviewInput {
  featureSlug: string;
  taskId: string;
  stakeholder: StakeholderRole;
  decision: ReviewDecision;
  notes: string;
  additionalFields?: {
    // Product Director
    marketAnalysis?: string;
    competitorAnalysis?: string;
    // Architect
    technologyRecommendations?: string[];
    designPatterns?: string[];
    // UI/UX Expert
    usabilityFindings?: string;
    accessibilityRequirements?: string[];
    userBehaviorInsights?: string;
    // Security Officer
    securityRequirements?: string[];
    complianceNotes?: string;
  };
}

export interface ReviewResult {
  success: boolean;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  transition: Transition;
  message?: string;
  error?: string;
}

export interface TaskStatusResult {
  taskId: string;
  status: TaskStatus;
  currentStakeholder: StakeholderRole | null;
  completedReviews: StakeholderRole[];
  pendingReviews: StakeholderRole[];
  canTransitionTo: TaskStatus[];
  orderOfExecution: number;
}

export interface ReviewSummary {
  featureSlug: string;
  featureName: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  completionPercentage: number;
  stakeholderProgress: {
    productDirector: { completed: number; pending: number };
    architect: { completed: number; pending: number };
    uiUxExpert: { completed: number; pending: number };
    securityOfficer: { completed: number; pending: number };
  };
  tasks: Array<{
    taskId: string;
    title: string;
    status: TaskStatus;
    estimatedHours?: number;
    orderOfExecution: number;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  currentStatus: TaskStatus;
  expectedStakeholder: StakeholderRole | null;
  allowedTransitions: TaskStatus[];
}

export interface WorkflowRule {
  expectedStakeholder: StakeholderRole;
  onApprove: TaskStatus;
  onReject: TaskStatus;
  allowedPreviousStatuses: TaskStatus[];
}

export const WORKFLOW_RULES: Record<TaskStatus, WorkflowRule | null> = {
  PendingProductDirector: {
    expectedStakeholder: 'productDirector',
    onApprove: 'PendingArchitect',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingProductDirector', 'NeedsRefinement'],
  },
  PendingArchitect: {
    expectedStakeholder: 'architect',
    onApprove: 'PendingUiUxExpert',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingProductDirector'],
  },
  PendingUiUxExpert: {
    expectedStakeholder: 'uiUxExpert',
    onApprove: 'PendingSecurityOfficer',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingArchitect'],
  },
  PendingSecurityOfficer: {
    expectedStakeholder: 'securityOfficer',
    onApprove: 'ReadyForDevelopment',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingUiUxExpert'],
  },
  ReadyForDevelopment: null,
  NeedsRefinement: null,
  ToDo: null,
  InProgress: null,
  InReview: null,
  InQA: null,
  NeedsChanges: null,
  Done: null,
};

// Development workflow transition rules
export interface DevWorkflowRule {
  allowedActors: ActorType[];
  allowedTransitions: TaskStatus[];
}

export const DEV_WORKFLOW_RULES: Record<TaskStatus, DevWorkflowRule> = {
  PendingProductDirector: { allowedActors: ['productDirector', 'system'], allowedTransitions: ['PendingArchitect', 'NeedsRefinement'] },
  PendingArchitect: { allowedActors: ['architect', 'system'], allowedTransitions: ['PendingUiUxExpert', 'NeedsRefinement'] },
  PendingUiUxExpert: { allowedActors: ['uiUxExpert', 'system'], allowedTransitions: ['PendingSecurityOfficer', 'NeedsRefinement'] },
  PendingSecurityOfficer: { allowedActors: ['securityOfficer', 'system'], allowedTransitions: ['ReadyForDevelopment', 'NeedsRefinement'] },
  ReadyForDevelopment: { allowedActors: ['system'], allowedTransitions: ['ToDo'] },
  NeedsRefinement: { allowedActors: ['system'], allowedTransitions: ['PendingProductDirector'] },
  ToDo: { allowedActors: ['system', 'developer'], allowedTransitions: ['InProgress'] },
  InProgress: { allowedActors: ['developer'], allowedTransitions: ['InReview'] },
  InReview: { allowedActors: ['codeReviewer'], allowedTransitions: ['InQA', 'NeedsChanges'] },
  InQA: { allowedActors: ['qa'], allowedTransitions: ['Done', 'NeedsChanges'] },
  NeedsChanges: { allowedActors: ['developer'], allowedTransitions: ['InProgress'] },
  Done: { allowedActors: [], allowedTransitions: [] },
};

// Tool input/output interfaces

export interface TransitionTaskInput {
  featureSlug: string;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  actor: ActorType;
  notes?: string;
  metadata?: Partial<Transition>;
}

export interface TransitionTaskResult {
  success: boolean;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  transition: Transition;
  message?: string;
  error?: string;
}

export interface GetNextTaskInput {
  featureSlug: string;
  statusFilter: TaskStatus[];
}

export interface GetNextTaskResult {
  success: boolean;
  task?: Task;
  message?: string;
  error?: string;
}

export interface GetNextStepInput {
  featureSlug: string;
  taskId: string;
}

export interface GetNextStepResult {
  success: boolean;
  taskId: string;
  currentStatus: TaskStatus;
  phase: PipelinePhase;
  nextRole: PipelineRole;
  systemPrompt: string;
  allowedDecisions: string[];
  transitionOnSuccess: TaskStatus;
  transitionOnFailure: TaskStatus;
  focusAreas: string[];
  researchInstructions: string;
  requiredOutputFields: string[];
  previousRoleNotes: Record<string, string>;
  message?: string;
  error?: string;
}

export interface UpdateAcceptanceCriteriaInput {
  featureSlug: string;
  taskId: string;
  criterionId: string;
  verified: boolean;
}

export interface UpdateAcceptanceCriteriaResult {
  success: boolean;
  taskId: string;
  criterionId: string;
  verified: boolean;
  message?: string;
  error?: string;
}

export interface GetTasksByStatusInput {
  featureSlug: string;
  status: TaskStatus;
}

export interface GetTasksByStatusResult {
  success: boolean;
  tasks: Task[];
  count: number;
  message?: string;
  error?: string;
}

export interface VerifyAllTasksCompleteInput {
  featureSlug: string;
}

export interface VerifyAllTasksCompleteResult {
  success: boolean;
  allComplete: boolean;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: Array<{
    taskId: string;
    title: string;
    status: TaskStatus;
  }>;
  message?: string;
  error?: string;
}

// Feature & Task creation types

export interface CreateFeatureInput {
  featureSlug: string;
  featureName: string;
}

export interface CreateFeatureResult {
  success: boolean;
  featureSlug: string;
  message?: string;
  error?: string;
}

export interface AddTaskInput {
  featureSlug: string;
  taskId: string;
  title: string;
  description: string;
  orderOfExecution: number;
  acceptanceCriteria?: AcceptanceCriterion[];
  testScenarios?: TestScenario[];
  outOfScope?: string[];
  estimatedHours?: number;
  dependencies?: string[];
  tags?: string[];
}

export interface AddTaskResult {
  success: boolean;
  featureSlug: string;
  taskId: string;
  message?: string;
  error?: string;
}

export interface ListFeaturesResult {
  success: boolean;
  features: Array<{
    featureSlug: string;
    featureName: string;
    lastModified: string;
    totalTasks: number;
  }>;
  message?: string;
  error?: string;
}

export interface DeleteFeatureResult {
  success: boolean;
  featureSlug: string;
  message?: string;
  error?: string;
}

export interface GetFeatureResult {
  success: boolean;
  feature?: TaskFile;
  message?: string;
  error?: string;
}
