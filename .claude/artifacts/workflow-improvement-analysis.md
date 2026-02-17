# Workflow Improvement Analysis
## Making LLMs Follow refine-feature Instructions Precisely

**Date**: 2026-02-17
**Purpose**: Analyze and recommend improvements to MCP server tools to ensure LLMs like Claude Sonnet follow the refine-feature workflow exactly as specified.

---

## Current Workflow Analysis

The refine-feature workflow (Step 7) relies on MCP orchestration:
1. Call `get_next_step` → receives role, systemPrompt, and requirements
2. Execute role by following systemPrompt
3. Call `add_stakeholder_review` → submits decision and notes
4. Loop until task reaches "ReadyForDevelopment"

### Critical Pain Points

#### 1. **No Validation of Required Fields**
**Problem**: `add_stakeholder_review` accepts reviews even if `requiredOutputFields` are missing.

**Current behavior**:
```typescript
// additionalFields is optional, no validation
additionalFields: args.additionalFields as any
```

**Impact**: LLM can submit incomplete reviews, missing critical analysis like `marketAnalysis` or `securityRequirements`.

---

#### 2. **Passive System Prompts**
**Problem**: Role system prompts are informative but not directive enough.

**Example** (Product Director):
```
"Your job is to evaluate this task..."
"Add your analysis as structured notes..."
```

**Impact**: LLM may understand the role but not follow a strict sequence of actions.

---

#### 3. **No Research Enforcement**
**Problem**: `researchInstructions` are returned but there's no mechanism to verify research was actually conducted.

**Current**:
```typescript
researchInstructions: 'Use web search to research competitor products...'
```

**Impact**: LLM might skip web research and rely on training data, missing current information.

---

#### 4. **Unclear Loop Termination**
**Problem**: The workflow says "loop until ReadyForDevelopment" but doesn't explicitly tell the LLM when to stop.

**Current**:
```typescript
if (!nextRole) {
  return { message: 'Task is complete. No further steps.' }
}
```

**Impact**: LLM might not understand it needs to iterate through ALL tasks or when a single task is truly complete.

---

#### 5. **No Step-by-Step Checklist**
**Problem**: `get_next_step` returns broad instructions, not atomic actions.

**Impact**: LLM must interpret what to do, leading to inconsistent execution.

---

## Recommended Improvements

### 🔧 **Improvement 1: Strict Field Validation**

**Add validation to `add_stakeholder_review`**:

