export interface Task {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  orderOfExecution: number;
  acceptanceCriteria: AcceptanceCriterion[];
  testScenarios: TestScenario[];
  estimatedHours?: number;
  tags?: string[];
  dependencies?: string[];
  outOfScope?: string[];
  stakeholderReviews?: StakeholderReview[];
}

export interface AcceptanceCriterion {
  id: string;
  priority: 'Must Have' | 'Should Have' | 'Could Have';
  criterion: string;
  verified: boolean;
}

export interface TestScenario {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  manualOnly: boolean;
}

export interface StakeholderReview {
  role: StakeholderRole;
  decision: 'approve' | 'reject';
  notes: string;
  timestamp: string;
  additionalFields?: Record<string, any>;
}

export type TaskStatus =
  | 'PendingProductDirector'
  | 'PendingArchitect'
  | 'PendingUiUxExpert'
  | 'PendingSecurityOfficer'
  | 'NeedsRefinement'
  | 'ReadyForDevelopment'
  | 'InProgress'
  | 'InReview'
  | 'InQA'
  | 'NeedsChanges'
  | 'Done';

export type StakeholderRole = 
  | 'productDirector'
  | 'architect'
  | 'uiUxExpert'
  | 'securityOfficer';

export interface Feature {
  featureSlug: string;
  title: string;
  description?: string;
  repoName: string;
  createdAt: string;
  tasks?: Task[];
  totalTasks?: number;
  acceptanceCriteria?: AcceptanceCriterion[];
  testScenarios?: TestScenario[];
}

export interface Repo {
  repoName: string;
  description?: string;
  features: Feature[];
}

export interface ReviewSummary {
  featureSlug: string;
  featureTitle: string;
  repoName: string;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasks: Task[];
}
