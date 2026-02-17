# Multi-Repo MCP Implementation Plan

## 🎯 **Objective**
Transform task-review-manager to support multiple repositories with a single tasks.db file, eliminating .md file manipulation for better LLM execution.

---

## 📋 **Summary of Changes**

### **What's Changing**:
1. ❌ **Remove**: .md file creation/updates in Steps 1-7
2. ✅ **Add**: MCP tools for structured data storage
3. ✅ **Add**: Multi-repo support with `repo_name` namespace
4. ✅ **Add**: Dashboard repo selector
5. ✅ **Update**: All existing MCP tools to accept `repoName` parameter

### **What's Staying**:
- ✅ Stakeholder review workflow (Step 7) - only add `repoName` param
- ✅ Task status transitions
- ✅ Dashboard (enhanced with repo selector)
- ✅ Single `tasks.db` file

---

## 🗓️ **Implementation Phases**

### **Phase 1: Database Schema Migration** (Est: 2-3 hours)
**Goal**: Update database to support multi-repo + refinement data

#### Tasks:
1. **Backup existing database**
   ```bash
   cp tasks.db tasks.db.backup
   ```

2. **Run schema migration**
   - Execute `multi-repo-schema.sql`
   - Adds new tables:
     - `repos`
     - `feature_refinement_steps`
     - `feature_acceptance_criteria`
     - `feature_test_scenarios`
     - `feature_clarifications`
     - `feature_attachments`
   - Adds `repo_name` column to existing tables:
     - `features`
     - `tasks`
     - `task_transitions`
     - `stakeholder_reviews`
   - Creates views:
     - `v_feature_refinement_progress`
     - `v_task_status_summary`
     - `v_repo_summary`

3. **Migrate existing data**
   ```sql
   -- Detect current repo from file system
   -- For now, use "default" or auto-detect from path

   -- Option A: Default repo
   INSERT INTO repos (repo_name, repo_path, created_at, last_accessed_at)
   VALUES ('default', '', datetime('now'), datetime('now'));

   UPDATE features SET repo_name = 'default' WHERE repo_name IS NULL;
   UPDATE tasks SET repo_name = 'default' WHERE repo_name IS NULL;
   UPDATE task_transitions SET repo_name = 'default' WHERE repo_name IS NULL;
   UPDATE stakeholder_reviews SET repo_name = 'default' WHERE repo_name IS NULL;

   -- Option B: Auto-detect from database location
   -- Use actual repo name from current working directory
   ```

4. **Verify migration**
   ```sql
   -- Check all tables have repo_name
   SELECT COUNT(*) FROM features WHERE repo_name IS NOT NULL;
   SELECT COUNT(*) FROM tasks WHERE repo_name IS NOT NULL;

   -- Verify views work
   SELECT * FROM v_repo_summary;
   SELECT * FROM v_feature_refinement_progress;
   ```

**Deliverable**: Updated `tasks.db` with multi-repo schema

---

### **Phase 2: Core MCP Tools** (Est: 4-5 hours)
**Goal**: Implement new MCP tools for refinement workflow

#### Tasks:
1. **Implement Repo Management Tools**
   - `register_repo` - Register a git repository
   - `list_repos` - List all registered repos
   - `get_current_repo` - Auto-detect current repo from cwd

2. **Implement Refinement Data Tools**
   - `update_refinement_step` - Mark step complete with data
   - `add_acceptance_criteria` - Store ACs
   - `add_test_scenarios` - Store test scenarios
   - `add_clarification` - Store Q&A
   - `add_attachment_analysis` - Store attachment analysis
   - `get_refinement_status` - Get progress overview
   - `generate_refinement_report` - Generate .md from database

3. **Create TypeScript interfaces**
   ```typescript
   // src/types.ts - Add new interfaces

   interface Repo {
     repoName: string;
     repoPath: string;
     repoUrl?: string;
     defaultBranch: string;
     createdAt: string;
     lastAccessedAt: string;
     metadata?: Record<string, any>;
   }

   interface RefinementStep {
     stepNumber: number;
     stepName: string;
     completed: boolean;
     completedAt?: string;
     summary?: string;
     data?: Record<string, any>;
   }

   interface AcceptanceCriterion {
     criterionId: string;
     criterion: string;
     priority: 'Must Have' | 'Should Have' | 'Could Have';
     source: 'user' | 'generated' | 'attachment';
   }

   interface TestScenario {
     scenarioId: string;
     title: string;
     description: string;
     priority: 'P0' | 'P1' | 'P2' | 'P3';
     type: 'automated' | 'manual' | 'both';
     preconditions?: string;
     expectedResult?: string;
   }

   interface Clarification {
     question: string;
     answer?: string;
     askedAt: string;
     answeredAt?: string;
     askedBy: 'llm' | 'user';
   }
   ```

