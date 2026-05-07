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

  it('appends chat messages from every actor', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const senders = new Set(store.getState().chatMessages.map((m) => m.sender));
    expect(senders.has('agent')).toBe(true);
    expect(senders.has('adversary')).toBe(true);
    expect(senders.has('system')).toBe(true);
    expect(senders.has('judge')).toBe(true);
  });

  it('adds one learned memory on success', async () => {
    const store = createStore();
    const before = store.getState().bank.length;
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().bank.length).toBe(before + 1);
    expect(store.getState().bank[store.getState().bank.length - 1].origin).toBe('learned');
  });

  it('on failure script, adds a reflection memory and outcome=failure', async () => {
    const store = createStore();
    await runDemo(store, 'q-call-report', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().outcome).toBe('failure');
    const last = store.getState().bank[store.getState().bank.length - 1];
    expect(last.tags).toContain('reflection');
  });

  it('throws if the query id is unknown', async () => {
    const store = createStore();
    await expect(runDemo(store, 'unknown', { stepDelayMs: 0, rng: fixedRng() })).rejects.toThrow();
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