```typescript
// In add_stakeholder_review handler
case 'add_stakeholder_review': {
  // Get role config to know required fields
  const roleConfig = ROLE_SYSTEM_PROMPTS[args.stakeholder];

  // Validate all required fields are present
  const missing = roleConfig.requiredOutputFields.filter(
    field => !args.additionalFields?.[field]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields for ${args.stakeholder}: ${missing.join(', ')}. ` +
      `You must provide these fields before submitting your review. ` +
      `Re-call add_stakeholder_review with all required fields populated.`
    );
  }

  // Continue with review...
}
```

**Benefit**: Forces LLM to populate all required fields or receive immediate error feedback.

---

### 🔧 **Improvement 2: Action-Based System Prompts**

**Restructure system prompts as numbered action steps**:

```typescript
productDirector: {
  systemPrompt: `You are a Product Director reviewing task {{taskId}}.

**CRITICAL**: You MUST complete ALL steps below in sequence. Do NOT skip any step.

## STEP 1: Conduct Competitor Research
- Use the WebSearch tool to find 2-3 competitors offering similar functionality
- For each competitor: note their approach, pricing model, and user feedback
- Document findings in competitorAnalysis field

## STEP 2: Analyze Market Demand
- Research market need and user segments
- Identify potential ROI and business value
- Document findings in marketAnalysis field

## STEP 3: Evaluate Feature Scope
- Review acceptance criteria for completeness
- Assess if scope is achievable and well-defined
- Note any missing requirements or ambiguities

## STEP 4: Make Decision
- APPROVE if: well-defined scope + clear market value + competitor validation
- REJECT if: unclear value proposition + scope too broad/narrow + weak market justification
- When rejecting, specify exactly what needs refinement

## STEP 5: Submit Review
- Call add_stakeholder_review with:
  - decision: "approve" or "reject"
  - notes: summary of your analysis (100-300 words)
  - additionalFields.marketAnalysis: your market research findings
  - additionalFields.competitorAnalysis: your competitor research findings

**VERIFICATION**: After calling add_stakeholder_review, the system will validate you provided all required fields. If validation fails, fix the missing fields and re-submit.`,
  // ...
}
```

**Benefit**: Eliminates ambiguity about what to do and in what order.

---

### 🔧 **Improvement 3: Add Research Verification Tool**

**New MCP tool**: `verify_research_completed`

```typescript
{
  name: 'verify_research_completed',
  description: 'Verify that required research has been conducted for a role. Call this before add_stakeholder_review to ensure you have completed all research requirements.',
  inputSchema: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer'],
        description: 'The role you are executing'
      },
      researchEvidence: {
        type: 'object',
        description: 'Evidence of research conducted',
        properties: {
          webSearchesPerformed: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of web search queries you executed'
          },
          sourcesReviewed: {
            type: 'array',
            items: { type: 'string' },
            description: 'URLs or sources you reviewed'
          }
        }
      }
    },
    required: ['role', 'researchEvidence']
  }
}
```

**Implementation**:
```typescript
async verifyResearchCompleted(role, evidence) {
  const roleConfig = ROLE_SYSTEM_PROMPTS[role];
  const warnings = [];

  if (evidence.webSearchesPerformed.length < 2) {
    warnings.push(`Expected at least 2 web searches for ${role}, found ${evidence.webSearchesPerformed.length}`);
  }

  return {
    verified: warnings.length === 0,
    warnings,
    message: warnings.length === 0
      ? 'Research requirements verified. You may proceed to add_stakeholder_review.'
      : 'Research incomplete. Please conduct additional research before submitting review.'
  };
}
```

**Benefit**: Creates accountability for research step, prevents LLM from skipping research.

---

### 🔧 **Improvement 4: Enhanced Loop Guidance**

**Modify `get_next_step` to return explicit loop instructions**:

```typescript
async getNextStep(input: GetNextStepInput): Promise<GetNextStepResult> {
  // ... existing logic ...

  // Add loop guidance
  const allTasks = taskFile.tasks;
  const currentTaskIndex = allTasks.findIndex(t => t.taskId === input.taskId);
  const remainingTasks = allTasks.filter(t =>
    t.status !== 'ReadyForDevelopment' && t.status !== 'Done'
  );

  return {
    // ... existing fields ...
    loopGuidance: {
      currentTaskId: input.taskId,
      currentTaskIndex: currentTaskIndex + 1,
      totalTasks: allTasks.length,
      remainingTasksCount: remainingTasks.length,
      nextAction: nextRole
        ? `Execute ${nextRole} review for task ${input.taskId}, then call get_next_step again`
        : remainingTasks.length > 0
          ? `This task is complete. Call get_next_step for the next task: ${remainingTasks[0].taskId}`
          : 'All tasks complete! Proceed to Step 8 of the refine-feature workflow.',
      allTasksComplete: remainingTasks.length === 0
    }
  };
}
```

**Benefit**: LLM knows exactly what to do next and when the loop is complete.

---

### 🔧 **Improvement 5: Pre-Submit Validation Tool**

**New MCP tool**: `validate_review_ready`

```typescript
{
  name: 'validate_review_ready',
  description: 'Validate that your review is ready to submit. Call this BEFORE add_stakeholder_review to check if all requirements are met.',
  inputSchema: {
    type: 'object',
    properties: {
      featureSlug: { type: 'string' },
      taskId: { type: 'string' },
      stakeholder: {
        type: 'string',
        enum: ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer']
      },
      proposedReview: {
        type: 'object',
        description: 'The review you plan to submit',
        properties: {
          decision: { type: 'string', enum: ['approve', 'reject'] },
          notes: { type: 'string' },
          additionalFields: { type: 'object' }
        },
        required: ['decision', 'notes', 'additionalFields']
      }
    },
    required: ['featureSlug', 'taskId', 'stakeholder', 'proposedReview']
  }
}
```

**Implementation**:
```typescript
async validateReviewReady(input) {
  const roleConfig = ROLE_SYSTEM_PROMPTS[input.stakeholder];
  const errors = [];
  const warnings = [];

  // Check required fields
  const missingFields = roleConfig.requiredOutputFields.filter(
    field => !input.proposedReview.additionalFields?.[field]
  );

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Check notes length
  const wordCount = input.proposedReview.notes.split(/\s+/).length;
  if (wordCount < 50) {
    warnings.push(`Notes are very brief (${wordCount} words). Consider adding more detail.`);
  }

  // Check decision justification
  if (input.proposedReview.decision === 'reject' &&
      !input.proposedReview.notes.toLowerCase().includes('because')) {
    warnings.push('Rejection should clearly explain the reasoning.');
  }

  return {
    ready: errors.length === 0,
    errors,
    warnings,
    message: errors.length === 0
      ? 'Review is ready to submit. Call add_stakeholder_review now.'
      : `Review not ready: ${errors.join('; ')}`
  };
}
```

**Benefit**: LLM gets immediate feedback on review quality before submission, reducing retry loops.

---

### 🔧 **Improvement 6: Step Progress Tracker**

**New MCP tool**: `record_step_progress`

```typescript
{
  name: 'record_step_progress',
  description: 'Record completion of a step in your current role execution. Use this to track progress through the system prompt steps.',
  inputSchema: {
    type: 'object',
    properties: {
      featureSlug: { type: 'string' },
      taskId: { type: 'string' },
      role: { type: 'string', enum: ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer'] },
      stepNumber: { type: 'number', description: 'Which step you just completed (1-5)' },
      stepSummary: { type: 'string', description: 'Brief summary of what you accomplished in this step' }
    },
    required: ['featureSlug', 'taskId', 'role', 'stepNumber', 'stepSummary']
  }
}
```

**Benefit**: Creates a paper trail of LLM actions, helps debugging and ensures systematic execution.

---

### 🔧 **Improvement 7: Workflow Execution Summary**

**Enhance Step 7 instructions in refine-feature.md**:

```markdown
# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)

**CRITICAL WORKFLOW**: This step is fully orchestrated by the MCP server. You MUST follow this exact sequence for EVERY task.

## 7.0 - Initialize
- Call `get_tasks_by_status` with status "PendingProductDirector" to get all tasks needing review
- Store the list of task IDs to process

## 7.1 - For Each Task: Get Next Step
**REQUIRED TOOL**: `get_next_step(featureSlug, taskId)`

**What you receive**:
- `nextRole`: The stakeholder role you must adopt
- `systemPrompt`: COMPLETE instructions - follow these EXACTLY
- `requiredOutputFields`: Fields you MUST populate
- `researchInstructions`: Research you MUST conduct
- `loopGuidance`: Tells you what to do after this review

**IMPORTANT**: Read the `systemPrompt` completely. It contains numbered steps you MUST follow in sequence.

## 7.2 - Execute Role (FOLLOW SYSTEM PROMPT EXACTLY)

The systemPrompt contains 5 numbered steps. Execute them IN ORDER:

### Typical Steps (varies by role):
1. **Research** - Use WebSearch tool per `researchInstructions`
2. **Analysis** - Analyze task against role criteria
3. **Evaluation** - Apply decision criteria
4. **Decision** - Choose approve/reject with justification
5. **Submit** - Call add_stakeholder_review

**TRACKING**: Call `record_step_progress` after completing each numbered step in the systemPrompt.

**VALIDATION**: Before submitting, call `validate_review_ready` to verify all required fields are populated.

## 7.3 - Submit Review
**REQUIRED TOOL**: `add_stakeholder_review(featureSlug, taskId, stakeholder, decision, notes, additionalFields)`

**CRITICAL**: You MUST provide ALL `requiredOutputFields` in `additionalFields` or the submission will be REJECTED.

**Error handling**: If you receive an error about missing fields, fix them and re-call add_stakeholder_review.

## 7.4 - Loop Control
After successful submission:

1. Call `get_next_step(featureSlug, taskId)` again for the SAME task
2. Check `loopGuidance.nextAction`:
   - If it says "Execute [role] review", go back to Step 7.2 with new role
   - If it says "Call get_next_step for next task", move to the next task in your list
   - If it says "All tasks complete", proceed to Step 8

**VERIFICATION**: After processing all tasks, call `verify_all_tasks_complete(featureSlug)` to confirm all tasks reached "ReadyForDevelopment" status.

## 7.5 - Step 7 Completion
When `verify_all_tasks_complete` returns `allComplete: true`:
- Write to output file: "Step 7 completed - All [N] tasks reviewed by all stakeholders and are ReadyForDevelopment"
- Proceed to Step 8
```

---

## Implementation Priority

### High Priority (Implement First)
1. ✅ **Strict Field Validation** (Improvement 1) - Prevents incomplete reviews
2. ✅ **Enhanced Loop Guidance** (Improvement 4) - Prevents infinite loops and ensures completion
3. ✅ **Pre-Submit Validation Tool** (Improvement 5) - Reduces errors and retries

### Medium Priority
4. ⚠️ **Action-Based System Prompts** (Improvement 2) - Improves consistency
5. ⚠️ **Workflow Execution Summary** (Improvement 7) - Better documentation in refine-feature.md

### Low Priority (Nice to Have)
6. 💡 **Research Verification Tool** (Improvement 3) - Additional quality control
7. 💡 **Step Progress Tracker** (Improvement 6) - Useful for debugging

---

## Expected Outcomes

After implementing these improvements:

### ✅ **Reduced Errors**
- LLM cannot submit incomplete reviews
- Validation happens before submission, not after

### ✅ **Consistent Execution**
- Numbered steps eliminate ambiguity
- Every role follows same pattern: Research → Analyze → Decide → Submit

### ✅ **Complete Coverage**
- Loop guidance ensures all tasks are processed
- Explicit termination condition prevents premature exits

### ✅ **Better Debugging**
- Progress tracking shows exactly which step failed
- Clear error messages guide LLM to fix issues

### ✅ **Enforced Quality**
- Research requirements create accountability
- Pre-submit validation catches issues early

---

## Code Changes Required

### Files to Modify

1. **`src/index.ts`**
   - Add `validate_review_ready` tool definition
   - Add `record_step_progress` tool definition
   - Add `verify_research_completed` tool definition
   - Modify `add_stakeholder_review` handler to validate required fields

2. **`src/TaskReviewManager.ts`**
   - Add `validateReviewReady` method
   - Add `recordStepProgress` method
   - Add `verifyResearchCompleted` method
   - Modify `getNextStep` to include `loopGuidance`
   - Modify `addReview` to validate required fields

3. **`src/rolePrompts.ts`**
   - Restructure all system prompts as numbered action steps
   - Make language more directive and imperative
   - Add explicit tool call instructions in each step

4. **`src/types.ts`**
   - Add `LoopGuidance` interface
   - Add `ValidateReviewReadyInput` and `Result` types
   - Add `RecordStepProgressInput` and `Result` types
   - Add `VerifyResearchInput` and `Result` types

5. **`.claude/commands/refine-feature.md`**
   - Replace Step 7 with enhanced version (see Improvement 7)
   - Add explicit error handling instructions
   - Add validation checkpoints

---

## Testing Strategy

### Test Case 1: Missing Required Fields
**Setup**: Attempt to submit review without `marketAnalysis`
**Expected**: Error with message listing missing fields
**Validates**: Improvement 1 (Strict Field Validation)

### Test Case 2: Pre-Submit Validation
**Setup**: Call `validate_review_ready` with incomplete review
**Expected**: Returns `ready: false` with specific errors
**Validates**: Improvement 5 (Pre-Submit Validation)

### Test Case 3: Loop Completion
**Setup**: Process all tasks through full review cycle
**Expected**: `loopGuidance` correctly indicates when to stop
**Validates**: Improvement 4 (Enhanced Loop Guidance)

### Test Case 4: Insufficient Research
**Setup**: Call `verify_research_completed` with < 2 searches
**Expected**: Warning about insufficient research
**Validates**: Improvement 3 (Research Verification)

---

## Conclusion

These improvements transform the MCP server from a **passive orchestrator** to an **active enforcer** of the workflow. The LLM will have:

1. **Clear instructions** (numbered steps)
2. **Immediate feedback** (validation tools)
3. **Forced compliance** (required field validation)
4. **Loop clarity** (explicit next actions)

This significantly increases the probability that the LLM will follow the refine-feature workflow exactly as designed, without improvisation or skipped steps.