4. **Implement database access methods**
   ```typescript
   // src/DatabaseHandler.ts - Add methods

   class DatabaseHandler {
     // Repo methods
     registerRepo(repo: Repo): void
     getRepo(repoName: string): Repo | null
     getAllRepos(): Repo[]
     getCurrentRepo(): Repo | null

     // Refinement step methods
     updateRefinementStep(repoName: string, featureSlug: string, step: RefinementStep): void
     getRefinementSteps(repoName: string, featureSlug: string): RefinementStep[]

     // Acceptance criteria methods
     addAcceptanceCriteria(repoName: string, featureSlug: string, criteria: AcceptanceCriterion[]): void
     getAcceptanceCriteria(repoName: string, featureSlug: string): AcceptanceCriterion[]

     // Test scenario methods
     addTestScenarios(repoName: string, featureSlug: string, scenarios: TestScenario[]): void
     getTestScenarios(repoName: string, featureSlug: string): TestScenario[]

     // Clarification methods
     addClarification(repoName: string, featureSlug: string, clarification: Clarification): number
     getClarifications(repoName: string, featureSlug: string): Clarification[]

     // Refinement status
     getRefinementStatus(repoName: string, featureSlug: string): RefinementStatus

     // Report generation
     generateRefinementReport(repoName: string, featureSlug: string, format: string): string
   }
   ```

5. **Add tool definitions to index.ts**
   ```typescript
   // src/index.ts - Add to TOOLS array

   const TOOLS = [
     // ... existing tools ...

     // Repo management
     { name: 'register_repo', description: '...', inputSchema: {...} },
     { name: 'list_repos', description: '...', inputSchema: {...} },
     { name: 'get_current_repo', description: '...', inputSchema: {...} },

     // Refinement data
     { name: 'update_refinement_step', description: '...', inputSchema: {...} },
     { name: 'add_acceptance_criteria', description: '...', inputSchema: {...} },
     { name: 'add_test_scenarios', description: '...', inputSchema: {...} },
     { name: 'add_clarification', description: '...', inputSchema: {...} },
     { name: 'add_attachment_analysis', description: '...', inputSchema: {...} },
     { name: 'get_refinement_status', description: '...', inputSchema: {...} },
     { name: 'generate_refinement_report', description: '...', inputSchema: {...} },
   ];
   ```

6. **Add tool handlers**
   ```typescript
   // src/index.ts - Add cases to switch statement

   case 'register_repo': {
     const result = await reviewManager.registerRepo({
       repoName: args.repoName as string,
       repoPath: args.repoPath as string,
       repoUrl: args.repoUrl as string | undefined,
       defaultBranch: args.defaultBranch as string | undefined,
       metadata: args.metadata as any
     });
     return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
   }

   // ... similar for all new tools ...
   ```

**Deliverable**: New MCP tools available for use

---

### **Phase 3: Update Existing MCP Tools** (Est: 2-3 hours)
**Goal**: Add `repoName` parameter to all existing task-related tools

#### Tasks:
1. **Update tool signatures**
   - `create_feature(repoName, featureSlug, featureName)`
   - `add_task(repoName, featureSlug, taskId, ...)`
   - `get_tasks_by_status(repoName, featureSlug, status)`
   - `get_next_step(repoName, featureSlug, taskId)`
   - `add_stakeholder_review(repoName, featureSlug, taskId, ...)`
   - ... etc. for all task tools

2. **Update database queries**
   ```typescript
   // Before:
   SELECT * FROM tasks WHERE feature_slug = ?

   // After:
   SELECT * FROM tasks WHERE repo_name = ? AND feature_slug = ?
   ```

3. **Add validation**
   ```typescript
   // Verify repo exists before operating on it
   const repo = this.dbHandler.getRepo(repoName);
   if (!repo) {
     throw new Error(`Repository not found: ${repoName}`);
   }
   ```

4. **Update TaskReviewManager methods**
   - Add `repoName` as first parameter to all methods
   - Update all SQL queries to include `repo_name` filter

**Deliverable**: All existing tools updated with `repoName` support

---

### **Phase 4: Dashboard Enhancement** (Est: 3-4 hours)
**Goal**: Add repo selector and update UI for multi-repo support

