# Refine-Feature Command Update Summary

**Date**: 2026-02-17
**Purpose**: Eliminate .md file manipulation and implement multi-repo MCP-based workflow

---

## ✅ **Command Updated Successfully**

**Files Modified**:
- ✅ `.claude/commands/refine-feature.md` (Main command file)
- ✅ `.github/prompts/refine-feature.prompt.md` (Prompt template)

---

## 🔄 **Major Changes**

### **1. NEW Step 0: Repository Context Initialization**

**Added**: Auto-detection and registration of current repository

```javascript
// NEW: Step 0.1
get_current_repo() // Auto-detect repo from working directory

// NEW: Step 0.2 (conditional)
register_repo(repoName, repoPath, repoUrl) // Register if not already registered

// NEW: Step 0.3
// Store repoName for use in ALL subsequent steps
```

**Why**: Every MCP tool now requires `repoName` parameter for multi-repo support.

---

### **2. ELIMINATED: .md File Manipulation**

#### **Before** (Old Command):
```markdown
# Step 1
- Determine scope
- add Step 1 completed into output file ❌ STRING MANIPULATION
```

#### **After** (New Command):
```markdown
# Step 1
- Determine scope
- Call update_refinement_step(repoName, featureSlug, 1, completed: true, summary, data) ✅ MCP TOOL
```

**Change Applied To**:
- ✅ Step 1: `update_refinement_step` instead of writing to .md
- ✅ Step 2: `add_attachment_analysis` + `update_refinement_step`
- ✅ Step 3: `add_clarification` + `update_refinement_step`
- ✅ Step 4: `add_acceptance_criteria` + `update_refinement_step`
- ✅ Step 5: `add_test_scenarios` + `update_refinement_step`
- ✅ Step 6: `create_feature` + `add_task` + `update_refinement_step`
- ✅ Step 7: Stakeholder reviews (already used MCP tools, added `repoName`)
- ✅ Step 8: `get_refinement_status` + optional `generate_refinement_report`

---

### **3. NEW: MCP Tools per Step**

| Step | Old Approach | New MCP Tools |
|------|--------------|---------------|
| 0 | N/A | `get_current_repo`, `register_repo` |
| 1 | Write to .md | `update_refinement_step` |
| 2 | Write to .md | `add_attachment_analysis`, `update_refinement_step` |
| 3 | Write to .md | `add_clarification`, `update_refinement_step` |
| 4 | Write to .md | `add_acceptance_criteria`, `update_refinement_step` |
| 5 | Write to .md | `add_test_scenarios`, `update_refinement_step` |
| 6 | `create_feature`, `add_task` | Same + `update_refinement_step` |
| 7 | Stakeholder tools | Same + `repoName` parameter |
| 8 | Update Jira | `get_refinement_status`, `generate_refinement_report` |

---

### **4. UPDATED: All Tool Calls Include repoName**

**Before**:
```javascript
create_feature(featureSlug, featureName)
add_task(featureSlug, taskId, ...)
get_tasks_by_status(featureSlug, status)
```

**After**:
```javascript
create_feature(repoName, featureSlug, featureName)
add_task(repoName, featureSlug, taskId, ...)
get_tasks_by_status(repoName, featureSlug, status)
```

**Updated in**:
- Step 6: `create_feature`, `add_task`
- Step 7: `get_tasks_by_status`, `get_next_step`, `add_stakeholder_review`
- Step 8: `get_refinement_status`, `generate_refinement_report`

---

### **5. OPTIONAL: Report Generation in Step 8**

#### **Before**:
```markdown
# Step 8
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- Update Jira ticket
```

#### **After**:
```markdown
# Step 8.1
- Get all data: get_refinement_status(repoName, featureSlug)

# Step 8.2 (OPTIONAL)
- Generate report: generate_refinement_report(repoName, featureSlug, "markdown")
  (Only if user wants .md file for archival/sharing)

# Step 8.3
- Update Jira with data from database
```

**Key Change**: .md report is now **optional** and **generated from database**, not manually written.

---

## 📋 **Workflow Comparison**

### **Old Workflow**:
```
Step 1 → Write to .md file
Step 2 → Append to .md file
Step 3 → Append to .md file
Step 4 → Append to .md file
Step 5 → Append to .md file
Step 6 → Create tasks in DB
Step 7 → Stakeholder reviews in DB
Step 8 → Append to .md file, update Jira

Result: .md file with all refinement data
```

### **New Workflow**:
```
Step 0 → Detect/register repo
Step 1 → Store scope in DB
Step 2 → Store attachment analysis in DB
Step 3 → Store clarifications in DB
Step 4 → Store acceptance criteria in DB
Step 5 → Store test scenarios in DB
Step 6 → Create feature + tasks in DB
Step 7 → Stakeholder reviews in DB (with repoName)
Step 8 → Get data from DB, optionally generate .md report

Result: All data in tasks.db, optional .md report
```

---

## 🎯 **Benefits**

### **For LLM Execution**:
1. ✅ **No string manipulation** - Just structured API calls
2. ✅ **No file path management** - Database handles storage
3. ✅ **No markdown formatting** - JSON data validated by schema
4. ✅ **Clear success/failure** - Tool returns explicit status
5. ✅ **Resumable** - Query `get_refinement_status` anytime

### **For Data Integrity**:
1. ✅ **Atomic operations** - Database transactions
2. ✅ **Schema validation** - Can't insert invalid data
3. ✅ **Queryable** - SQL access to all refinement data
4. ✅ **Multi-repo support** - Single database, isolated namespaces
5. ✅ **No partial writes** - Either all data saved or none

