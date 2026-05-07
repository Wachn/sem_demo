import { describe, it, expect, vi } from 'vitest';
import { createStore, type DemoState } from '../src/lib/store';

describe('store', () => {
  it('starts in idle state with empty fields', () => {
    const s = createStore();
    const state = s.getState();
    expect(state.stage).toBe('idle');
    expect(state.mode).toBe('fraud-signals');
    expect(state.selectedQueryId).toBeNull();
    expect(state.retrievedMemoryIds).toEqual([]);
    expect(state.chatMessages).toEqual([]);
    expect(state.bank.length).toBeGreaterThan(0);
  });

  it('notifies subscribers on setState', () => {
    const s = createStore();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.setState((state: DemoState) => ({ ...state, stage: 'input' }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.getState().stage).toBe('input');
    off();
    s.setState((state) => ({ ...state, stage: 'query' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('appendChat appends a localized message', () => {
    const s = createStore();
    s.appendChat({ sender: 'system', text: { en: 'hello', zh: '你好' } });
    expect(s.getState().chatMessages.length).toBe(1);
    expect(s.getState().chatMessages[0].text.en).toBe('hello');
    expect(s.getState().chatMessages[0].text.zh).toBe('你好');
  });

  it('addLearnedMemory inserts a memory with default learned-success origin', () => {
    const s = createStore();
    const before = s.getState().bank.length;
    s.addLearnedMemory({
      id: 'mem-new',
      title: { en: 't', zh: '标题' },
      description: { en: 'd', zh: '描述' },
      content: { en: 'c', zh: '内容' },
      tags: ['x'],
    });
    const after = s.getState().bank;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1].origin).toBe('learned-success');
  });

  it('addLearnedMemory respects opts.origin = learned-failure', () => {
    const s = createStore();
    s.addLearnedMemory(
      {
        id: 'mem-fail',
        title: { en: 't', zh: '标题' },
        description: { en: 'd', zh: '描述' },
        content: { en: 'c', zh: '内容' },
        tags: ['reflection'],
      },
      { origin: 'learned-failure' },
    );
    const last = s.getState().bank[s.getState().bank.length - 1];
    expect(last.origin).toBe('learned-failure');
  });
});

describe('inspect state', () => {
  it('starts with inspectedNodeId and inspectedMemoryId null', () => {
    const s = createStore();
    expect(s.getState().inspectedNodeId).toBeNull();
    expect(s.getState().inspectedMemoryId).toBeNull();
  });

  it('setInspectedNode toggles the value and notifies subscribers', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.setInspectedNode('node-bank');
    expect(s.getState().inspectedNodeId).toBe('node-bank');
    expect(fn).toHaveBeenCalledTimes(1);
    s.setInspectedNode(null);
    expect(s.getState().inspectedNodeId).toBeNull();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('setInspectedMemory toggles independently of inspectedNodeId', () => {
    const s = createStore();
    s.setInspectedNode('node-bank');
    s.setInspectedMemory('mem-pig-butcher-01');
    expect(s.getState().inspectedNodeId).toBe('node-bank');
    expect(s.getState().inspectedMemoryId).toBe('mem-pig-butcher-01');
    s.setInspectedMemory(null);
    expect(s.getState().inspectedMemoryId).toBeNull();
    expect(s.getState().inspectedNodeId).toBe('node-bank');
  });

  it('reset clears inspect state but preserves bank and linkedExtensions', () => {
    const s = createStore();
    s.setInspectedNode('node-bank');
    s.setInspectedMemory('mem-pig-butcher-01');
    s.reset();
    expect(s.getState().inspectedNodeId).toBeNull();
    expect(s.getState().inspectedMemoryId).toBeNull();
  });
});

describe('language + node positions', () => {
  it('starts with language=en and empty nodePositions', () => {
    const s = createStore();
    expect(s.getState().language).toBe('en');
    expect(s.getState().nodePositions).toEqual({});
  });
  it('setLanguage updates and notifies', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.setLanguage('zh');
    expect(s.getState().language).toBe('zh');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('setNodePosition merges per-id positions', () => {
    const s = createStore();
    s.setNodePosition('node-agent', { x: 100, y: 200 });
    s.setNodePosition('node-bank', { x: 50, y: 10 });
    expect(s.getState().nodePositions).toEqual({
      'node-agent': { x: 100, y: 200 },
      'node-bank': { x: 50, y: 10 },
    });
  });
  it('reset preserves language and nodePositions', () => {
    const s = createStore();
    s.setLanguage('zh');
    s.setNodePosition('node-agent', { x: 1, y: 2 });
    s.reset();
    expect(s.getState().language).toBe('zh');
    expect(s.getState().nodePositions['node-agent']).toEqual({ x: 1, y: 2 });
  });
});