#### Tasks:
1. **Add Backend API Endpoints**
   ```typescript
   // src/dashboard.ts

   app.get('/api/repos', async (req, res) => {
     const repos = await reviewManager.getAllRepos();
     res.json({ repos });
   });

   app.get('/api/repos/:repoName/features', async (req, res) => {
     const features = await reviewManager.getFeaturesByRepo(req.params.repoName);
     res.json({ repoName: req.params.repoName, features });
   });

   app.get('/api/repos/:repoName/features/:featureSlug', async (req, res) => {
     const data = await reviewManager.getFeatureDetails(
       req.params.repoName,
       req.params.featureSlug
     );
     res.json(data);
   });
   ```

2. **Update Frontend HTML**
   - Add Repository dropdown before Feature dropdown
   - Add Repository Summary section
   - Add Acceptance Criteria section (collapsible)
   - Add Test Scenarios section (collapsible)

3. **Add Frontend JavaScript**
   ```javascript
   // Cascading dropdowns
   repoSelector.addEventListener('change', () => {
     const repoName = repoSelector.value;
     loadFeaturesForRepo(repoName);
     localStorage.setItem('lastSelectedRepo', repoName);
   });

   featureSelector.addEventListener('change', () => {
     const featureSlug = featureSelector.value;
     const repoName = repoSelector.value;
     loadFeatureDetails(repoName, featureSlug);
     localStorage.setItem('lastSelectedFeature', featureSlug);
   });

   // Load last selection on page load
   window.addEventListener('load', () => {
     const lastRepo = localStorage.getItem('lastSelectedRepo');
     const lastFeature = localStorage.getItem('lastSelectedFeature');
     if (lastRepo) {
       repoSelector.value = lastRepo;
       loadFeaturesForRepo(lastRepo);
       if (lastFeature) {
         featureSelector.value = lastFeature;
         loadFeatureDetails(lastRepo, lastFeature);
       }
     }
   });
   ```

4. **Add CSS Styling**
   - Style repository dropdown
   - Add color coding (blue for repos, green for features)
   - Add responsive layout for mobile

**Deliverable**: Enhanced dashboard with repo selector

---

### **Phase 5: Update refine-feature Command** (Est: 1-2 hours)
**Goal**: Replace .md file manipulation with MCP tool calls

#### Tasks:
1. **Replace refine-feature.md**
   - Copy `refine-feature-mcp-only.md` to `.claude/commands/refine-feature.md`
   - Update front matter (name, description)

2. **Update each step**
   - Step 0: Add repo detection/registration
   - Steps 1-7: Replace "add to output file" with MCP tool calls
   - Step 8: Add optional report generation

3. **Test workflow**
   - Run through complete refinement workflow
   - Verify data stored in database
   - Verify no .md files created (except Step 8 if requested)

**Deliverable**: Updated refine-feature command using MCP tools

---

### **Phase 6: Testing & Validation** (Est: 2-3 hours)
**Goal**: Ensure multi-repo isolation and data integrity

#### Test Cases:
1. **Multi-Repo Isolation**
   ```
   ✓ Register 2 repos: repo-a, repo-b
   ✓ Create feature "auth" in repo-a
   ✓ Create feature "auth" in repo-b (same slug, different repo)
   ✓ Add tasks to repo-a/auth
   ✓ Verify repo-b/auth has 0 tasks
   ✓ Query get_tasks_by_status(repo-a, auth, "PendingProductDirector")
   ✓ Verify only repo-a tasks returned
   ```

2. **Refinement Workflow**
   ```
   ✓ Run refine-feature for repo-a/feature-x
   ✓ Complete Steps 1-5 using MCP tools
   ✓ Verify NO .md files created
   ✓ Query get_refinement_status(repo-a, feature-x)
   ✓ Verify all step data stored correctly
   ✓ Generate report in Step 8
   ✓ Verify .md file created from database data
   ```

3. **Dashboard**
   ```
   ✓ Open dashboard
   ✓ Select repo-a from dropdown
   ✓ Verify only repo-a features shown
   ✓ Select repo-b from dropdown
   ✓ Verify only repo-b features shown
   ✓ Verify no cross-repo data leakage
   ✓ Refresh page, verify last selection restored
   ```

4. **Error Handling**
   ```
   ✓ Call tool with non-existent repoName → Error
   ✓ Call tool with non-existent featureSlug → Error
   ✓ Try to create duplicate feature in same repo → Error
   ✓ Try to add task without create_feature first → Error
   ```

**Deliverable**: Comprehensive test suite passing

---

## 📊 **Implementation Tracking**

