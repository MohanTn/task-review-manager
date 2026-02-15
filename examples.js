/**
 * Example usage scenarios for Task Review Manager MCP Server
 * 
 * These examples show how to use the MCP tools to manage the
 * Zerodha OAuth feature refinement workflow
 */

// =============================================================================
// SCENARIO 1: Initial Setup - Validate Current State
// =============================================================================

// Check current status of all tasks
const summary = await get_review_summary({
  taskFilePath: "c:\\Users\\mohan\\REPO\\zerodha-trade-portal\\.github\\artifacts\\fix-zerodha-connection-test-auth\\task.json"
});

console.log(`Feature: ${summary.featureName}`);
console.log(`Total Tasks: ${summary.totalTasks}`);
console.log(`Completion: ${summary.completionPercentage}%`);
console.log(`Ready for Development: ${summary.tasksByStatus.ReadyForDevelopment}`);

// =============================================================================
// SCENARIO 2: Add Product Director Review for Multiple Tasks
// =============================================================================

const TASK_FILE = "c:\\Users\\mohan\\REPO\\zerodha-trade-portal\\.github\\artifacts\\fix-zerodha-connection-test-auth\\task.json";

// Review T01: Remove Custom HTTP Login Code
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T01",
  stakeholder: "productDirector",
  decision: "approve",
  notes: "Approved. Critical cleanup task. Removing unofficial API dependencies reduces maintenance burden.",
  additionalFields: {
    marketAnalysis: "Technical debt removal. Zero customer impact but high long-term value."
  }
});

// Review T02: Implement OAuth Helper Methods
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T02",
  stakeholder: "productDirector",
  decision: "approve",
  notes: "Approved. OAuth is industry standard. Aligns with Zerodha's supported authentication methods.",
  additionalFields: {
    marketAnalysis: "Manual token paste acceptable UX trade-off for 24-hour token lifetime. Power users will understand."
  }
});

// Review T03: Enhance Error Handling
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T03",
  stakeholder: "productDirector",
  decision: "approve",
  notes: "Approved. Enhanced error messages will significantly reduce support burden and improve user troubleshooting.",
  additionalFields: {
    marketAnalysis: "High value. Better error messages = happier users = fewer support tickets."
  }
});

// Review T04: Update Settings UI for OAuth Flow
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T04",
  stakeholder: "productDirector",
  decision: "approve",
  notes: "Approved. 3-step OAuth UI is clear and intuitive. Follows standard OAuth patterns users expect.",
  additionalFields: {
    marketAnalysis: "UX improvement over automated TOTP. Users regain control of authentication flow."
  }
});

// =============================================================================
// SCENARIO 3: Add Architect Review with Technical Recommendations
// =============================================================================

// Validate before proceeding
const validationT01 = await validate_workflow({
  taskFilePath: TASK_FILE,
  taskId: "T01",
  stakeholder: "architect"
});

if (validationT01.valid) {
  await add_stakeholder_review({
    taskFilePath: TASK_FILE,
    taskId: "T01",
    stakeholder: "architect",
    decision: "approve",
    notes: "Approved. Clean deletion with no replacement needed. Good architectural hygiene.",
    additionalFields: {
      technologyRecommendations: [
        "Ensure IKiteApiClient interface no longer exposes LoginWithTotpAsync",
        "Update interface documentation to reflect OAuth-only approach"
      ],
      designPatterns: [
        "Adapter Pattern: IKiteApiClient wraps SDK methods",
        "Dependency Injection: Service layer decoupled from concrete implementations"
      ]
    }
  });
}

// T02 Architect Review
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T02",
  stakeholder: "architect",
  decision: "approve",
  notes: "Approved. Direct SDK method exposure is appropriate here. Thin wrapper maintains flexibility.",
  additionalFields: {
    technologyRecommendations: [
      "Return ValueTuple<string, string> for (loginUrl, state) to enable CSRF protection",
      "Consider adding URL validation to prevent open redirect vulnerabilities"
    ],
    designPatterns: [
      "Adapter Pattern: Wrap GetLoginURL with async signature",
      "Factory Method: Consider LoginUrlFactory if multiple OAuth providers needed in future"
    ]
  }
});

