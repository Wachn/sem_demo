import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from '../src/lib/store';
import { runDemo } from '../src/lib/stage-runner';

const fixedRng = () => {
  const seq = [0.1, 0.4, 0.7, 0.2, 0.6, 0.3];
  let i = 0;
  return () => seq[i++ % seq.length];
};

describe('runDemo', () => {
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      Promise.resolve().then(fn);
      return 0;
    });
  });

  it('progresses through all stages and ends in done', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().stage).toBe('done');
  });

  it('retrieves exactly 3 memories', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().retrievedMemoryIds.length).toBe(3);
  });

  it('appends chat messages from every actor including environment', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const senders = new Set(store.getState().chatMessages.map((m) => m.sender));
    expect(senders.has('agent')).toBe(true);
    expect(senders.has('adversary')).toBe(true);
    expect(senders.has('environment')).toBe(true);
    expect(senders.has('system')).toBe(true);
    expect(senders.has('judge')).toBe(true);
  });

  it('adds one learned memory on success with origin learned-success', async () => {
    const store = createStore();
    const before = store.getState().bank.length;
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().bank.length).toBe(before + 1);
    expect(store.getState().bank[store.getState().bank.length - 1].origin).toBe('learned-success');
  });

  it('on failure script, last memory has origin learned-failure', async () => {
    const store = createStore();
    await runDemo(store, 'q-call-report', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().outcome).toBe('failure');
    const last = store.getState().bank[store.getState().bank.length - 1];
    expect(last.origin).toBe('learned-failure');
  });

  it('throws if the query id is unknown', async () => {
    const store = createStore();
    await expect(runDemo(store, 'unknown', { stepDelayMs: 0, rng: fixedRng() })).rejects.toThrow();
  });
});

describe('1.5MaTTs round tracking', () => {
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      Promise.resolve().then(fn);
      return 0;
    });
  });

  it('emits at least 3 candidate_trajectory chat messages from agent before any environment observation', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const msgs = store.getState().chatMessages;
    const candIdx: number[] = [];
    const envIdx: number[] = [];
    msgs.forEach((m, i) => {
      const t = m.text.en;
      if (t.includes('candidate (1)') || t.includes('candidate (2)') || t.includes('candidate (3)')) candIdx.push(i);
      if (m.sender === 'environment') envIdx.push(i);
    });
    expect(candIdx.length).toBeGreaterThanOrEqual(3);
    expect(envIdx.length).toBeGreaterThanOrEqual(1);
    expect(candIdx[2]).toBeLessThan(envIdx[0]);
  });

  it('updates currentRoundIndex as the trajectory progresses', async () => {
    const store = createStore();
    let maxRound = 0;
    store.subscribe((s) => {
      if (typeof s.currentRoundIndex === 'number') maxRound = Math.max(maxRound, s.currentRoundIndex);
    });
    await runDemo(store, 'q-velocity-report', { stepDelayMs: 0, rng: fixedRng() });
    expect(maxRound).toBeGreaterThanOrEqual(1);
  });
});

describe('learned-memory linking', () => {
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      Promise.resolve().then(fn);
      return 0;
    });
  });

  it('after a successful run, the originating query gains the new memory in its linked pool', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const learnedId = store.getState().bank[store.getState().bank.length - 1].id;
    const ext = store.getState().linkedExtensions;
    expect(ext['q-pig-butcher-doubt']).toContain(learnedId);
  });
});
