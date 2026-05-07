import type { Store } from './store';
import { QUERIES } from '../data/queries';
import { TRAJECTORIES } from '../data/trajectories';
import { FRAUD_SIGNALS } from '../data/fraud-signals';
import { CHAT_SNIPPETS } from '../data/chat-snippets';
import { retrieveTopMemories } from './retrieval';
import { sleep } from './sleep';

export interface RunOptions {
  stepDelayMs?: number;
  stageDelayMs?: number;
  rng?: () => number;
}

export async function runDemo(store: Store, queryId: string, opts: RunOptions = {}): Promise<void> {
  const stepDelay = opts.stepDelayMs ?? 900;
  const stageDelay = opts.stageDelayMs ?? 500;
  const rng = opts.rng ?? Math.random;

  const query = QUERIES.find((q) => q.id === queryId);
  if (!query) throw new Error(`runDemo: unknown query id ${queryId}`);
  const script = TRAJECTORIES.find((t) => t.id === query.scriptId);
  if (!script) throw new Error(`runDemo: no script for query ${queryId} (${query.scriptId})`);

  store.setState((s) => ({
    ...s,
    stage: 'idle',
    selectedQueryId: queryId,
    retrievedMemoryIds: [],
    trajectoryStepIndex: -1,
    chatMessages: [],
    newlyLearnedMemoryId: null,
    judgeVerdict: null,
    outcome: null,
    caption: 'Starting demo run…',
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));

  // Stage 1: input
  store.setState((s) => ({
    ...s,
    stage: 'input',
    caption: 'Stage 1 · Input mode selected. Sample data being prepared.',
    highlightedNodeId: 'node-input',
    highlightedEdgeIds: [],
  }));
  if (query.mode === 'fraud-signals') {
    const sig = FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId)!;
    store.appendChat({ sender: 'system', text: `[Fraud signal report]\n${sig.summary}` });
    for (const detail of sig.details) store.appendChat({ sender: 'system', text: `• ${detail}` });
  } else {
    const snip = CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId)!;
    store.appendChat({ sender: 'system', text: `[Pasted chat with ${snip.participants.counterpart}]` });
    for (const m of snip.messages) {
      store.appendChat({ sender: m.sender, text: m.text });
    }
  }
  await sleep(stageDelay);

  // Stage 2: query
  store.setState((s) => ({
    ...s,
    stage: 'query',
    caption: 'Stage 2 · User query formed and sent.',
    highlightedNodeId: 'node-query',
    highlightedEdgeIds: ['edge-input-query'],
  }));
  store.appendChat({ sender: 'system', text: `[User query] ${query.label} — ${query.preview}` });
  await sleep(stageDelay);

  // Stage 3: retrieval — pool extended by prior learned memories
  const ext = store.getState().linkedExtensions[query.id] ?? [];
  const effectiveLinked = [...query.linkedMemoryIds, ...ext].filter((id) =>
    store.getState().bank.some((m) => m.id === id),
  );
  const retrieved = retrieveTopMemories(store.getState().bank, effectiveLinked, rng);
  store.setState((s) => ({
    ...s,
    stage: 'retrieval',
    retrievedMemoryIds: retrieved.map((m) => m.id),
    caption: 'Stage 3 · Top-3 memories retrieved from ReasoningBank and appended to system prompt.',
    highlightedNodeId: 'node-bank',
    highlightedEdgeIds: ['edge-bank-agent'],
  }));
  store.appendChat({
    sender: 'system',
    text: `[System prompt assembled with retrieved memories]\n${retrieved.map((m, i) => `(${i + 1}) ${m.title}`).join('\n')}`,
  });
  await sleep(stageDelay);

  // Stage 4: 1.5MaTTs
  store.setState((s) => ({
    ...s,
    stage: 'reasoning',
    caption: 'Stage 4 · 1.5MaTTs — agent and adversarial environment exchange actions and observations.',
    highlightedNodeId: 'node-agent',
    highlightedEdgeIds: ['edge-agent-adversary', 'edge-adversary-agent'],
  }));
  for (let i = 0; i < script.steps.length; i++) {
    const step = script.steps[i];
    store.setState((s) => ({
      ...s,
      trajectoryStepIndex: i,
      highlightedNodeId: step.actor === 'agent' ? 'node-agent' : 'node-adversary',
      highlightedEdgeIds:
        step.actor === 'agent' ? ['edge-agent-adversary'] : ['edge-adversary-agent'],
    }));
    const prefix =
      step.kind === 'thought' ? '🧠 thought · '
      : step.kind === 'action' ? '➡️ action · '
      : step.kind === 'observation' ? '👁 observation · '
      : '🛑 terminate · ';
    store.appendChat({ sender: step.actor, text: prefix + step.text });
    await sleep(stepDelay);
  }

  // Stage 5: factory
  store.setState((s) => ({
    ...s,
    stage: 'factory',
    caption: 'Stage 5 · Factory — judge evaluates trajectory; insight or reflection extracted to a new memory.',
    highlightedNodeId: 'node-judge',
    highlightedEdgeIds: ['edge-agent-judge', 'edge-judge-bank'],
    judgeVerdict: script.judgeVerdict,
    outcome: script.outcome,
  }));
  store.appendChat({ sender: 'judge', text: `[Judge verdict · ${script.outcome}] ${script.judgeVerdict}` });

  const memTemplate = script.outcome === 'success' ? script.successMemory! : script.reflectionMemory!;
  const newId = `mem-${script.id}-${Date.now()}`;
  const extendTargets = QUERIES.filter((q) => {
    if (q.id === query.id) return true;
    const qTags = new Set(
      q.linkedMemoryIds
        .map((id) => store.getState().bank.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .flatMap((m) => m.tags),
    );
    return memTemplate.tags.some((t) => qTags.has(t));
  }).map((q) => q.id);

  store.addLearnedMemory(
    {
      id: newId,
      title: memTemplate.title,
      description: memTemplate.description,
      content: memTemplate.content,
      tags: memTemplate.tags,
    },
    { extendQueryIds: extendTargets },
  );
  store.appendChat({
    sender: 'system',
    text: `[New memory stored]\nTitle: ${memTemplate.title}\nDescription: ${memTemplate.description}`,
  });
  await sleep(stageDelay);

  // Done
  store.setState((s) => ({
    ...s,
    stage: 'done',
    caption: `Run complete · outcome: ${script.outcome}. Memory bank now has ${s.bank.length} memories.`,
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));
}
