import { describe, it, expect } from 'vitest';
import { SEED_MEMORIES } from '../src/data/memory-bank';
import { FRAUD_SIGNALS } from '../src/data/fraud-signals';
import { CHAT_SNIPPETS } from '../src/data/chat-snippets';
import { QUERIES } from '../src/data/queries';
import { TRAJECTORIES } from '../src/data/trajectories';

describe('memory bank seed', () => {
  it('has at least 8 memories', () => {
    expect(SEED_MEMORIES.length).toBeGreaterThanOrEqual(8);
  });
  it('every memory has unique id', () => {
    const ids = SEED_MEMORIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every memory has non-empty title, description, content', () => {
    for (const m of SEED_MEMORIES) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.content.length).toBeGreaterThan(0);
    }
  });
  it('every memory has at least one tag', () => {
    for (const m of SEED_MEMORIES) {
      expect(m.tags.length).toBeGreaterThan(0);
    }
  });
});

describe('fraud signals', () => {
  it('has at least 2 entries with unique ids', () => {
    expect(FRAUD_SIGNALS.length).toBeGreaterThanOrEqual(2);
    const ids = FRAUD_SIGNALS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every signal has details', () => {
    for (const s of FRAUD_SIGNALS) {
      expect(s.details.length).toBeGreaterThan(0);
    }
  });
});

describe('chat snippets', () => {
  it('has at least 2 snippets with unique ids', () => {
    expect(CHAT_SNIPPETS.length).toBeGreaterThanOrEqual(2);
    const ids = CHAT_SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every snippet has at least 4 messages', () => {
    for (const s of CHAT_SNIPPETS) {
      expect(s.messages.length).toBeGreaterThanOrEqual(4);
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
      for (const id of q.linkedMemoryIds) {
        expect(memIds.has(id)).toBe(true);
      }
    }
  });
  it('every query references an existing payload for its mode', () => {
    const sigIds = new Set(FRAUD_SIGNALS.map((s) => s.id));
    const snipIds = new Set(CHAT_SNIPPETS.map((s) => s.id));
    for (const q of QUERIES) {
      if (q.mode === 'fraud-signals') {
        expect(q.fraudSignalId).toBeDefined();
        expect(sigIds.has(q.fraudSignalId!)).toBe(true);
      } else {
        expect(q.chatSnippetId).toBeDefined();
        expect(snipIds.has(q.chatSnippetId!)).toBe(true);
      }
    }
  });
});

describe('trajectory scripts', () => {
  it('one script exists per query', () => {
    const scriptIds = new Set(TRAJECTORIES.map((t) => t.id));
    for (const q of QUERIES) {
      expect(scriptIds.has(q.scriptId)).toBe(true);
    }
  });
  it('every script terminates with a terminate step', () => {
    for (const t of TRAJECTORIES) {
      const last = t.steps[t.steps.length - 1];
      expect(last.kind).toBe('terminate');
      expect(last.actor).toBe('agent');
    }
  });
  it('every script alternates agent and adversary actors at least once', () => {
    for (const t of TRAJECTORIES) {
      const actors = new Set(t.steps.map((s) => s.actor));
      expect(actors.has('agent')).toBe(true);
      expect(actors.has('adversary')).toBe(true);
    }
  });
  it('successful scripts have successMemory; failed scripts have reflectionMemory', () => {
    for (const t of TRAJECTORIES) {
      if (t.outcome === 'success') {
        expect(t.successMemory).toBeDefined();
      } else {
        expect(t.reflectionMemory).toBeDefined();
      }
    }
  });
});
