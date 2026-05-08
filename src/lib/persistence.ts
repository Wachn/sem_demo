import type { Memory } from '../types';

const KEY = 'sem_demo:bank';

export function loadBank(): Memory[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Memory[];
    if (!Array.isArray(parsed)) return null;
    if (parsed.length > 0) {
      const m = parsed[0];
      if (!m || typeof m.id !== 'string' || !m.title || typeof m.title.en !== 'string' || typeof m.title.zh !== 'string') {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBank(bank: Memory[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(bank));
  } catch {
    // quota or privacy mode — silently skip
  }
}

export function clearBank(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
