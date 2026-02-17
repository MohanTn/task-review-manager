#!/usr/bin/env node
/**
 * Migration Runner - Applies database migrations
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workspaceRoot = process.cwd();
const dbPath = path.join(workspaceRoot, 'tasks.db');
const migrationPath = path.join(__dirname, '001_add_multi_repo_support.sql');

console.log('🚀 Starting multi-repo migration...');
console.log(`📁 Database: ${dbPath}`);
console.log(`📄 Migration: ${migrationPath}`);

// Create database if it doesn't exist
const dbDir = path.dirname(dbPath);
fs.ensureDirSync(dbDir);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

try {
  // Read migration SQL
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('⏳ Applying migration...');

  // Execute migration
  db.exec(migrationSQL);

  console.log('✅ Migration applied successfully!');

  // Verify migration
  console.log('\n📊 Verification:');

  const repos = db.prepare('SELECT COUNT(*) as count FROM repos').get() as { count: number };
  console.log(`  ✓ Repos table: ${repos.count} repo(s)`);

  const features = db.prepare('SELECT COUNT(*) as count FROM features WHERE repo_name IS NOT NULL').get() as { count: number };
  console.log(`  ✓ Features migrated: ${features.count}`);

  const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE repo_name IS NOT NULL').get() as { count: number };
  console.log(`  ✓ Tasks migrated: ${tasks.count}`);

  const steps = db.prepare('SELECT COUNT(*) as count FROM feature_refinement_steps').get() as { count: number };
  console.log(`  ✓ Refinement steps table created (${steps.count} rows)`);

  const featureCriteria = db.prepare('SELECT COUNT(*) as count FROM feature_acceptance_criteria').get() as { count: number };
  console.log(`  ✓ Feature acceptance criteria table created (${featureCriteria.count} rows)`);

  const featureScenarios = db.prepare('SELECT COUNT(*) as count FROM feature_test_scenarios').get() as { count: number };
  console.log(`  ✓ Feature test scenarios table created (${featureScenarios.count} rows)`);

  console.log('\n✅ Migration complete!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