// =============================================================================
// SCENARIO 4: Add Lead Engineer Review with Resource Planning
// =============================================================================

await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T01",
  stakeholder: "leadEngineer",
  decision: "approve",
  notes: "Approved. Straightforward deletion. Estimated 2 hours is accurate assuming good IDE refactoring tools.",
  additionalFields: {
    resourcePlan: "Assign to mid-level or senior engineer. Can be done independently. No blockers.",
    implementationPhases: [
      "Phase 1: Delete LoginWithTotpAsync method (30 min)",
      "Phase 2: Remove IKiteApiClient.LoginWithTotpAsync interface method (15 min)",
      "Phase 3: Update all call sites to use new OAuth flow (1 hour)",
      "Phase 4: Run full test suite and verify no regressions (15 min)"
    ]
  }
});

await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T02",
  stakeholder: "leadEngineer",
  decision: "approve",
  notes: "Approved. Simple wrapper implementation. Can be done in parallel with T01 by different engineer.",
  additionalFields: {
    resourcePlan: "Assign to same engineer handling T01 for context continuity. Or parallelize with separate engineer for T02-T03.",
    implementationPhases: [
      "Phase 1: Create GetOAuthLoginUrlAsync method signature (15 min)",
      "Phase 2: Implement SDK _kiteClient.GetLoginURL() call (30 min)",
      "Phase 3: Add XML documentation and parameter validation (30 min)",
      "Phase 4: Write unit tests (15 min)"
    ]
  }
});

// =============================================================================
// SCENARIO 5: Add CSO Review with Security Requirements
// =============================================================================

await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T01",
  stakeholder: "cso",
  decision: "approve",
  notes: "Approved. Removing custom HTTP authentication eliminates security liability. No new vulnerabilities introduced.",
  additionalFields: {
    securityRequirements: [
      "Verify no credentials stored in deleted code (git history audit)",
      "Ensure no debug logs contain authentication tokens",
      "Confirm removal includes all test mocks using custom HTTP flow"
    ],
    complianceNotes: "OAuth 2.0 (RFC 6749) compliance achieved. No PCI DSS impact (no card data involved)."
  }
});

await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T02",
  stakeholder: "cso",
  decision: "approve",
  notes: "Approved with security requirements. OAuth URL generation must prevent open redirect attacks.",
  additionalFields: {
    securityRequirements: [
      "Whitelist OAuth redirect URIs in configuration (no dynamic redirects)",
      "Validate loginUrl matches expected Zerodha domain pattern",
      "Use HTTPS only for all OAuth endpoints",
      "Add CSRF state parameter validation",
      "Log all OAuth URL generations for audit trail"
    ],
    complianceNotes: "Aligns with OWASP ASVS 3.0.1 (Authentication Architecture). OAuth 2.0 (RFC 6749) compliant."
  }
});

await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T03",
  stakeholder: "cso",
  decision: "approve",
  notes: "Approved with CRITICAL security requirements. Error messages MUST NOT leak credentials or API keys.",
  additionalFields: {
    securityRequirements: [
      "MANDATORY: Mask all tokens in error messages (first 4 + last 4 chars only)",
      "Sanitize exception stack traces (remove file paths, credentials)",
      "No API secrets in TechnicalDetails field",
      "Input sanitization: Max 256 chars, alphanumeric whitelist for token inputs",
      "Security code review REQUIRED before production deployment"
    ],
    complianceNotes: "OWASP A02:2021 Cryptographic Failures prevention. PCI DSS 3.4 (mask sensitive data in logs/errors)."
  }
});

// =============================================================================
// SCENARIO 6: Check Progress After Multiple Reviews
// =============================================================================

// Get updated summary
const updatedSummary = await get_review_summary({
  taskFilePath: TASK_FILE
});

