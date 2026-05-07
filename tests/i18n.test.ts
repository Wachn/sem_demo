import { describe, it, expect } from 'vitest';
import { t, ui, JUDGE_PROMPT_TEMPLATE } from '../src/lib/i18n';

describe('i18n', () => {
  it('t() picks the active language', () => {
    expect(t({ en: 'Run', zh: '运行' }, 'en')).toBe('Run');
    expect(t({ en: 'Run', zh: '运行' }, 'zh')).toBe('运行');
  });
  it('ui() returns a non-empty string for a known key', () => {
    expect(ui('header.run', 'en').length).toBeGreaterThan(0);
    expect(ui('header.run', 'zh').length).toBeGreaterThan(0);
  });
  it('JUDGE_PROMPT_TEMPLATE has both languages', () => {
    expect(JUDGE_PROMPT_TEMPLATE.en.length).toBeGreaterThan(100);
    expect(JUDGE_PROMPT_TEMPLATE.zh.length).toBeGreaterThan(100);
  });
});
