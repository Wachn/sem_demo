import { describe, it, expect, beforeEach } from 'vitest';
import { loadBank, saveBank, clearBank } from '../src/lib/persistence';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('returns null when nothing is stored', () => {
    expect(loadBank()).toBeNull();
  });
  it('round-trips a bilingual memory bank', () => {
    const bank = [{
      id: 'mem-x',
      title: { en: 'T', zh: '标题' },
      description: { en: 'D', zh: '描述' },
      content: { en: 'C', zh: '内容' },
      tags: ['a', 'b'],
      origin: 'seed' as const,
    }];
    saveBank(bank);
    const loaded = loadBank();
    expect(loaded).not.toBeNull();
    expect(loaded![0].title.en).toBe('T');
    expect(loaded![0].title.zh).toBe('标题');
  });
  it('returns null on shape mismatch', () => {
    localStorage.setItem('sem_demo:bank', JSON.stringify([{ id: 'x', title: 'plain string' }]));
    expect(loadBank()).toBeNull();
  });
  it('clearBank removes the entry', () => {
    saveBank([{
      id: 'mem-y', title: { en: 'a', zh: 'b' }, description: { en: 'a', zh: 'b' }, content: { en: 'a', zh: 'b' }, tags: ['x'],
    }]);
    clearBank();
    expect(loadBank()).toBeNull();
  });
});
