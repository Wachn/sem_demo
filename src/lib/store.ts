import type { ChatMessage, Memory, Mode, Stage } from '../types';
import { SEED_MEMORIES } from '../data/memory-bank';

export interface DemoState {
  mode: Mode;
  stage: Stage;
  selectedQueryId: string | null;
  retrievedMemoryIds: string[];
  trajectoryStepIndex: number;
  chatMessages: ChatMessage[];
  bank: Memory[];
  newlyLearnedMemoryId: string | null;
  caption: string;
  highlightedNodeId: string | null;
  highlightedEdgeIds: string[];
  judgeVerdict: string | null;
  outcome: 'success' | 'failure' | null;
  linkedExtensions: Record<string, string[]>;
  inspectedNodeId: string | null;
  inspectedMemoryId: string | null;
}

export type Updater = (s: DemoState) => DemoState;

export interface Store {
  getState(): DemoState;
  setState(updater: Updater): void;
  subscribe(listener: (s: DemoState) => void): () => void;
  appendChat(m: ChatMessage): void;
  addLearnedMemory(m: Omit<Memory, 'origin'>, opts?: { extendQueryIds?: string[] }): void;
  setInspectedNode(id: string | null): void;
  setInspectedMemory(id: string | null): void;
  reset(): void;
}

const initial = (): DemoState => ({
  mode: 'fraud-signals',
  stage: 'idle',
  selectedQueryId: null,
  retrievedMemoryIds: [],
  trajectoryStepIndex: -1,
  chatMessages: [],
  bank: SEED_MEMORIES.slice(),
  newlyLearnedMemoryId: null,
  caption: 'Pick a mode and a query to begin.',
  highlightedNodeId: null,
  highlightedEdgeIds: [],
  judgeVerdict: null,
  outcome: null,
  linkedExtensions: {},
  inspectedNodeId: null,
  inspectedMemoryId: null,
});

export function createStore(): Store {
  let state: DemoState = initial();
  const listeners = new Set<(s: DemoState) => void>();
  const notify = () => { for (const l of listeners) l(state); };

  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    appendChat(m) {
      state = { ...state, chatMessages: [...state.chatMessages, m] };
      notify();
    },
    addLearnedMemory(m, opts = {}) {
      const learned: Memory = { ...m, origin: 'learned' };
      const ext = { ...state.linkedExtensions };
      for (const qid of opts.extendQueryIds ?? []) {
        ext[qid] = [...(ext[qid] ?? []), m.id];
      }
      state = {
        ...state,
        bank: [...state.bank, learned],
        newlyLearnedMemoryId: m.id,
        linkedExtensions: ext,
      };
      notify();
    },
    setInspectedNode(id) {
      state = { ...state, inspectedNodeId: id };
      notify();
    },
    setInspectedMemory(id) {
      state = { ...state, inspectedMemoryId: id };
      notify();
    },
    reset() {
      const bank = state.bank;
      const linkedExtensions = state.linkedExtensions;
      state = { ...initial(), bank, linkedExtensions };
      notify();
    },
  };
}