### **For Users**:
1. ✅ **Single source of truth** - All data in tasks.db
2. ✅ **Rich queries** - Find features by criteria, status, etc.
3. ✅ **Multi-repo workflows** - Work on multiple projects seamlessly
4. ✅ **Optional reports** - Generate .md only when needed
5. ✅ **Backup/restore** - Single file to backup

---

## 🔧 **New Tools Required (Not Yet Implemented)**

The command now uses these tools which need to be implemented:

### **Repo Management** (3 tools):
- [ ] `get_current_repo()` - Auto-detect current repo
- [ ] `register_repo(repoName, repoPath, repoUrl?)` - Register a repo
- [ ] `list_repos()` - List all registered repos

### **Refinement Data** (6 tools):
- [ ] `update_refinement_step(repoName, featureSlug, stepNumber, completed, summary, data)` - Record step completion
- [ ] `add_acceptance_criteria(repoName, featureSlug, criteria[])` - Store ACs
- [ ] `add_test_scenarios(repoName, featureSlug, scenarios[])` - Store test scenarios
- [ ] `add_clarification(repoName, featureSlug, question, answer?)` - Store Q&A
- [ ] `add_attachment_analysis(repoName, featureSlug, attachmentName, analysis)` - Store attachment analysis
- [ ] `get_refinement_status(repoName, featureSlug)` - Get progress overview

### **Report Generation** (1 tool):
- [ ] `generate_refinement_report(repoName, featureSlug, format, outputPath?)` - Generate .md from DB

### **Updated Existing Tools** (All task-related tools):
- [ ] `create_feature(repoName, ...)` - Add repoName parameter
- [ ] `add_task(repoName, ...)` - Add repoName parameter
- [ ] `get_tasks_by_status(repoName, ...)` - Add repoName parameter
- [ ] `get_next_step(repoName, ...)` - Add repoName parameter
- [ ] `add_stakeholder_review(repoName, ...)` - Add repoName parameter
- [ ] ... and all other task-related tools

---

## 📊 **Lines of Code Impact**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total lines | 113 | 584 | +471 (+417%) |
| Steps | 8 | 9 (added Step 0) | +1 |
| Tool calls per workflow | ~10 | ~30+ | +200% |
| .md file writes | 8 | 0 (optional in Step 8) | -100% |
| Database writes | 2 (tasks, reviews) | 9 (all steps) | +350% |

**Why more lines?**: Much more detailed, explicit instructions for LLM to follow exactly.

---

## ⚠️ **Breaking Changes**

### **1. Command Execution Will Fail**
Until new MCP tools are implemented, the command will fail with errors like:
```
Error: Unknown tool: get_current_repo
Error: Unknown tool: update_refinement_step
Error: Unknown tool: add_acceptance_criteria
```

### **2. Existing Tool Signatures Changed**
All task-related tools now require `repoName` as first parameter:
```javascript
// Old call (will fail)
add_task(featureSlug: "user-auth", taskId: "T01", ...)

// New call (required)
add_task(repoName: "task-review-manager", featureSlug: "user-auth", taskId: "T01", ...)
```

---

## 🚀 **Next Steps to Make Command Functional**

### **Phase 1: Database Schema** (Required First)
```bash
sqlite3 tasks.db < .claude/artifacts/multi-repo-schema.sql
```

Creates tables:
- `repos`
- `feature_refinement_steps`
- `feature_acceptance_criteria`
- `feature_test_scenarios`
- `feature_clarifications`
- `feature_attachments`

### **Phase 2: Implement New MCP Tools**
Follow the implementation plan in `.claude/artifacts/implementation-plan.md`

Implement 10 new tools:
1. Repo management tools (3)
2. Refinement data tools (6)
3. Report generation tool (1)

### **Phase 3: Update Existing MCP Tools**
Add `repoName` parameter to all existing task-related tools (15+ tools).

### **Phase 4: Test Command**
Run complete refinement workflow end-to-end to verify all tools work.

---

## 📝 **Migration Guide for Existing Users**

### **If you have existing features in the database**:

1. **Backup database**:
   ```bash
   cp tasks.db tasks.db.backup
   ```

2. **Run migration**:
   ```bash
   sqlite3 tasks.db < .claude/artifacts/multi-repo-schema.sql
   ```

3. **Register current repo**:
   ```javascript
   register_repo(
     repoName: "task-review-manager",
     repoPath: process.cwd()
   )
   ```

4. **Migrate existing data**:
   ```sql
   UPDATE features SET repo_name = 'task-review-manager' WHERE repo_name IS NULL;
   UPDATE tasks SET repo_name = 'task-review-manager' WHERE repo_name IS NULL;
   ```

---

## 📚 **Documentation to Update**

After implementation:
- [ ] README.md - Add multi-repo usage section
- [ ] Architecture diagram - Show multi-repo structure
- [ ] API docs - Document new tools
- [ ] Examples - Add multi-repo workflow examples

---

## ✅ **Summary**

The refine-feature command has been **completely rewritten** to:
1. ✅ **Eliminate .md file manipulation** (Steps 1-7)
2. ✅ **Use MCP database exclusively** for all data storage
3. ✅ **Support multi-repo workflows** via `repoName` parameter
4. ✅ **Provide optional report generation** (Step 8)
5. ✅ **Follow structured, validated API calls** instead of string manipulation

**Status**: Command updated ✅, but MCP tools **not yet implemented** ⚠️

**Next**: Implement the MCP tools to make the command functional!
