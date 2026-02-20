/**
 * badge-utils.ts
 *
 * Pure (no DOM / no React) helpers for mapping task statuses to CSS class
 * names.  Kept separate from formatters.ts so these functions can be tested
 * under Jest's Node environment without DOM lib.
 */

/**
 * Returns the global CSS badge class name for a given task status.
 * Class names correspond to the `.badge-*` rules defined in
 * src/public/index.html (and src/client in the Vite SPA).
 */
export function getBadgeClass(status: string): string {
  if (status === 'Done') return 'badge-done';
  if (['InProgress', 'InReview', 'InQA'].includes(status)) return 'badge-active';
  if (['NeedsChanges', 'NeedsRefinement'].includes(status)) return 'badge-blocked';
  if (status && status.startsWith('Pending')) return 'badge-review';
  return 'badge-pending';
}

/**
 * Converts a camelCase TaskStatus value to a human-readable label by
 * inserting spaces before each uppercase letter.
 * e.g. "InProgress" → "In Progress"
 */
export function formatStatus(status: string): string {
  if (!status) return '';
  return status.replace(/([A-Z])/g, ' $1').trim();
}
