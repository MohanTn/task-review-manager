# Refine-Feature Command Update Summary

**Date**: 2026-02-17
**Purpose**: Fix critical pain points to ensure LLMs follow Step 7 instructions exactly as specified

---

## Files Updated

### 1. `.claude/commands/refine-feature.md`
- **Status**: ✅ Updated
- **Changes**: Completely rewrote Step 7 with enhanced instructions

### 2. `.github/prompts/refine-feature.prompt.md`
- **Status**: ✅ Updated (synchronized with commands file)
- **Changes**: Same Step 7 improvements, different output path

---

## What Was Changed

### Step 7: Stakeholder Review Cycle

#### **Before** (39 lines, passive instructions):
```markdown
# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)
**CRITICAL: The MCP server orchestrates...**

- For each task in the feature, execute the following loop...
  ## 7.1 - Get Next Step
  - Call get_next_step with...
  ## 7.2 - Execute Role
  - Adopt the nextRole identity
  - Follow the systemPrompt instructions exactly
  ## 7.3 - Submit Review
  - Call add_stakeholder_review with...
  ## 7.4 - Loop
  - Call get_next_step again...
```

#### **After** (211 lines, directive instructions):
```markdown
# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)
**⚠️ CRITICAL INSTRUCTIONS - READ COMPLETELY BEFORE STARTING ⚠️**

## 7.0 - Initialize Task List
## 7.1 - FOR EACH TASK: Get Next Step
## 7.2 - Execute Role (FOLLOW SYSTEM PROMPT EXACTLY)
  - STEP 1: Conduct Research (with ✅/❌ checklist)
  - STEP 2: Analyze Task
  - STEP 3: Evaluate Against Role Criteria
  - STEP 4: Make Decision
  - STEP 5: Prepare Required Fields
## 7.3 - Submit Review (with validation checkpoint)
## 7.4 - Loop Control (with CASE A/B/C/D logic)
## 7.5 - Verification (mandatory before Step 8)
## 7.6 - Common Mistakes to AVOID
## 7.7 - Step 7 Checklist
```

---

## Key Improvements

### ✅ **1. Explicit Task Initialization (7.0)**
**Problem**: LLM didn't know to get all tasks upfront
**Solution**: Added Step 7.0 requiring `get_tasks_by_status` call to create tracking list

### ✅ **2. Mandatory 5-Step Execution Pattern (7.2)**
**Problem**: System prompts were passive, LLM could skip steps
**Solution**: Broke down execution into 5 numbered steps with ✅/❌ checklists:
- STEP 1: Conduct Research (explicit WebSearch requirement)
- STEP 2: Analyze Task (read all context)
- STEP 3: Evaluate (apply criteria)
- STEP 4: Make Decision (approve/reject with justification)
- STEP 5: Prepare Required Fields (populate ALL fields)

### ✅ **3. Pre-Submission Validation Checkpoint (7.3)**
**Problem**: LLM could submit incomplete reviews
**Solution**: Added validation checklist before `add_stakeholder_review`:
- ✅ Completed ALL 5 steps
- ✅ Conducted web research
- ✅ Written detailed notes (100-300 words)
- ✅ Populated ALL requiredOutputFields
- ✅ Made clear decision with justification

### ✅ **4. Explicit Error Handling (7.3)**
**Problem**: LLM didn't know what to do on error
**Solution**: Added ERROR HANDLING section:
- Missing required fields → Review, add, re-submit
- Workflow validation failed → Call get_next_step again

### ✅ **5. Case-Based Loop Control (7.4)**
**Problem**: Loop termination was ambiguous
**Solution**: Added explicit CASE A/B/C/D decision logic:
- **CASE A**: Still in review → GO BACK to 7.2 with new role
- **CASE B**: ReadyForDevelopment → MOVE to next task
- **CASE C**: NeedsRefinement → MOVE to next task (manual intervention)
- **CASE D**: No more tasks → PROCEED to 7.5

### ✅ **6. Mandatory Verification (7.5)**
**Problem**: LLM could skip to Step 8 without checking all tasks
**Solution**: Added BLOCKING REQUIREMENT to verify all tasks before Step 8:
- Call `get_tasks_by_status(featureSlug, "ReadyForDevelopment")`
- Compare count with total tasks from Step 6
- If mismatch → Find stuck tasks, report, DO NOT proceed
- If match → Write summary, PROCEED to Step 8

### ✅ **7. Common Mistakes Section (7.6)**
**Problem**: LLM made predictable errors
**Solution**: Listed 7 explicit "DO NOT" commands:
- ❌ DO NOT skip web research
- ❌ DO NOT submit without all fields
- ❌ DO NOT forget to loop back
- ❌ DO NOT move to next task prematurely
- ❌ DO NOT proceed without verification
- ❌ DO NOT improvise or deviate
- ❌ DO NOT make assumptions

