import type { ChatMessage, Memory, Mode, Stage, Lang, Origin } from '../types';
import { SEED_MEMORIES } from '../data/memory-bank';
import { loadBank, saveBank, clearBank } from './persistence';

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
  judgeVerdict: import('../types').Localized | null;
  outcome: 'success' | 'failure' | null;
  currentRoundIndex: number | null;
  linkedExtensions: Record<string, string[]>;
  inspectedNodeId: string | null;
  inspectedMemoryId: string | null;
  language: Lang;
  nodePositions: Record<string, { x: number; y: number }>;
}

export type Updater = (s: DemoState) => DemoState;

export interface Store {
  getState(): DemoState;
  setState(updater: Updater): void;
  subscribe(listener: (s: DemoState) => void): () => void;
  appendChat(m: ChatMessage): void;
  addLearnedMemory(m: Omit<Memory, 'origin'>, opts?: { extendQueryIds?: string[]; origin?: Origin }): void;
  setInspectedNode(id: string | null): void;
  setInspectedMemory(id: string | null): void;
  setLanguage(lang: Lang): void;
  setNodePosition(id: string, pos: { x: number; y: number }): void;
  updateMemory(id: string, patch: Partial<Omit<Memory, 'id'>>): void;
  deleteMemory(id: string): void;
  restoreDefaults(): void;
  reset(): void;
}

const initial = (): DemoState => ({
  mode: 'fraud-signals',
  stage: 'idle',
  selectedQueryId: null,
  retrievedMemoryIds: [],
  trajectoryStepIndex: -1,
  chatMessages: [],
  bank: loadBank() ?? SEED_MEMORIES.slice(),
  newlyLearnedMemoryId: null,
  caption: '',
  highlightedNodeId: null,
  highlightedEdgeIds: [],
  judgeVerdict: null,
  outcome: null,
  currentRoundIndex: null,
  linkedExtensions: {},
  inspectedNodeId: null,
  inspectedMemoryId: null,
  language: 'en',
  nodePositions: {},
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
      const learned: Memory = { ...m, origin: opts.origin ?? 'learned-success' };
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
      saveBank(state.bank);
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
    setLanguage(lang) {
      state = { ...state, language: lang };
      notify();
    },
    setNodePosition(id, pos) {
      state = { ...state, nodePositions: { ...state.nodePositions, [id]: pos } };
      notify();
    },
    updateMemory(id, patch) {
      state = {
        ...state,
        bank: state.bank.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      };
      saveBank(state.bank);
      notify();
    },
    deleteMemory(id) {
      state = { ...state, bank: state.bank.filter((m) => m.id !== id) };
      if (state.inspectedMemoryId === id) state = { ...state, inspectedMemoryId: null };
      saveBank(state.bank);
      notify();
    },
    restoreDefaults() {
      clearBank();
      state = { ...state, bank: SEED_MEMORIES.slice(), linkedExtensions: {}, inspectedMemoryId: null };
      saveBank(state.bank);
      notify();
    },
    reset() {
      const bank = state.bank;
      const linkedExtensions = state.linkedExtensions;
      const language = state.language;
      const nodePositions = state.nodePositions;
      state = { ...initial(), bank, linkedExtensions, language, nodePositions };
      notify();
    },
  };
}
