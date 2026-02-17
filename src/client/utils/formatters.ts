import { TaskStatus } from '../types';

export function formatStatus(status: TaskStatus | string): string {
  if (!status) return '';
  return status.replace(/([A-Z])/g, ' $1').trim();
}

export function getBadgeClass(status: TaskStatus | string): string {
  if (status === 'Done') return 'badge-done';
  if (['InProgress', 'InReview', 'InQA'].includes(status)) return 'badge-active';
  if (['NeedsChanges', 'NeedsRefinement'].includes(status)) return 'badge-blocked';
  if (status && status.startsWith('Pending')) return 'badge-review';
  return 'badge-pending';
}

export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast toast-${type} visible`;
    setTimeout(() => toast.classList.remove('visible'), 3500);
  }
}

export function announceToScreenReader(message: string): void {
  const ariaLive = document.getElementById('ariaLive');
  if (ariaLive) {
    ariaLive.textContent = message;
    setTimeout(() => { ariaLive.textContent = ''; }, 1000);
  }
}