### ✅ **8. Completion Checklist (7.7)**
**Problem**: No way to verify Step 7 completion
**Solution**: Added 8-item checklist that MUST be completed before Step 8

---

## Language Changes

### Before → After

| Before | After |
|--------|-------|
| "Call `get_next_step`..." | "**REQUIRED TOOL CALL**: `get_next_step`..." |
| "Follow the systemPrompt instructions exactly" | "You MUST execute these steps IN SEQUENCE. Do NOT skip any step." |
| "Research the focusAreas..." | "✅ USE the WebSearch tool as specified\n❌ DO NOT skip research" |
| "Populate all requiredOutputFields" | "✅ POPULATE ALL fields...\n❌ DO NOT proceed until ALL required fields are ready" |
| "Call get_next_step again" | "**REQUIRED TOOL CALL**: `get_next_step(featureSlug, taskId)` for the SAME taskId" |
| "If task is still in review phase..." | "**CASE A: Task still in review phase**\n➡️ ACTION: The task needs another stakeholder review\n➡️ GO BACK to Step 7.2..." |

**Pattern**: Passive → Directive, Implicit → Explicit, Ambiguous → Case-based

---

## Visual Improvements

### Added Visual Markers:
- ⚠️ for critical warnings
- ✅ for required actions / success states
- ❌ for forbidden actions / errors
- ➡️ for next actions
- **BLOCKING REQUIREMENT** for must-do items
- **CRITICAL VALIDATION CHECKPOINT** for verification steps

### Added Structure:
- Numbered substeps (7.0, 7.1, 7.2, etc.)
- STEP 1/2/3/4/5 within each role execution
- CASE A/B/C/D for decision logic
- Before/After checklists

---

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines in Step 7 | 39 | 211 | +441% |
| Explicit instructions | ~10 | ~50 | +400% |
| Validation checkpoints | 0 | 3 | New |
| Error handling sections | 0 | 2 | New |
| Case-based logic | 0 | 4 cases | New |
| Checklists | 0 | 2 | New |
| Visual markers | 0 | ~60 | New |

---

## Expected Outcomes

### 🎯 **Before Update** (Predicted LLM Behavior):
1. Skip web research, rely on training data ❌
2. Submit reviews without all required fields ❌
3. Forget to loop back for next stakeholder ❌
4. Move to next task before current task complete ❌
5. Skip verification, proceed to Step 8 prematurely ❌
6. Improvise instead of following system prompt ❌

### 🎯 **After Update** (Expected LLM Behavior):
1. Always use WebSearch tool (explicit requirement) ✅
2. Populate ALL required fields (validation checkpoint) ✅
3. Loop correctly through all stakeholders (CASE logic) ✅
4. Process all tasks completely (tracking list) ✅
5. Verify all tasks before Step 8 (BLOCKING requirement) ✅
6. Follow system prompt exactly (5-step pattern) ✅

---

## Testing Recommendations

To verify the improvements work:

1. **Test Research Enforcement**: Monitor if WebSearch is called in EVERY review
2. **Test Field Validation**: Attempt to submit review without all fields, verify error
3. **Test Loop Control**: Verify CASE A/B/C/D logic is followed correctly
4. **Test Verification**: Ensure Step 7.5 is called before Step 8
5. **Test Checklist**: Verify all 8 checklist items are addressed

---

## Next Steps

### Immediate:
- ✅ Command file updated: `.claude/commands/refine-feature.md`
- ✅ Prompt template updated: `.github/prompts/refine-feature.prompt.md`

### Recommended (from analysis doc):
1. **Implement validation in MCP server**:
   - Add field validation in `add_stakeholder_review`
   - Add `loopGuidance` to `get_next_step` response
   - Add `validate_review_ready` tool

2. **Update role prompts**:
   - Restructure system prompts as numbered STEP 1/2/3/4/5
   - Make language more imperative
   - Add explicit tool call instructions

3. **Test with real workflow**:
   - Run refine-feature on a test feature
   - Monitor if LLM follows all steps exactly
   - Identify any remaining gaps

---

## Conclusion

The updated refine-feature command transforms Step 7 from **39 lines of passive guidance** to **211 lines of explicit, directive, checkpointed instructions**.

Every critical pain point identified in the analysis has been addressed:
- ✅ No validation → Pre-submission validation checkpoint
- ✅ Passive prompts → 5-step execution pattern with checklists
- ✅ No research enforcement → Explicit WebSearch requirements
- ✅ Unclear loops → CASE-based decision logic
- ✅ No verification → Mandatory Step 7.5 before Step 8

The LLM now has a **step-by-step playbook** with **no room for improvisation**, ensuring the workflow is followed exactly as designed.