console.log("\n=== Review Progress ===");
console.log(`Completed Tasks: ${updatedSummary.tasksByStatus.ReadyForDevelopment}/${updatedSummary.totalTasks}`);
console.log(`Completion: ${updatedSummary.completionPercentage}%`);
console.log("\nStakeholder Progress:");
console.log(`  Product Director: ${updatedSummary.stakeholderProgress.productDirector.completed} completed, ${updatedSummary.stakeholderProgress.productDirector.pending} pending`);
console.log(`  Architect: ${updatedSummary.stakeholderProgress.architect.completed} completed, ${updatedSummary.stakeholderProgress.architect.pending} pending`);
console.log(`  Lead Engineer: ${updatedSummary.stakeholderProgress.leadEngineer.completed} completed, ${updatedSummary.stakeholderProgress.leadEngineer.pending} pending`);
console.log(`  CSO: ${updatedSummary.stakeholderProgress.cso.completed} completed, ${updatedSummary.stakeholderProgress.cso.pending} pending`);

// =============================================================================
// SCENARIO 7: Handle Rejection and Workflow Reset
// =============================================================================

// Example: CSO rejects a task due to security concerns
await add_stakeholder_review({
  taskFilePath: TASK_FILE,
  taskId: "T05",
  stakeholder: "cso",
  decision: "reject",
  notes: "REJECTED. Security requirements insufficient. Must add token encryption and secure memory handling.",
  additionalFields: {
    securityRequirements: [
      "Use SecureString for in-memory token storage (NOT plain string)",
      "Implement DPAPI encryption for any temporary token caching",
      "Add memory zeroing after token use",
      "Penetration test REQUIRED before production"
    ],
    complianceNotes: "Current implementation violates OWASP ASVS 9.2.1 (sensitive data in memory). Must remediate."
  }
});

// Task T05 is now in NeedsRefinement state
// Manual workflow reset required by updating task.json status back to PendingProductDirector

// =============================================================================
// SCENARIO 8: Batch Process All Remaining Tasks
// =============================================================================

// Get list of tasks still pending CSO review
const currentSummary = await get_review_summary({
  taskFilePath: TASK_FILE
});

const tasksNeedingCSOReview = currentSummary.tasks.filter(
  task => task.status === 'PendingCSO'
);

console.log(`\nTasks awaiting CSO review: ${tasksNeedingCSOReview.length}`);

// Process each task
for (const task of tasksNeedingCSOReview) {
  // Validate before processing
  const validation = await validate_workflow({
    taskFilePath: TASK_FILE,
    taskId: task.taskId,
    stakeholder: "cso"
  });

  if (validation.valid) {
    console.log(`Processing ${task.taskId}: ${task.title}`);
    
    await add_stakeholder_review({
      taskFilePath: TASK_FILE,
      taskId: task.taskId,
      stakeholder: "cso",
      decision: "approve",
      notes: `Approved. Security requirements documented. Pre-production security review required.`,
      additionalFields: {
        securityRequirements: [
          "Token masking in all logs and error messages",
          "In-memory storage only (no disk persistence)",
          "HTTPS only for all API communications",
          "Security code review before merge",
          "Penetration test before production deployment"
        ],
        complianceNotes: "OAuth 2.0 (RFC 6749) compliant. OWASP ASVS aligned."
      }
    });

    console.log(`✓ ${task.taskId} approved by CSO`);
  } else {
    console.log(`⚠ ${task.taskId} cannot be processed: ${validation.errors.join(', ')}`);
  }
}

// =============================================================================
// SCENARIO 9: Final Verification - All Tasks Ready
// =============================================================================

const finalSummary = await get_review_summary({
  taskFilePath: TASK_FILE
});

console.log("\n=== Final Status ===");
console.log(`Total Tasks: ${finalSummary.totalTasks}`);
console.log(`Ready for Development: ${finalSummary.tasksByStatus.ReadyForDevelopment}`);
console.log(`Needs Refinement: ${finalSummary.tasksByStatus.NeedsRefinement}`);
console.log(`Completion: ${finalSummary.completionPercentage}%`);

if (finalSummary.completionPercentage === 100) {
  console.log("\n✓ ALL TASKS APPROVED! Ready for development handoff.");
} else {
  console.log("\n⚠ Some tasks still pending review. Continue workflow.");
}

// =============================================================================
// EXPECTED OUTPUT AFTER ALL REVIEWS COMPLETE
// =============================================================================

/*
=== Final Status ===
Total Tasks: 8
Ready for Development: 8
Needs Refinement: 0
Completion: 100%

✓ ALL TASKS APPROVED! Ready for development handoff.
*/
