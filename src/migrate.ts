#!/usr/bin/env node
/**
 * Migration utility to import task.json files into SQLite database
 * Usage: node dist/migrate.js [options]
 */
import { DatabaseHandler } from './DatabaseHandler.js';
import { JsonFileHandler } from './JsonFileHandler.js';
import fs from 'fs-extra';
import path from 'path';

async function migrate(workspaceRoot?: string, sourceDir?: string) {
  const root = workspaceRoot || process.cwd();
  const artifactsPath = sourceDir || path.join(root, '.github', 'artifacts');

  console.log('🔄 Starting migration from task.json files to SQLite database...');
  console.log(`   Workspace: ${root}`);
  console.log(`   Source: ${artifactsPath}`);

  // Check if source directory exists
  if (!await fs.pathExists(artifactsPath)) {
    console.log(`❌ Source directory not found: ${artifactsPath}`);
    console.log('   Nothing to migrate.');
    return;
  }

  // Initialize handlers
  const fileHandler = new JsonFileHandler(root);
  const dbHandler = new DatabaseHandler(root);

  // Find all feature directories
  const features = await fs.readdir(artifactsPath);
  let migrated = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const featureSlug of features) {
    const featurePath = path.join(artifactsPath, featureSlug);
    const taskFilePath = path.join(featurePath, 'task.json');

    // Skip if not a directory
    const stat = await fs.stat(featurePath);
    if (!stat.isDirectory()) {
      continue;
    }

    // Skip if task.json doesn't exist
    if (!await fs.pathExists(taskFilePath)) {
      console.log(`⏭️  Skipping ${featureSlug} (no task.json found)`);
      skipped++;
      continue;
    }

    try {
      // Load task file
      console.log(`📦 Migrating ${featureSlug}...`);
      const taskFile = await fileHandler.load(taskFilePath);

      // Save to database
      await dbHandler.saveByFeatureSlug(featureSlug, taskFile);
      
      console.log(`✅ Successfully migrated ${featureSlug}`);
      migrated++;
    } catch (error) {
      const errorMsg = `Failed to migrate ${featureSlug}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n✨ Migration complete!');
  console.log(`   Database: ${path.join(root, 'tasks.db')}`);
  
  // Close database connection
  dbHandler.close();
}

// Run migration
const workspaceRoot = process.argv[2];
migrate(workspaceRoot).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
