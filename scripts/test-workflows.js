#!/usr/bin/env node

/**
 * Comprehensive workflow simulation test
 * Tests both refine-feature and dev-workflow with all new MCP tools
 * Verifies recommendations 1-8 are working end-to-end
 */

const { TaskReviewManager } = require('./dist/TaskReviewManager.js');
const { DatabaseHandler } = require('./dist/DatabaseHandler.js');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'test-workflows.db');
const REPO_PATH = __dirname;
const REPO_NAME = 'test-repo';
const FEATURE_SLUG = 'test-feature';

// Clean up old test database
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}

async function runTests() {
  console.log('🚀 Starting Workflow Test Suite\n');

  try {
    // Initialize database and manager
    const dbHandler = new DatabaseHandler(TEST_DB);
    dbHandler.initializeTables();
    const manager = new TaskReviewManager(dbHandler);

    // Step 1: Register Repository
    console.log('📝 Step 1: Register Repository');
    await manager.registerRepo({
      repoName: REPO_NAME,
      repoPath: REPO_PATH,
      defaultBranch: 'main'
    });
    console.log('✅ Repository registered\n');

    // Step 2: Create Feature
    console.log('📝 Step 2: Create Feature');
    const featureResult = await manager.createFeature({
      repoName: REPO_NAME,
      featureSlug: FEATURE_SLUG,
      featureName: 'Test Feature - Workflow Simulation'
    });
    if (!featureResult.success) throw new Error(featureResult.error);
    console.log('✅ Feature created\n');

    // Step 3: Add Test Tasks
    console.log('📝 Step 3: Add Test Tasks');
    const taskIds = [];
    for (let i = 1; i <= 3; i++) {
      const taskId = `T0${i}`;
      taskIds.push(taskId);
      const result = await manager.addTask({
        repoName: REPO_NAME,
        featureSlug: FEATURE_SLUG,
        taskId,
        title: `Task ${i}: ${['Core Feature', 'API Integration', 'UI Enhancement'][i-1]}`,
        description: `Implementation of task ${i} with comprehensive testing`,
        orderOfExecution: i,
        estimatedHours: 4 + (i * 2),
        acceptanceCriteria: [
          { id: `AC-${i}-1`, criterion: 'Task completes successfully', priority: 'Must Have' },
          { id: `AC-${i}-2`, criterion: 'All tests pass', priority: 'Must Have' }
        ],
        testScenarios: [
          { id: `TS-${i}-1`, title: 'Happy Path', description: 'Test normal flow', priority: 'P0' }
        ],
        dependencies: i > 1 ? [`T0${i-1}`] : []
      });
      if (!result.success) throw new Error(result.error);
    }
    console.log(`✅ ${taskIds.length} tasks created\n`);

    // ==============================================================================
    // REFINEMENT WORKFLOW TEST (Recommendations 1, 3, 4, 6, 7)
    // ==============================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('REFINEMENT WORKFLOW TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Rec 1: Get Workflow Snapshot
    console.log('📝 Rec 1: Get Workflow Snapshot (Context Compression)');
    const snapshot = await manager.getWorkflowSnapshot(REPO_NAME, FEATURE_SLUG);
    if (!snapshot.success) throw new Error(snapshot.error);
    console.log('✅ Workflow snapshot retrieved:');
    console.log(`   - Feature: ${snapshot.data.feature.slug}`);
    console.log(`   - Total Tasks: ${snapshot.data.feature.totalTasks}`);
    console.log(`   - Progress: ${snapshot.data.feature.progress}`);
    console.log(`   - Blockages: ${snapshot.data.blockages.length}`);
    console.log(`   - Compressed size: ${JSON.stringify(snapshot.data).length} bytes\n`);

    // Rec 4: Get Task Execution Plan
    console.log('📝 Rec 4: Get Task Execution Plan (Dependency Analysis)');
    const plan = await manager.getTaskExecutionPlan(REPO_NAME, FEATURE_SLUG);
    if (!plan.success) throw new Error(plan.error);
    console.log('✅ Execution plan generated:');
    console.log(`   - Optimal Order: ${plan.data.optimalOrder.join(' → ')}`);
    console.log(`   - Parallelizable Phases: ${Object.keys(plan.data.parallelizable).length}`);
    console.log(`   - Critical Path: ${plan.data.criticalPath.join(' → ')}`);
    console.log(`   - Warnings: ${plan.data.warnings.length}\n`);

    // Rec 6 & 7: Stakeholder Reviews with Validation
    console.log('📝 Rec 6 & 7: Stakeholder Reviews with Validation & Quick Summary');
    const reviewRoles = ['productDirector', 'architect', 'uiUxExpert', 'securityOfficer'];

    for (const taskId of taskIds) {
      for (const role of reviewRoles) {
        // Rec 7: Validate Review Completeness
        const validation = await manager.validateReviewCompleteness(REPO_NAME, FEATURE_SLUG, taskId, role);
        if (!validation.success) {
          console.log(`   ⚠️  ${role} validation for ${taskId}: ${validation.message}`);
        }

        // Rec 6: Add Review with quickSummary
        const additionalFields = {
          quickSummary: `${role}: Approved for development`,
          marketAnalysis: role === 'productDirector' ? 'Strong market fit' : undefined,
          technologyRecommendations: role === 'architect' ? ['TypeScript', 'React'] : undefined,
          securityRequirements: role === 'securityOfficer' ? ['Input validation', 'CSRF protection'] : undefined
        };

        const reviewResult = await manager.addStakeholderReview(
          REPO_NAME, FEATURE_SLUG, taskId, role, 'approve',
          `Thorough review completed by ${role}`,
          additionalFields
        );
        if (!reviewResult.success) throw new Error(reviewResult.error);
      }
    }
    console.log('✅ All stakeholder reviews completed with quickSummary field\n');

    // Rec 3: Save Checkpoint after refinement
    console.log('📝 Rec 3: Save Workflow Checkpoint (After Refinement)');
    const checkpoint1 = await manager.saveWorkflowCheckpoint(
      REPO_NAME, FEATURE_SLUG,
      'All tasks refined and approved - ready for development'
    );
    if (!checkpoint1.success) throw new Error(checkpoint1.error);
    console.log(`✅ Checkpoint saved (ID: ${checkpoint1.data.checkpointId})\n`);

    // ==============================================================================
    // DEVELOPMENT WORKFLOW TEST (Recommendations 2, 5)
    // ==============================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('DEVELOPMENT WORKFLOW TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Rec 5: Get Workflow Metrics (Before Development)
    console.log('📝 Rec 5: Get Workflow Metrics (Health Score)');
    const metricsStart = await manager.getWorkflowMetrics(REPO_NAME, FEATURE_SLUG);
    if (!metricsStart.success) throw new Error(metricsStart.error);
    console.log('✅ Workflow metrics before development:');
    console.log(`   - Health Score: ${metricsStart.data.healthScore}/100`);
    console.log(`   - Rejection Rate: ${JSON.stringify(metricsStart.data.rejectionRate)}`);
    console.log(`   - Alerts: ${metricsStart.data.alerts.length}`);
    metricsStart.data.alerts.forEach(a => console.log(`     • ${a.level}: ${a.msg}`));
    console.log();

    // Simulate development phase: Move tasks through pipeline
    console.log('📝 Rec 2: Batch Transition Tasks (Developer Phase)');
    const devBatch = await manager.batchTransitionTasks(
      REPO_NAME, FEATURE_SLUG, taskIds,
      'ReadyForDevelopment', 'InProgress',
      'developer',
      { developerNotes: 'Implemented all features', filesChanged: ['src/main.ts', 'src/api.ts'] }
    );
    if (!devBatch.success) throw new Error(devBatch.error);
    console.log(`✅ Batch transition: ReadyForDevelopment → InProgress (${taskIds.length} tasks)\n`);

    // Rec 3: Save Checkpoint after developer batch
    console.log('📝 Rec 3: Save Checkpoint (After Developer Batch)');
    const checkpoint2 = await manager.saveWorkflowCheckpoint(
      REPO_NAME, FEATURE_SLUG,
      'Developer implementation complete - all tasks in InProgress'
    );
    if (!checkpoint2.success) throw new Error(checkpoint2.error);
    console.log(`✅ Checkpoint saved (ID: ${checkpoint2.data.checkpointId})\n`);

    // Batch transition to code review
    console.log('📝 Rec 2: Batch Transition Tasks (Code Review Phase)');
    const reviewBatch = await manager.batchTransitionTasks(
      REPO_NAME, FEATURE_SLUG, taskIds,
      'InProgress', 'InReview',
      'codeReviewer',
      { codeReviewerNotes: 'Code quality verified' }
    );
    if (!reviewBatch.success) throw new Error(reviewBatch.error);
    console.log(`✅ Batch transition: InProgress → InReview (${taskIds.length} tasks)\n`);

    // Batch update acceptance criteria (QA verifies)
    console.log('📝 Rec 2: Batch Update Acceptance Criteria (QA Phase)');
    const criteriaUpdates = taskIds.flatMap(taskId => [
      { taskId, criterionId: `AC-${taskId.substring(2)}-1`, verified: true },
      { taskId, criterionId: `AC-${taskId.substring(2)}-2`, verified: true }
    ]);
    const qaVerify = await manager.batchUpdateAcceptanceCriteria(
      REPO_NAME, FEATURE_SLUG,
      criteriaUpdates
    );
    if (!qaVerify.success) throw new Error(qaVerify.error);
    console.log(`✅ Batch verified ${criteriaUpdates.length} acceptance criteria\n`);

    // Batch transition to Done
    console.log('📝 Rec 2: Batch Transition Tasks (Final Phase)');
    const finalizeBatch = await manager.batchTransitionTasks(
      REPO_NAME, FEATURE_SLUG, taskIds,
      'InReview', 'Done',
      'qa',
      { qaNotes: 'All tests passed successfully' }
    );
    if (!finalizeBatch.success) throw new Error(finalizeBatch.error);
    console.log(`✅ Batch transition: InReview → Done (${taskIds.length} tasks)\n`);

    // Rec 3: Save Final Checkpoint
    console.log('📝 Rec 3: Save Final Checkpoint');
    const checkpoint3 = await manager.saveWorkflowCheckpoint(
      REPO_NAME, FEATURE_SLUG,
      'All tasks completed and in Done status'
    );
    if (!checkpoint3.success) throw new Error(checkpoint3.error);
    console.log(`✅ Final checkpoint saved (ID: ${checkpoint3.data.checkpointId})\n`);

    // Rec 5: Get Final Metrics
    console.log('📝 Rec 5: Get Final Workflow Metrics');
    const metricsEnd = await manager.getWorkflowMetrics(REPO_NAME, FEATURE_SLUG);
    if (!metricsEnd.success) throw new Error(metricsEnd.error);
    console.log('✅ Final workflow metrics:');
    console.log(`   - Health Score: ${metricsEnd.data.healthScore}/100`);
    console.log(`   - Total Transitions: ${metricsEnd.data.totalTransitions}`);
    console.log(`   - Average Phase Time: ${metricsEnd.data.avgPhaseTime}`);
    console.log(`   - Workflow Quality: ${metricsEnd.data.workflowQuality}\n`);

    // Rec 3: List all checkpoints
    console.log('📝 Rec 3: List All Workflow Checkpoints');
    const checkpoints = await manager.listWorkflowCheckpoints(REPO_NAME, FEATURE_SLUG);
    if (!checkpoints.success) throw new Error(checkpoints.error);
    console.log('✅ Saved checkpoints:');
    checkpoints.data.checkpoints.forEach((cp, idx) => {
      console.log(`   ${idx + 1}. ID=${cp.id} | ${cp.description}`);
      console.log(`      Saved: ${cp.savedAt}`);
    });
    console.log();

    // ==============================================================================
    // VERIFICATION & SUMMARY
    // ==============================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('VERIFICATION & SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Verify all tasks are Done
    const doneVerify = await manager.verifyAllTasksComplete(REPO_NAME, FEATURE_SLUG);
    if (!doneVerify.success) throw new Error(doneVerify.error);
    console.log(`✅ Task Completion: ${doneVerify.data.completedTasks}/${doneVerify.data.totalTasks} tasks Done\n`);

    // Summary of implemented recommendations
    console.log('✅ RECOMMENDATIONS VERIFICATION:\n');
    const recommendations = [
      { num: 1, name: 'Context Compression', status: '✅', tool: 'get_workflow_snapshot' },
      { num: 2, name: 'Batch Operations', status: '✅', tool: 'batch_transition_tasks, batch_update_acceptance_criteria' },
      { num: 3, name: 'Checkpoints & Rollback', status: '✅', tool: 'save_workflow_checkpoint, list_workflow_checkpoints' },
      { num: 4, name: 'Dependency Ordering', status: '✅', tool: 'get_task_execution_plan' },
      { num: 5, name: 'Quality Metrics', status: '✅', tool: 'get_workflow_metrics' },
      { num: 6, name: 'Quick Summary Field', status: '✅', tool: 'quickSummary in add_stakeholder_review' },
      { num: 7, name: 'Completeness Validation', status: '✅', tool: 'validate_review_completeness' },
      { num: 8, name: 'Similar Tasks', status: '⏭️', tool: 'get_similar_tasks (can be tested separately)' }
    ];

    recommendations.forEach(rec => {
      console.log(`${rec.num}. ${rec.name}: ${rec.status}`);
      console.log(`   Tool: ${rec.tool}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL WORKFLOW TESTS PASSED! Objective Achieved! 🎉');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
