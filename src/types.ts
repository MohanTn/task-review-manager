/**
 * Type definitions for task review manager MCP server
 */

export type TaskStatus =
  | 'PendingProductDirector'
  | 'PendingArchitect'
  | 'PendingLeadEngineer'
  | 'PendingCFO'
  | 'PendingCSO'
  | 'ReadyForDevelopment'
  | 'NeedsRefinement'
  | 'ToDo'
  | 'InProgress'
  | 'InReview'
  | 'InQA'
  | 'NeedsChanges'
  | 'Done';

export type StakeholderRole = 'productDirector' | 'architect' | 'leadEngineer' | 'cfo' | 'cso';

export type ActorType = StakeholderRole | 'system' | 'developer' | 'reviewer' | 'qa';

export type ReviewDecision = 'approve' | 'reject';

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
  requiredChanges?: string;
  // Architect
  architectNotes?: string;
  technologyRecommendations?: string;
  designPatterns?: string;
  technicalConcerns?: string;
  // Lead Engineer
  leadEngineerNotes?: string;
  resourcePlan?: string;
  estimatedEffort?: string;
  requiredClarifications?: string;
  // CFO
  cfoNotes?: string;
  costAnalysis?: string;
  revenueOptimization?: string;
  costConcerns?: string;
  // CSO
  csoNotes?: string;
  securityRequirements?: string;
  complianceGuidelines?: string;
  securityConcerns?: string;
  mandatoryControls?: string;
  // Developer
  developerNotes?: string;
  filesChanged?: string[];
  testFiles?: string[];
  // Reviewer
  reviewerNotes?: string;
  qaSignOff?: string;
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
  };
  architect?: {
    approved: boolean;
    notes: string;
    technologyRecommendations?: string[];
    designPatterns?: string[];
  };
  leadEngineer?: {
    approved: boolean;
    notes: string;
    resourcePlan?: string;
    implementationPhases?: string[];
  };
  cfo?: {
    approved: boolean;
    notes: string;
    costAnalysis?: string;
    revenueOptimization?: string;
  };
  cso?: {
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
    marketAnalysis?: string;
    technologyRecommendations?: string[];
    designPatterns?: string[];
    resourcePlan?: string;
    implementationPhases?: string[];
    costAnalysis?: string;
    revenueOptimization?: string;
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
    leadEngineer: { completed: number; pending: number };
    cfo: { completed: number; pending: number };
    cso: { completed: number; pending: number };
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
    onApprove: 'PendingLeadEngineer',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingProductDirector'],
  },
  PendingLeadEngineer: {
    expectedStakeholder: 'leadEngineer',
    onApprove: 'PendingCFO',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingArchitect'],
  },
  PendingCFO: {
    expectedStakeholder: 'cfo',
    onApprove: 'PendingCSO',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingLeadEngineer'],
  },
  PendingCSO: {
    expectedStakeholder: 'cso',
    onApprove: 'ReadyForDevelopment',
    onReject: 'NeedsRefinement',
    allowedPreviousStatuses: ['PendingCFO'],
  },
  ReadyForDevelopment: null, // Can transition to ToDo
  NeedsRefinement: null, // Terminal state (requires manual reset)
  ToDo: null, // Can transition to InProgress
  InProgress: null, // Can transition to InReview
  InReview: null, // Can transition to InQA or NeedsChanges
  InQA: null, // Can transition to Done or NeedsChanges
  NeedsChanges: null, // Can transition back to InProgress
  Done: null, // Terminal state
};

// Development workflow transition rules
export interface DevWorkflowRule {
  allowedActors: ActorType[];
  allowedTransitions: TaskStatus[];
}

export const DEV_WORKFLOW_RULES: Record<TaskStatus, DevWorkflowRule> = {
  PendingProductDirector: { allowedActors: ['productDirector', 'system'], allowedTransitions: ['PendingArchitect', 'NeedsRefinement'] },
  PendingArchitect: { allowedActors: ['architect', 'system'], allowedTransitions: ['PendingLeadEngineer', 'NeedsRefinement'] },
  PendingLeadEngineer: { allowedActors: ['leadEngineer', 'system'], allowedTransitions: ['PendingCFO', 'NeedsRefinement'] },
  PendingCFO: { allowedActors: ['cfo', 'system'], allowedTransitions: ['PendingCSO', 'NeedsRefinement'] },
  PendingCSO: { allowedActors: ['cso', 'system'], allowedTransitions: ['ReadyForDevelopment', 'NeedsRefinement'] },
  ReadyForDevelopment: { allowedActors: ['system'], allowedTransitions: ['ToDo'] },
  NeedsRefinement: { allowedActors: ['system'], allowedTransitions: ['PendingProductDirector'] },
  ToDo: { allowedActors: ['system', 'developer'], allowedTransitions: ['InProgress'] },
  InProgress: { allowedActors: ['developer'], allowedTransitions: ['InReview'] },
  InReview: { allowedActors: ['reviewer'], allowedTransitions: ['InQA', 'NeedsChanges'] },
  InQA: { allowedActors: ['qa'], allowedTransitions: ['Done', 'NeedsChanges'] },
  NeedsChanges: { allowedActors: ['developer'], allowedTransitions: ['InProgress'] },
  Done: { allowedActors: [], allowedTransitions: [] },
};

// New tool input/output interfaces

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
