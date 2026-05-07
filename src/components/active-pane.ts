import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import { FRAUD_SIGNALS } from '../data/fraud-signals';
import { CHAT_SNIPPETS } from '../data/chat-snippets';
import type { Stage } from '../types';

const STAGE_ORDER: Stage[] = ['input', 'query', 'retrieval', 'reasoning', 'factory', 'done'];
const STAGE_LABEL: Record<Stage, string> = {
  idle: 'Idle',
  input: '1 · Input',
  query: '2 · Query',
  retrieval: '3 · Retrieval',
  reasoning: '4 · 1.5MaTTs',
  factory: '5 · Factory',
  done: 'Done',
};

const NODE_NAME: Record<string, string> = {
  'node-input': 'Input',
  'node-query': 'User Query',
  'node-bank': 'ReasoningBank',
  'node-agent': 'Agent (LLM)',
  'node-adversary': 'Adversary (env)',
  'node-judge': 'Judge',
};

export function mountActivePane(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header">Active Pane</div>
    <div data-role="bar"></div>
    <div class="active-pane-body" data-role="body"></div>
  `;
  const bar = root.querySelector<HTMLDivElement>('[data-role="bar"]')!;
  const body = root.querySelector<HTMLDivElement>('[data-role="body"]')!;

  function render() {
    const s = store.getState();

    if (s.inspectedNodeId) {
      bar.innerHTML = `
        <div class="inspect-bar">
          <span class="label">Inspecting</span>
          <span class="target">${NODE_NAME[s.inspectedNodeId] ?? s.inspectedNodeId}</span>
          <button class="close-btn" data-role="close-inspect">close ✕</button>
        </div>
      `;
      bar.querySelector<HTMLButtonElement>('[data-role="close-inspect"]')!.addEventListener('click', () => {
        store.setInspectedNode(null);
        store.setInspectedMemory(null);
      });
    } else {
      bar.innerHTML = '';
    }

    if (s.inspectedNodeId) {
      body.innerHTML = renderInspect(s.inspectedNodeId, s);
      wireBankListClicks(body);
    } else {
      body.innerHTML = renderAuto(s);
    }
  }

  function wireBankListClicks(root: HTMLElement) {
    root.querySelectorAll<HTMLDivElement>('.bank-list-inline .mem-card').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-mem-id');
        if (id) store.setInspectedMemory(id);
      });
    });
  }

  function renderAuto(s: ReturnType<Store['getState']>): string {
    const query = QUERIES.find((q) => q.id === s.selectedQueryId);
    const signal = query?.fraudSignalId ? FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId) : null;
    const snippet = query?.chatSnippetId ? CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId) : null;
    const retrieved = s.retrievedMemoryIds
      .map((id) => s.bank.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    const stagePills = STAGE_ORDER.map((stg) => {
      const isCurrent = stg === s.stage;
      let cls = 'stage-pill';
      if (isCurrent) cls += ' is-active';
      if (stg === 'done' && s.outcome === 'success') cls += ' is-success';
      if (stg === 'done' && s.outcome === 'failure') cls += ' is-failure';
      return `<span class="${cls}"><span class="dot"></span>${STAGE_LABEL[stg]}</span>`;
    }).join('');

    const inputBlock =
      query
        ? signal
          ? `<div class="kv-block"><h4>Selected fraud signal</h4><div class="body"><strong>${esc(signal.label)}</strong>\n${esc(signal.summary)}\n\n${signal.details.map((d) => '• ' + esc(d)).join('\n')}</div></div>`
          : snippet
            ? `<div class="kv-block"><h4>Selected chat snippet</h4><div class="body"><strong>${esc(snippet.label)}</strong> · with ${esc(snippet.participants.counterpart)}\n${snippet.messages.length} messages</div></div>`
            : ''
        : '<div class="kv-block"><h4>Pick a query</h4><div class="body">Select a mode in the header, then choose a query in the chat panel. Or click any node in the diagram to inspect it.</div></div>';

    const queryBlock = query
      ? `<div class="kv-block"><h4>User query</h4><div class="body"><strong>${esc(query.label)}</strong>\n${esc(query.preview)}</div></div>`
      : '';

    const retrievalBlock = retrieved.length
      ? `<div class="kv-block"><h4>Retrieved memories (top-3)</h4>${retrieved.map((m) => memCard(m.id, m.title, m.description, m.tags)).join('')}</div>`
      : '';

    const verdictBlock = s.judgeVerdict
      ? `<div class="kv-block"><h4>Judge verdict</h4><div class="body verdict ${s.outcome ?? ''}">${esc(s.judgeVerdict)}</div></div>`
      : '';

    const learned = s.bank[s.bank.length - 1];
    const learnedBlock = s.stage === 'done' && learned && learned.origin === 'learned'
      ? `<div class="kv-block"><h4>New memory committed to bank</h4>${memCard(learned.id, learned.title, learned.description, learned.tags)}</div>`
      : '';

    return `
      <div class="active-stage-banner">${stagePills}</div>
      ${inputBlock}
      ${queryBlock}
      ${retrievalBlock}
      ${verdictBlock}
      ${learnedBlock}
    `;
  }

  function renderInspect(nodeId: string, s: ReturnType<Store['getState']>): string {
    const query = QUERIES.find((q) => q.id === s.selectedQueryId);

    if (nodeId === 'node-input') {
      if (!query) return placeholder('Pick a query to populate input data.');
      const sig = query.fraudSignalId ? FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId) : null;
      const snip = query.chatSnippetId ? CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId) : null;
      if (sig) {
        return `<div class="kv-block"><h4>Fraud signal · ${esc(sig.id)}</h4><div class="body"><strong>${esc(sig.label)}</strong>\n${esc(sig.summary)}\n\n${sig.details.map((d) => '• ' + esc(d)).join('\n')}</div></div>`;
      }
      if (snip) {
        const lines = snip.messages.map((m) => `${m.sender === 'victim' ? snip.participants.victim : snip.participants.counterpart}: ${m.text}`).join('\n');
        return `<div class="kv-block"><h4>Chat snippet · ${esc(snip.id)}</h4><div class="body"><strong>${esc(snip.label)}</strong>\n\n${esc(lines)}</div></div>`;
      }
      return placeholder('No input data resolved for the selected query.');
    }

    if (nodeId === 'node-query') {
      if (!query) return placeholder('No query selected. Pick one in the chat panel.');
      return `
        <div class="kv-block"><h4>Query</h4><div class="body"><strong>${esc(query.label)}</strong>\n${esc(query.preview)}</div></div>
        <div class="kv-block"><h4>Mode</h4><div class="body">${esc(query.mode)}</div></div>
        <div class="kv-block"><h4>Linked memory pool</h4><div class="body">${query.linkedMemoryIds.map((id) => '• ' + esc(id)).join('\n')}\n\nExtensions from prior runs: ${(s.linkedExtensions[query.id] ?? []).length}</div></div>
      `;
    }

    if (nodeId === 'node-bank') {
      const sorted = s.bank.slice().sort((a, b) => Number(b.origin === 'learned') - Number(a.origin === 'learned'));
      const cards = sorted.map((m) => memCard(m.id, m.title, m.description, m.tags, m.origin === 'learned')).join('');
      return `
        <div class="kv-block"><h4>ReasoningBank · ${s.bank.length} memories</h4><div class="body">Click any memory to open the detail mini-window.</div></div>
        <div class="bank-list-inline">${cards}</div>
      `;
    }

    if (nodeId === 'node-agent') {
      const retrieved = s.retrievedMemoryIds
        .map((id) => s.bank.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));
      const memsBlock = retrieved.length
        ? `<div class="kv-block"><h4>System prompt · retrieved memories</h4>${retrieved.map((m) => memCard(m.id, m.title, m.description, m.tags)).join('')}</div>`
        : `<div class="kv-block"><h4>System prompt · retrieved memories</h4><div class="body">No memories retrieved yet — run the demo to populate this.</div></div>`;
      return `
        <div class="kv-block"><h4>Role</h4><div class="body">Plans actions and emits thoughts/actions. Receives the user query plus the retrieved memories as system prompt.</div></div>
        ${memsBlock}
      `;
    }

    if (nodeId === 'node-adversary') {
      const lastObs = [...s.chatMessages].reverse().find((m) => m.sender === 'adversary');
      return `
        <div class="kv-block"><h4>Role</h4><div class="body">Pseudo-environment. Projects the likely scammer / counterparty response to each agent action.</div></div>
        <div class="kv-block"><h4>Last observation</h4><div class="body">${lastObs ? esc(lastObs.text) : 'No observation yet.'}</div></div>
      `;
    }

    if (nodeId === 'node-judge') {
      return `
        <div class="kv-block"><h4>Role</h4><div class="body">LLM-as-a-judge. Evaluates the trajectory's outcome (success / failure) and triggers extraction of an insight memory or a reflection memory.</div></div>
        <div class="kv-block"><h4>Verdict</h4><div class="body verdict ${s.outcome ?? ''}">${s.judgeVerdict ? esc(s.judgeVerdict) : 'No verdict yet.'}</div></div>
      `;
    }

    return placeholder(`Unknown node: ${nodeId}`);
  }

  function placeholder(msg: string): string {
    return `<div class="kv-block"><h4>—</h4><div class="body">${esc(msg)}</div></div>`;
  }

  function memCard(id: string, title: string, desc: string, tags: string[], learned = false): string {
    const flag = learned ? '<span class="origin-flag">learned</span>' : '';
    const tagHtml = tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');
    return `<div class="mem-card" data-mem-id="${esc(id)}"><div class="title">${esc(title)}${flag}</div><div class="desc">${esc(desc)}</div><div class="tags">${tagHtml}</div></div>`;
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