| Phase | Est. Hours | Status | Blockers |
|-------|-----------|--------|----------|
| 1. Database Migration | 2-3 | ⏸️ Not Started | - |
| 2. Core MCP Tools | 4-5 | ⏸️ Not Started | Phase 1 |
| 3. Update Existing Tools | 2-3 | ⏸️ Not Started | Phase 1 |
| 4. Dashboard Enhancement | 3-4 | ⏸️ Not Started | Phase 2, 3 |
| 5. Update Command | 1-2 | ⏸️ Not Started | Phase 2 |
| 6. Testing | 2-3 | ⏸️ Not Started | All phases |
| **Total** | **14-20** | - | - |

---

## 🎯 **Success Criteria**

### **Functional**:
- ✅ Multiple repos can be registered and managed
- ✅ Each repo's data is completely isolated
- ✅ LLM can execute refine-feature without .md manipulation
- ✅ Dashboard shows repo selector and correct data
- ✅ All data stored in single tasks.db file
- ✅ Reports can be generated from database on-demand

### **Technical**:
- ✅ All database queries scoped by `repo_name`
- ✅ All MCP tools accept `repoName` parameter
- ✅ Backward compatibility maintained (existing data migrated)
- ✅ No performance degradation
- ✅ Comprehensive test coverage

### **User Experience**:
- ✅ LLM follows refine-feature command without errors
- ✅ Dashboard loads quickly (<1s)
- ✅ Clear error messages for invalid operations
- ✅ Intuitive repo/feature selection

---

## 🚀 **Deployment Plan**

### **Step 1: Backup**
```bash
# Backup current database
cp tasks.db tasks.db.pre-multi-repo

# Backup current code
git branch backup-single-repo
git commit -am "Backup before multi-repo migration"
```

### **Step 2: Deploy Code**
```bash
# Build updated code
npm run build

# Restart MCP server (if running)
# No restart needed if using @modelcontextprotocol/sdk auto-reload
```

### **Step 3: Run Migration**
```bash
# Apply database migration
sqlite3 tasks.db < .claude/artifacts/multi-repo-schema.sql

# Verify migration
sqlite3 tasks.db "SELECT * FROM v_repo_summary;"
```

### **Step 4: Register Current Repo**
```javascript
// Via MCP tool
register_repo(
  repoName: "task-review-manager",
  repoPath: process.cwd()
)
```

### **Step 5: Validate**
```bash
# Run test suite
npm test

# Manual verification
# 1. Open dashboard → verify repo selector shows
# 2. Run refine-feature → verify uses MCP tools, no .md created
# 3. Check database → verify data scoped by repo_name
```

### **Step 6: Rollback Plan (if needed)**
```bash
# Restore database
cp tasks.db.pre-multi-repo tasks.db

# Restore code
git checkout backup-single-repo
npm run build
```

---

## 📚 **Documentation Updates**

1. **README.md**
   - Add multi-repo support section
   - Update usage examples with `repoName` parameter
   - Add `register_repo` instructions

2. **Architecture Diagram**
   - Update to show multi-repo structure
   - Show single tasks.db with repo namespaces

3. **API Documentation**
   - Document new MCP tools
   - Update existing tool signatures
   - Add examples for multi-repo usage

4. **Workflow Guide**
   - Update refine-feature workflow doc
   - Remove references to .md file creation
   - Add MCP tool usage examples

---

## 🎉 **Benefits Recap**

### **For LLM**:
1. ✅ No string manipulation → More reliable execution
2. ✅ Structured data → Auto-validation via database
3. ✅ Clear success/failure → Explicit tool responses
4. ✅ Resumable → Query state anytime

### **For Users**:
1. ✅ Single database → Easy to manage, backup, query
2. ✅ Multi-repo support → Work on multiple projects seamlessly
3. ✅ Data isolation → No cross-contamination
4. ✅ Rich queries → SQL access to all refinement data
5. ✅ Optional reports → Generate .md only when needed

### **For System**:
1. ✅ Atomic operations → No partial writes
2. ✅ ACID guarantees → Database transactions
3. ✅ Performance → Indexed queries, views
4. ✅ Scalability → Handles many repos/features efficiently

---

## 🔗 **Next Steps After Implementation**

1. **Add export functionality**
   - Export feature to JSON
   - Export to Jira format
   - Export to Markdown template

2. **Add import functionality**
   - Import from Jira
   - Import from JSON
   - Bulk import tasks

3. **Add analytics**
   - Refinement time tracking
   - Task completion metrics
   - Stakeholder approval rates

4. **Add collaboration features**
   - Share refinement reports
   - Team-level dashboards
   - Cross-repo task dependencies (optional)

---

This plan provides a complete roadmap for transforming the task-review-manager into a robust, multi-repo, MCP-first system! 🚀
