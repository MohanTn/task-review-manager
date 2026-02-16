/**
 * MCP Server for Task Review Manager
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskReviewManager } from './TaskReviewManager.js';
import { ReviewInput, StakeholderRole } from './types.js';
import { startDashboard } from './dashboard.js';

// Initialize the MCP server
const server = new Server(
  {
    name: 'task-review-manager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize task review manager
const reviewManager = new TaskReviewManager();

// Tool definitions
const TOOLS = [
  {
    name: 'get_next_step',
    description:
      'Get the next step in the task pipeline. Returns which role should act next, the system prompt for that role, allowed decisions, transition targets, focus areas, and context from previous reviews. This is the primary orchestration tool -- call this to determine what to do next for any task.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
      },
      required: ['featureSlug', 'taskId'],
    },
  },
  {
    name: 'add_stakeholder_review',
    description:
      'Add a stakeholder review to a task. Updates task status based on approval/rejection and enforces workflow state machine rules.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
        stakeholder: {
          type: 'string',
          enum: ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer'],
          description: 'Stakeholder role performing the review',
        },
        decision: {
          type: 'string',
          enum: ['approve', 'reject'],
          description: 'Review decision (approve transitions forward, reject sends to NeedsRefinement)',
        },
        notes: {
          type: 'string',
          description: 'Review notes from the stakeholder',
        },
        additionalFields: {
          type: 'object',
          description: 'Role-specific additional fields',
          properties: {
            marketAnalysis: { type: 'string' },
            competitorAnalysis: { type: 'string' },
            technologyRecommendations: { type: 'array', items: { type: 'string' } },
            designPatterns: { type: 'array', items: { type: 'string' } },
            usabilityFindings: { type: 'string' },
            accessibilityRequirements: { type: 'array', items: { type: 'string' } },
            userBehaviorInsights: { type: 'string' },
            securityRequirements: { type: 'array', items: { type: 'string' } },
            complianceNotes: { type: 'string' },
          },
        },
      },
      required: ['featureSlug', 'taskId', 'stakeholder', 'decision', 'notes'],
    },
  },
  {
    name: 'get_task_status',
    description:
      'Get the current status of a specific task including which stakeholders have reviewed it and what transitions are allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
      },
      required: ['featureSlug', 'taskId'],
    },
  },
  {
    name: 'get_review_summary',
    description:
      'Generate a comprehensive summary of all tasks showing progress by status and stakeholder.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
      },
      required: ['featureSlug'],
    },
  },
  {
    name: 'validate_workflow',
    description:
      'Validate if a stakeholder can perform a review on a task without modifying any data. Use this before calling add_stakeholder_review.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
        stakeholder: {
          type: 'string',
          enum: ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer'],
          description: 'Stakeholder role to validate',
        },
      },
      required: ['featureSlug', 'taskId', 'stakeholder'],
    },
  },
  {
    name: 'transition_task_status',
    description:
      'Transition a task to a new status in the development workflow. Validates actor permissions and allowed transitions.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
        fromStatus: {
          type: 'string',
          description: 'Current task status (for validation)',
        },
        toStatus: {
          type: 'string',
          description: 'Target status to transition to',
        },
        actor: {
          type: 'string',
          enum: ['system', 'developer', 'codeReviewer', 'qa', 'productDirector', 'architect', 'uiUxExpert', 'securityOfficer'],
          description: 'Actor performing the transition',
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the transition',
        },
        metadata: {
          type: 'object',
          description: 'Optional role-specific metadata for the transition',
          properties: {
            developerNotes: { type: 'string' },
            filesChanged: { type: 'array', items: { type: 'string' } },
            testFiles: { type: 'array', items: { type: 'string' } },
            codeReviewerNotes: { type: 'string' },
            testResultsSummary: { type: 'string' },
            codeQualityConcerns: { type: 'string' },
            qaNotes: { type: 'string' },
            bugsFound: { type: 'string' },
            deploymentReadiness: { type: 'string' },
            acceptanceCriteriaMet: { type: 'boolean' },
            testExecutionSummary: { type: 'string' },
          },
        },
      },
      required: ['featureSlug', 'taskId', 'fromStatus', 'toStatus', 'actor'],
    },
  },
  {
    name: 'get_next_task',
    description:
      'Get the next task to work on based on status filter and orderOfExecution. Returns the task with the lowest orderOfExecution value.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        statusFilter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task statuses to filter by (e.g., ["ReadyForDevelopment", "ToDo", "NeedsChanges"])',
        },
      },
      required: ['featureSlug', 'statusFilter'],
    },
  },
  {
    name: 'update_acceptance_criteria',
    description:
      'Mark an acceptance criterion as verified or unverified for a specific task.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
        criterionId: {
          type: 'string',
          description: 'Acceptance criterion ID (e.g., AC-1)',
        },
        verified: {
          type: 'boolean',
          description: 'Whether the criterion is verified (true) or not (false)',
        },
      },
      required: ['featureSlug', 'taskId', 'criterionId', 'verified'],
    },
  },
  {
    name: 'get_tasks_by_status',
    description:
      'Get all tasks that match a specific status.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
        status: {
          type: 'string',
          description: 'Task status to filter by',
        },
      },
      required: ['featureSlug', 'status'],
    },
  },
  {
    name: 'verify_all_tasks_complete',
    description:
      'Verify if all tasks in a task file are marked as Done. Returns completion statistics.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
      },
      required: ['featureSlug'],
    },
  },
  {
    name: 'create_feature',
    description:
      'Create a new feature. This is the first step before adding tasks. Creates a feature entry with a slug and display name.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'URL-friendly feature slug (e.g., "smart-strangle-engine")',
        },
        featureName: {
          type: 'string',
          description: 'Human-readable feature name (e.g., "Smart Strangle Engine")',
        },
      },
      required: ['featureSlug', 'featureName'],
    },
  },
  {
    name: 'add_task',
    description:
      'Add a task to an existing feature. The task starts in PendingProductDirector status and proceeds through: Product Director > Architect > UI/UX Expert > Security Officer > Developer > Code Reviewer > QA > Done.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug to add the task to',
        },
        taskId: {
          type: 'string',
          description: 'Unique task identifier (e.g., T01, T02)',
        },
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Detailed task description',
        },
        orderOfExecution: {
          type: 'number',
          description: 'Execution order (1, 2, 3, etc.)',
        },
        acceptanceCriteria: {
          type: 'array',
          description: 'List of acceptance criteria',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Criterion ID (e.g., AC-1)' },
              criterion: { type: 'string', description: 'The acceptance criterion text' },
              priority: { type: 'string', enum: ['Must Have', 'Should Have', 'Could Have'] },
            },
            required: ['id', 'criterion', 'priority'],
          },
        },
        testScenarios: {
          type: 'array',
          description: 'List of test scenarios',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Scenario ID (e.g., TS-1)' },
              title: { type: 'string', description: 'Test scenario title' },
              description: { type: 'string', description: 'Test scenario description' },
              manualOnly: { type: 'boolean', description: 'Whether this test is manual only' },
              priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
            },
            required: ['id', 'title', 'description', 'priority'],
          },
        },
        outOfScope: {
          type: 'array',
          items: { type: 'string' },
          description: 'Items explicitly out of scope for this task',
        },
        estimatedHours: {
          type: 'number',
          description: 'Estimated hours to complete',
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task IDs this task depends on',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
      },
      required: ['featureSlug', 'taskId', 'title', 'description', 'orderOfExecution'],
    },
  },
  {
    name: 'list_features',
    description:
      'List all features with their task counts and last modified timestamps.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'delete_feature',
    description:
      'Delete a feature and all its associated tasks, transitions, and reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug to delete',
        },
      },
      required: ['featureSlug'],
    },
  },
  {
    name: 'get_feature',
    description:
      'Get a complete feature with all its tasks, transitions, acceptance criteria, test scenarios, and stakeholder reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug name',
        },
      },
      required: ['featureSlug'],
    },
  },
  {
    name: 'update_task',
    description:
      'Update an existing task within a feature. Allows modifying task properties like title, description, acceptance criteria, test scenarios, etc. Use this when requirements change during refinement. Note: Cannot update task status - use transition_task_status for status changes.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug',
        },
        taskId: {
          type: 'string',
          description: 'Task ID to update',
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            orderOfExecution: { type: 'number', description: 'Execution order' },
            estimatedHours: { type: 'number', description: 'Estimated hours' },
            acceptanceCriteria: {
              type: 'array',
              description: 'Acceptance criteria',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  criterion: { type: 'string' },
                  priority: { type: 'string', enum: ['Must Have', 'Should Have', 'Could Have'] },
                },
                required: ['id', 'criterion', 'priority'],
              },
            },
            testScenarios: {
              type: 'array',
              description: 'Test scenarios',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  manualOnly: { type: 'boolean' },
                  priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
                },
                required: ['id', 'title', 'description', 'priority'],
              },
            },
            outOfScope: {
              type: 'array',
              description: 'Out of scope items',
              items: { type: 'string' },
            },
            dependencies: {
              type: 'array',
              description: 'Task dependencies',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              description: 'Task tags',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['featureSlug', 'taskId', 'updates'],
    },
  },
  {
    name: 'delete_task',
    description:
      'Delete a task from a feature. This removes the task and all associated data (transitions, reviews, criteria). Use this when a task is no longer needed. Warning: This operation cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        featureSlug: {
          type: 'string',
          description: 'Feature slug',
        },
        taskId: {
          type: 'string',
          description: 'Task ID to delete',
        },
      },
      required: ['featureSlug', 'taskId'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments');
    }

    switch (name) {
      case 'get_next_step': {
        const result = await reviewManager.getNextStep({
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_stakeholder_review': {
        const input: ReviewInput = {
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
          stakeholder: args.stakeholder as StakeholderRole,
          decision: args.decision as 'approve' | 'reject',
          notes: args.notes as string,
          additionalFields: args.additionalFields as any,
        };

        const result = await reviewManager.addReview(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_task_status': {
        const result = await reviewManager.getTaskStatus(
          args.featureSlug as string,
          args.taskId as string
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_review_summary': {
        const result = await reviewManager.getReviewSummary(args.featureSlug as string);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'validate_workflow': {
        const result = await reviewManager.validateWorkflow(
          args.featureSlug as string,
          args.taskId as string,
          args.stakeholder as StakeholderRole
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'transition_task_status': {
        const input = {
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
          fromStatus: args.fromStatus as any,
          toStatus: args.toStatus as any,
          actor: args.actor as any,
          notes: args.notes as string | undefined,
          metadata: args.metadata as any,
        };

        const result = await reviewManager.transitionTaskStatus(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_next_task': {
        const input = {
          featureSlug: args.featureSlug as string,
          statusFilter: args.statusFilter as any[],
        };

        const result = await reviewManager.getNextTask(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_acceptance_criteria': {
        const input = {
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
          criterionId: args.criterionId as string,
          verified: args.verified as boolean,
        };

        const result = await reviewManager.updateAcceptanceCriteria(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_tasks_by_status': {
        const input = {
          featureSlug: args.featureSlug as string,
          status: args.status as any,
        };

        const result = await reviewManager.getTasksByStatus(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'verify_all_tasks_complete': {
        const input = {
          featureSlug: args.featureSlug as string,
        };

        const result = await reviewManager.verifyAllTasksComplete(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_feature': {
        const result = await reviewManager.createFeature({
          featureSlug: args.featureSlug as string,
          featureName: args.featureName as string,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_task': {
        const result = await reviewManager.addTask({
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
          title: args.title as string,
          description: args.description as string,
          orderOfExecution: args.orderOfExecution as number,
          acceptanceCriteria: args.acceptanceCriteria as any,
          testScenarios: args.testScenarios as any,
          outOfScope: args.outOfScope as string[],
          estimatedHours: args.estimatedHours as number | undefined,
          dependencies: args.dependencies as string[],
          tags: args.tags as string[],
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_features': {
        const result = await reviewManager.listFeatures();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_feature': {
        const result = await reviewManager.deleteFeature(args.featureSlug as string);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_feature': {
        const result = await reviewManager.getFeature(args.featureSlug as string);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_task': {
        const result = await reviewManager.updateTask({
          featureSlug: args.featureSlug as string,
          taskId: args.taskId as string,
          updates: args.updates as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_task': {
        const result = await reviewManager.deleteTask(
          args.featureSlug as string,
          args.taskId as string
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  // Start dashboard server on port 5111
  startDashboard(5111);

  // Start MCP server on stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Task Review Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
