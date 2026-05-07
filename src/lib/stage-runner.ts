import type { Store } from './store';
import { QUERIES } from '../data/queries';
import { TRAJECTORIES } from '../data/trajectories';
import { FRAUD_SIGNALS } from '../data/fraud-signals';
import { CHAT_SNIPPETS } from '../data/chat-snippets';
import { retrieveTopMemories } from './retrieval';
import { sleep } from './sleep';
import { ui } from './i18n';
import type { Localized, StepKind, Actor } from '../types';

export interface RunOptions {
  stepDelayMs?: number;
  stageDelayMs?: number;
  rng?: () => number;
}

const STEP_PREFIX_KEY: Record<StepKind, 'step.thought' | 'step.planned' | 'step.projection' | 'step.action' | 'step.observation' | 'step.terminate'> = {
  thought: 'step.thought',
  planned_action: 'step.planned',
  adversary_projection: 'step.projection',
  action_taken: 'step.action',
  environment_observation: 'step.observation',
  terminate: 'step.terminate',
};

const ACTOR_NODE: Record<Actor, string> = {
  agent: 'node-agent',
  adversary: 'node-adversary',
  environment: 'node-environment',
};

function L(en: string, zh: string): Localized { return { en, zh }; }

export async function runDemo(store: Store, queryId: string, opts: RunOptions = {}): Promise<void> {
  const stepDelay = opts.stepDelayMs ?? 900;
  const stageDelay = opts.stageDelayMs ?? 500;
  const rng = opts.rng ?? Math.random;

  const query = QUERIES.find((q) => q.id === queryId);
  if (!query) throw new Error(`runDemo: unknown query id ${queryId}`);
  const script = TRAJECTORIES.find((t) => t.id === query.scriptId);
  if (!script) throw new Error(`runDemo: no script for query ${queryId} (${query.scriptId})`);
  const lang = store.getState().language;

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
    caption: ui('caption.starting', lang),
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));

  // Stage 1: input
  store.setState((s) => ({
    ...s,
    stage: 'input',
    caption: ui('caption.s1', lang),
    highlightedNodeId: 'node-input',
    highlightedEdgeIds: [],
  }));
  if (query.mode === 'fraud-signals') {
    const sig = FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId)!;
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.signal', 'en')}\n${sig.summary.en}`, `${ui('sysmsg.input.signal', 'zh')}\n${sig.summary.zh}`) });
    for (const detail of sig.details) {
      store.appendChat({ sender: 'system', text: L('• ' + detail.en, '• ' + detail.zh) });
    }
  } else {
    const snip = CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId)!;
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.chat', 'en')} (${snip.participants.counterpart.en})`, `${ui('sysmsg.input.chat', 'zh')} (${snip.participants.counterpart.zh})`) });
    for (const m of snip.messages) store.appendChat(m);
  }
  await sleep(stageDelay);

  // Stage 2: query
  store.setState((s) => ({
    ...s,
    stage: 'query',
    caption: ui('caption.s2', lang),
    highlightedNodeId: 'node-query',
    highlightedEdgeIds: ['edge-input-query'],
  }));
  store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.userQuery', 'en')} ${query.label.en} — ${query.preview.en}`, `${ui('sysmsg.userQuery', 'zh')} ${query.label.zh} — ${query.preview.zh}`) });
  await sleep(stageDelay);

  // Stage 3: retrieval
  const ext = store.getState().linkedExtensions[query.id] ?? [];
  const effectiveLinked = [...query.linkedMemoryIds, ...ext].filter((id) =>
    store.getState().bank.some((m) => m.id === id),
  );
  const retrieved = retrieveTopMemories(store.getState().bank, effectiveLinked, rng);
  store.setState((s) => ({
    ...s,
    stage: 'retrieval',
    retrievedMemoryIds: retrieved.map((m) => m.id),
    caption: ui('caption.s3', lang),
    highlightedNodeId: 'node-bank',
    highlightedEdgeIds: ['edge-bank-agent'],
  }));
  store.appendChat({
    sender: 'system',
    text: L(
      `${ui('sysmsg.systemPrompt', 'en')}\n${retrieved.map((m, i) => `(${i + 1}) ${m.title.en}`).join('\n')}`,
      `${ui('sysmsg.systemPrompt', 'zh')}\n${retrieved.map((m, i) => `(${i + 1}) ${m.title.zh}`).join('\n')}`,
    ),
  });
  await sleep(stageDelay);

  // Stage 4: 1.5MaTTs trajectory loop
  store.setState((s) => ({
    ...s,
    stage: 'reasoning',
    caption: ui('caption.s4', lang),
    highlightedNodeId: 'node-agent',
    highlightedEdgeIds: ['edge-agent-adversary', 'edge-adversary-agent', 'edge-agent-environment', 'edge-environment-agent'],
  }));
  for (let i = 0; i < script.steps.length; i++) {
    const stepObj = script.steps[i];
    const enPrefix = ui(STEP_PREFIX_KEY[stepObj.kind], 'en');
    const zhPrefix = ui(STEP_PREFIX_KEY[stepObj.kind], 'zh');
    let edges: string[] = [];
    if (stepObj.kind === 'planned_action') edges = ['edge-agent-adversary'];
    else if (stepObj.kind === 'adversary_projection') edges = ['edge-adversary-agent'];
    else if (stepObj.kind === 'action_taken') edges = ['edge-agent-environment'];
    else if (stepObj.kind === 'environment_observation') edges = ['edge-environment-agent'];
    else if (stepObj.kind === 'terminate') edges = ['edge-agent-judge'];
    else edges = [];
    store.setState((s) => ({
      ...s,
      trajectoryStepIndex: i,
      highlightedNodeId: ACTOR_NODE[stepObj.actor],
      highlightedEdgeIds: edges,
    }));
    store.appendChat({
      sender: stepObj.actor,
      text: L(`${enPrefix} · ${stepObj.text.en}`, `${zhPrefix} · ${stepObj.text.zh}`),
    });
    await sleep(stepDelay);
  }

  // Stage 5: factory
  store.setState((s) => ({
    ...s,
    stage: 'factory',
    caption: ui('caption.s5', lang),
    highlightedNodeId: 'node-judge',
    highlightedEdgeIds: ['edge-agent-judge', 'edge-judge-bank'],
    judgeVerdict: script.judgeVerdict,
    outcome: script.outcome,
  }));
  store.appendChat({ sender: 'judge', text: L(`[${script.outcome}] ${script.judgeVerdict.en}`, `[${script.outcome === 'success' ? '成功' : '失败'}] ${script.judgeVerdict.zh}`) });

  const tpl = script.outcome === 'success' ? script.successMemory! : script.reflectionMemory!;
  const newId = `mem-${script.id}-${Date.now()}`;
  const extendTargets = QUERIES.filter((q) => {
    if (q.id === query.id) return true;
    const qTags = new Set(
      q.linkedMemoryIds
        .map((id) => store.getState().bank.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .flatMap((m) => m.tags),
    );
    return tpl.tags.some((t) => qTags.has(t));
  }).map((q) => q.id);

  store.addLearnedMemory(
    {
      id: newId,
      title: tpl.title,
      description: tpl.description,
      content: tpl.content,
      tags: tpl.tags,
    },
    { extendQueryIds: extendTargets, origin: script.outcome === 'success' ? 'learned-success' : 'learned-failure' },
  );
  store.appendChat({
    sender: 'system',
    text: L(`${ui('sysmsg.newMemory', 'en')}\n${tpl.title.en} — ${tpl.description.en}`, `${ui('sysmsg.newMemory', 'zh')}\n${tpl.title.zh} — ${tpl.description.zh}`),
  });
  await sleep(stageDelay);

  store.setState((s) => ({
    ...s,
    stage: 'done',
    caption: script.outcome === 'success' ? ui('caption.done.success', lang) : ui('caption.done.failure', lang),
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));
}
