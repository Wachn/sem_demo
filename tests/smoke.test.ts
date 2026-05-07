import { describe, it, expect } from 'vitest';

describe('environment', () => {
  it('has a DOM', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
