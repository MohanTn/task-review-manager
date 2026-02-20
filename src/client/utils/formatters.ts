import { getFilesChanged } from './transition-utils';
import { getBadgeClass, formatStatus } from './badge-utils';

// Re-export pure helpers so existing callers don't need to change imports
export { getBadgeClass, formatStatus, getFilesChanged };

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
