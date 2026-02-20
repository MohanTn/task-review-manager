/**
 * transition-utils.ts
 *
 * Pure (no DOM / no React) helpers for working with task Transition data.
 * Keeping these separate from formatters.ts makes them testable in a Node
 * environment without needing jsdom.
 */

/**
 * T03: Extract the filesChanged string array from a transition's
 * additionalData object.  Returns an empty array when additionalData is
 * absent, not an object, or does not contain a valid filesChanged array.
 */
export function getFilesChanged(
  additionalData: Record<string, unknown> | null | undefined
): string[] {
  if (!additionalData) return [];
  const files = additionalData['filesChanged'];
  if (!Array.isArray(files)) return [];
  return files.filter((f): f is string => typeof f === 'string');
}
