export type Lang = 'en' | 'zh';

export interface Localized {
  en: string;
  zh: string;
}

export type Mode = 'fraud-signals' | 'chat-messages';

export type Stage =
  | 'idle' | 'input' | 'query' | 'retrieval' | 'reasoning' | 'factory' | 'done';

export type Origin = 'seed' | 'learned-success' | 'learned-failure';

export interface Memory {
  id: string;
  title: Localized;
  description: Localized;
  content: Localized;
  tags: string[];
  origin?: Origin;
}

export interface FraudSignal {
  id: string;
  label: Localized;
  summary: Localized;
  details: Localized[];
}

export interface ChatSnippet {
  id: string;
  label: Localized;
  participants: { victim: Localized; counterpart: Localized };
  messages: ChatMessage[];
}

export type Sender = 'victim' | 'counterpart' | 'agent' | 'adversary' | 'environment' | 'system' | 'judge';

export interface ChatMessage {
  sender: Sender;
  text: Localized;
}

export interface Query {
  id: string;
  mode: Mode;
  label: Localized;
  preview: Localized;
  fraudSignalId?: string;
  chatSnippetId?: string;
  linkedMemoryIds: string[];
  scriptId: string;
}

export type StepKind =
  | 'thought'
  | 'candidate_trajectory'
  | 'contrastive_selection'
  | 'adversary_projection'
  | 'action_taken'
  | 'environment_observation'
  | 'terminate';

export type Actor = 'agent' | 'adversary' | 'environment';

export interface TrajectoryStep {
  kind: StepKind;
  actor: Actor;
  text: Localized;
  /** 1-based round of the MaTTs loop this step belongs to. Required on every
      step from candidate_trajectory through environment_observation. Optional
      on standalone thoughts and on terminate. */
  roundIndex?: number;
  /** Only on `candidate_trajectory`. */
  candidateIndex?: 1 | 2 | 3;
  candidateLabel?: Localized;
  /** Only on `contrastive_selection` — which candidate from the same round was chosen. */
  selectedIndex?: 1 | 2 | 3;
}

export type Outcome = 'success' | 'failure';

export interface TrajectoryScript {
  id: string;
  steps: TrajectoryStep[];
  outcome: Outcome;
  judgeVerdict: Localized;
  successMemory?: { title: Localized; description: Localized; content: Localized; tags: string[] };
  reflectionMemory?: { title: Localized; description: Localized; content: Localized; tags: string[] };
}

export type InspectableNodeId =
  | 'node-input' | 'node-query' | 'node-bank'
  | 'node-agent' | 'node-adversary' | 'node-environment' | 'node-judge';
