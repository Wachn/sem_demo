import { describe, it, expect } from 'vitest';
import { SEED_MEMORIES } from '../src/data/memory-bank';
import { FRAUD_SIGNALS } from '../src/data/fraud-signals';
import { CHAT_SNIPPETS } from '../src/data/chat-snippets';
import { QUERIES } from '../src/data/queries';
import { TRAJECTORIES } from '../src/data/trajectories';

describe('memory bank seed', () => {
  it('has at least 12 memories (9 seeds + 3 reflections)', () => {
    expect(SEED_MEMORIES.length).toBeGreaterThanOrEqual(12);
  });
  it('every memory has unique id', () => {
    const ids = SEED_MEMORIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every memory has both EN and ZH for title, description, content', () => {
    for (const m of SEED_MEMORIES) {
      for (const f of ['title', 'description', 'content'] as const) {
        expect(m[f].en.length).toBeGreaterThan(0);
        expect(m[f].zh.length).toBeGreaterThan(0);
      }
      expect(m.tags.length).toBeGreaterThan(0);
    }
  });
  it('includes at least 2 reflection seeds with origin learned-failure', () => {
    const refl = SEED_MEMORIES.filter((m) => m.origin === 'learned-failure');
    expect(refl.length).toBeGreaterThanOrEqual(2);
  });
});

describe('fraud signals', () => {
  it('has at least 2 entries with unique ids', () => {
    expect(FRAUD_SIGNALS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(FRAUD_SIGNALS.map((s) => s.id)).size).toBe(FRAUD_SIGNALS.length);
  });
  it('every signal has bilingual label/summary and bilingual details', () => {
    for (const s of FRAUD_SIGNALS) {
      expect(s.label.en.length).toBeGreaterThan(0);
      expect(s.label.zh.length).toBeGreaterThan(0);
      expect(s.summary.en.length).toBeGreaterThan(0);
      expect(s.summary.zh.length).toBeGreaterThan(0);
      expect(s.details.length).toBeGreaterThan(0);
      for (const d of s.details) {
        expect(d.en.length).toBeGreaterThan(0);
        expect(d.zh.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('chat snippets', () => {
  it('every snippet has at least 4 bilingual messages', () => {
    for (const s of CHAT_SNIPPETS) {
      expect(s.messages.length).toBeGreaterThanOrEqual(4);
      for (const m of s.messages) {
        expect(m.text.en.length).toBeGreaterThan(0);
        expect(m.text.zh.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('query catalog', () => {
  it('has queries for each mode', () => {
    expect(QUERIES.some((q) => q.mode === 'fraud-signals')).toBe(true);
    expect(QUERIES.some((q) => q.mode === 'chat-messages')).toBe(true);
  });
  it('every query references at least 4 linked memory ids that exist', () => {
    const memIds = new Set(SEED_MEMORIES.map((m) => m.id));
    for (const q of QUERIES) {
      expect(q.linkedMemoryIds.length).toBeGreaterThanOrEqual(4);
      for (const id of q.linkedMemoryIds) expect(memIds.has(id)).toBe(true);
    }
  });
  it('label and preview are bilingual on every query', () => {
    for (const q of QUERIES) {
      expect(q.label.en.length).toBeGreaterThan(0);
      expect(q.label.zh.length).toBeGreaterThan(0);
      expect(q.preview.en.length).toBeGreaterThan(0);
      expect(q.preview.zh.length).toBeGreaterThan(0);
    }
  });
});

describe('trajectory scripts', () => {
  it('one script exists per query', () => {
    const scriptIds = new Set(TRAJECTORIES.map((t) => t.id));
    for (const q of QUERIES) expect(scriptIds.has(q.scriptId)).toBe(true);
  });
  it('every script terminates with a terminate step by the agent', () => {
    for (const t of TRAJECTORIES) {
      const last = t.steps[t.steps.length - 1];
      expect(last.kind).toBe('terminate');
      expect(last.actor).toBe('agent');
    }
  });
  it('every script contains all three actors', () => {
    for (const t of TRAJECTORIES) {
      const actors = new Set(t.steps.map((s) => s.actor));
      expect(actors.has('agent')).toBe(true);
      expect(actors.has('adversary')).toBe(true);
      expect(actors.has('environment')).toBe(true);
    }
  });
  it('every script has at least one of each new step kind', () => {
    for (const t of TRAJECTORIES) {
      const kinds = new Set(t.steps.map((s) => s.kind));
      expect(kinds.has('planned_action')).toBe(true);
      expect(kinds.has('adversary_projection')).toBe(true);
      expect(kinds.has('action_taken')).toBe(true);
      expect(kinds.has('environment_observation')).toBe(true);
    }
  });
  it('every script step.text and judgeVerdict are bilingual', () => {
    for (const t of TRAJECTORIES) {
      expect(t.judgeVerdict.en.length).toBeGreaterThan(0);
      expect(t.judgeVerdict.zh.length).toBeGreaterThan(0);
      for (const s of t.steps) {
        expect(s.text.en.length).toBeGreaterThan(0);
        expect(s.text.zh.length).toBeGreaterThan(0);
      }
    }
  });
});
