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
          enum: ['productDirector', 'architect', 'leadEngineer', 'cfo', 'cso'],
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
            technologyRecommendations: { type: 'array', items: { type: 'string' } },
            designPatterns: { type: 'array', items: { type: 'string' } },
            resourcePlan: { type: 'string' },
            implementationPhases: { type: 'array', items: { type: 'string' } },
            costAnalysis: { type: 'string' },
            revenueOptimization: { type: 'string' },
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
          enum: ['productDirector', 'architect', 'leadEngineer', 'cfo', 'cso'],
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
          enum: ['system', 'developer', 'reviewer', 'qa', 'productDirector', 'architect', 'leadEngineer', 'cfo', 'cso'],
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
            reviewerNotes: { type: 'string' },
            qaSignOff: { type: 'string' },
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

