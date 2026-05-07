import { describe, it, expect } from 'vitest';
import { retrieveTopMemories } from '../src/lib/retrieval';
import { SEED_MEMORIES } from '../src/data/memory-bank';
import type { Memory } from '../src/types';

const linked = ['mem-pig-butcher-01', 'mem-pig-butcher-02', 'mem-signal-app-01', 'mem-tactics-secrecy-01', 'mem-tactics-pressure-01'];

describe('retrieveTopMemories', () => {
  it('returns exactly 3 memories', () => {
    const out = retrieveTopMemories(SEED_MEMORIES, linked, () => 0.5);
    expect(out.length).toBe(3);
  });

  it('every returned memory id is in the linked pool', () => {
    const linkedSet = new Set(linked);
    const out = retrieveTopMemories(SEED_MEMORIES, linked, () => 0.1);
    for (const m of out) expect(linkedSet.has(m.id)).toBe(true);
  });

  it('returned memories are distinct', () => {
    const out = retrieveTopMemories(SEED_MEMORIES, linked, Math.random);
    const ids = out.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('throws if the linked pool has fewer than 3 valid memories', () => {
    expect(() => retrieveTopMemories(SEED_MEMORIES, ['mem-pig-butcher-01'], Math.random)).toThrow();
  });

  it('is deterministic given a fixed rng', () => {
    const fakeRng = (() => { const seq = [0.9, 0.1, 0.5, 0.7, 0.2]; let i = 0; return () => seq[i++ % seq.length]; })();
    const a = retrieveTopMemories(SEED_MEMORIES, linked, fakeRng).map((m: Memory) => m.id);
    const fakeRng2 = (() => { const seq = [0.9, 0.1, 0.5, 0.7, 0.2]; let i = 0; return () => seq[i++ % seq.length]; })();
    const b = retrieveTopMemories(SEED_MEMORIES, linked, fakeRng2).map((m) => m.id);
    expect(a).toEqual(b);
  });
});
