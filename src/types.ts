export type Mode = 'fraud-signals' | 'chat-messages';

export type Stage =
  | 'idle'
  | 'input'
  | 'query'
  | 'retrieval'
  | 'reasoning'
  | 'factory'
  | 'done';

export interface Memory {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  origin?: 'seed' | 'learned';
}

export interface FraudSignal {
  id: string;
  label: string;
  summary: string;
  details: string[];
}

export interface ChatSnippet {
  id: string;
  label: string;
  participants: { victim: string; counterpart: string };
  messages: ChatMessage[];
}

export interface ChatMessage {
  sender: 'victim' | 'counterpart' | 'agent' | 'adversary' | 'system' | 'judge';
  text: string;
}

export interface Query {
  id: string;
  mode: Mode;
  label: string;
  preview: string;
  fraudSignalId?: string;
  chatSnippetId?: string;
  linkedMemoryIds: string[];
  scriptId: string;
}

export type Actor = 'agent' | 'adversary';

export interface TrajectoryStep {
  kind: 'thought' | 'action' | 'observation' | 'terminate';
  actor: Actor;
  text: string;
}

export type Outcome = 'success' | 'failure';

export interface TrajectoryScript {
  id: string;
  steps: TrajectoryStep[];
  outcome: Outcome;
  judgeVerdict: string;
  successMemory?: { title: string; description: string; content: string; tags: string[] };
  reflectionMemory?: { title: string; description: string; content: string; tags: string[] };
}

export type InspectableNodeId =
  | 'node-input'
  | 'node-query'
  | 'node-bank'
  | 'node-agent'
  | 'node-adversary'
  | 'node-judge';
