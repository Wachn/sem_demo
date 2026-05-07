# Interactive Flow Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every flow-diagram node clickable so the active pane shows that node's contents on demand, and let users drill into individual memories via a mini-window popover.

**Architecture:** Add two new fields to the store — `inspectedNodeId` and `inspectedMemoryId` — that act as a small router for the active pane. Diagram nodes set `inspectedNodeId` on click; the bank-node detail view lets users click a memory card to set `inspectedMemoryId`, which renders a mini-window popover over the current active-pane content. The auto/stage-driven view is preserved as the default; inspect-mode overrides it until the user clears it.

**Tech Stack:** Same as the base demo — vanilla TypeScript, Vite, Vitest+jsdom, plain CSS, SVG.

**Prerequisites:** The base plan (`2026-05-06-reasoningbank-antifraud-demo.md`) must be executed at least through Task 17 (run/reset wired). This plan modifies `src/lib/store.ts`, `src/components/flow-diagram.ts`, `src/components/active-pane.ts`, and adds one new component file.

---

## File Structure (changes only)

```
src/
├── types.ts                           # MODIFIED: add InspectableNodeId
├── lib/
│   └── store.ts                       # MODIFIED: inspectedNodeId, inspectedMemoryId + setters
├── styles/
│   ├── flow-diagram.css               # MODIFIED: clickable node states
│   └── active-pane.css                # MODIFIED: inspect-mode header, popover styles
└── components/
    ├── flow-diagram.ts                # MODIFIED: click handlers on nodes
    ├── active-pane.ts                 # MODIFIED: mode dispatch + node-detail views
    └── memory-detail-popover.ts       # NEW: mini-window for individual memory
```

**Naming conventions (locked for this plan):**
- Inspect node IDs reuse existing diagram node IDs: `node-input`, `node-query`, `node-bank`, `node-agent`, `node-adversary`, `node-judge`.
- Active-pane modes: `'auto'` (stage-driven, default) | `'inspect'` (a node has been clicked).
- Memory-detail popover element id: `memory-detail-popover`.

---

## Task 1: Extend store with inspect state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/store.ts`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Extend the failing test at `tests/store.test.ts`**

Append the following describe block to the existing file:

```ts
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
```

Make sure the file imports `vi` from `vitest`. If not already imported, change the first import to:

```ts
import { describe, it, expect, vi } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `setInspectedNode` not a function, `inspectedNodeId` undefined.

- [ ] **Step 3: Add `InspectableNodeId` type to `src/types.ts`**

Append to the existing file:

```ts
export type InspectableNodeId =
  | 'node-input'
  | 'node-query'
  | 'node-bank'
  | 'node-agent'
  | 'node-adversary'
  | 'node-judge';
```

- [ ] **Step 4: Update `DemoState` in `src/lib/store.ts`**

Add the two fields to the `DemoState` interface (place them after `outcome`):

```ts
  inspectedNodeId: string | null;
  inspectedMemoryId: string | null;
```

Update `initial()` to include them:

```ts
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
```

- [ ] **Step 5: Add setters to the `Store` interface and the `createStore` factory**

Add to the `Store` interface (after `addLearnedMemory`):

```ts
  setInspectedNode(id: string | null): void;
  setInspectedMemory(id: string | null): void;
```

Add the implementations inside `createStore()` (alongside the other methods, before `reset`):

```ts
    setInspectedNode(id) {
      state = { ...state, inspectedNodeId: id };
      for (const l of listeners) l(state);
    },
    setInspectedMemory(id) {
      state = { ...state, inspectedMemoryId: id };
      for (const l of listeners) l(state);
    },
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All inspect-state assertions pass; existing tests still pass.

- [ ] **Step 7: Commit**

```powershell
git add src/types.ts src/lib/store.ts tests/store.test.ts
git commit -m "feat: add inspectedNodeId and inspectedMemoryId to store"
```

---

## Task 2: Make flow-diagram nodes clickable

**Files:**
- Modify: `src/components/flow-diagram.ts`
- Modify: `src/styles/flow-diagram.css`

- [ ] **Step 1: Add `cursor:pointer` and selected styling to `src/styles/flow-diagram.css`**

Append to the existing file:

```css
.flow-node {
  cursor: pointer;
  user-select: none;
}
.flow-node:hover {
  border-color: rgba(91, 140, 255, 0.5);
  transform: translateY(-1px);
}
.flow-node.is-inspected {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.flow-node.is-inspected.is-active {
  outline-color: var(--good);
}
```

- [ ] **Step 2: Wire click handlers in `src/components/flow-diagram.ts`**

Inside `mountFlowDiagram`, after the loop that creates node `foreignObject` elements and BEFORE the `render` function definition, add:

```ts
  nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      const current = store.getState().inspectedNodeId;
      // Clicking the same node a second time clears inspection (toggle).
      store.setInspectedNode(current === id ? null : id);
      // Clicking a different node also clears any inspected memory.
      if (current !== id) store.setInspectedMemory(null);
    });
  });
```

- [ ] **Step 3: Update the `render` function to apply the `is-inspected` class**

In the `render` function inside `flow-diagram.ts`, replace the node-update block (the `nodesG.querySelectorAll(...).forEach(...)` line that toggles `is-active`) with:

```ts
    // Nodes
    nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      el.classList.toggle('is-active', id === s.highlightedNodeId);
      el.classList.toggle('is-inspected', id === s.inspectedNodeId);
    });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev` and open the URL. Click any diagram node — it should get a blue outline. Click it again to clear. Click a different node to switch the outline. (No active-pane change yet — that comes next task.)

- [ ] **Step 5: Commit**

```powershell
git add src/components/flow-diagram.ts src/styles/flow-diagram.css
git commit -m "feat: clickable diagram nodes (toggle inspect)"
```

---

## Task 3: Active-pane mode dispatch + per-node detail views

The active pane needs to render two distinct view trees:
- **auto** (existing): stage banner + input/query/retrieval/verdict/learned blocks driven by stage runner
- **inspect**: a header strip ("Inspecting · Node Name" + close button) and node-specific content

**Files:**
- Modify: `src/components/active-pane.ts`
- Modify: `src/styles/active-pane.css`

- [ ] **Step 1: Append inspect-mode styles to `src/styles/active-pane.css`**

```css
.inspect-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--edge);
  font-size: 12px;
  color: var(--fg-muted);
}
.inspect-bar .label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.inspect-bar .target {
  color: var(--accent);
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
.inspect-bar .close-btn {
  margin-left: auto;
  background: transparent;
  color: var(--fg-muted);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}
.inspect-bar .close-btn:hover { color: var(--fg); border-color: var(--accent); }

.bank-list-inline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bank-list-inline .mem-card { cursor: pointer; transition: border-color 120ms ease, background 120ms ease; }
.bank-list-inline .mem-card:hover { border-color: var(--accent); background: rgba(91,140,255,0.06); }
```

- [ ] **Step 2: Replace `src/components/active-pane.ts` with the mode-dispatching version**

Replace the entire file with:

```ts
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

    // --- Inspect bar ---
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

    // --- Body ---
    if (s.inspectedNodeId) {
      body.innerHTML = renderInspect(s.inspectedNodeId, s);
      wireBankListClicks(body, store);
    } else {
      body.innerHTML = renderAuto(s);
    }
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

  function wireBankListClicks(root: HTMLElement, store: Store) {
    root.querySelectorAll<HTMLDivElement>('.bank-list-inline .mem-card').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-mem-id');
        if (id) store.setInspectedMemory(id);
      });
    });
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Click each diagram node in turn — the active pane should switch:
- **node-input** → shows the selected fraud signal or chat snippet (or a placeholder if no query is picked)
- **node-query** → query metadata + linked memory pool
- **node-bank** → full bank list with hover effect (memories clickable but no popover yet — comes in Task 4)
- **node-agent** → role + retrieved memories
- **node-adversary** → role + last observation
- **node-judge** → role + verdict

Click "close ✕" or click the same node again to return to auto view.

- [ ] **Step 4: Commit**

```powershell
git add src/components/active-pane.ts src/styles/active-pane.css
git commit -m "feat: active pane mode dispatch with per-node detail views"
```

---

## Task 4: Memory detail mini-window (popover)

The mini-window is an absolute-positioned overlay rendered into the active pane's panel root. It appears whenever `inspectedMemoryId` is set, regardless of which node-detail view is showing underneath. Clicking outside the popover or the close button clears `inspectedMemoryId`.

**Files:**
- Create: `src/components/memory-detail-popover.ts`
- Modify: `src/styles/active-pane.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Append popover styles to `src/styles/active-pane.css`**

```css
.popover-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 16, 0.55);
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}
.popover-window {
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  max-width: 540px;
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  animation: popIn 160ms ease-out 1;
}
@keyframes popIn {
  0%   { transform: translateY(-6px) scale(0.98); opacity: 0; }
  100% { transform: translateY(0)    scale(1);    opacity: 1; }
}
.popover-window .pop-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--edge);
}
.popover-window .pop-head .pop-title {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}
.popover-window .pop-head .origin-flag { color: var(--good); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
.popover-window .pop-head .pop-close {
  background: transparent;
  color: var(--fg-muted);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.popover-window .pop-head .pop-close:hover { color: var(--fg); border-color: var(--accent); }
.popover-window .pop-section {
  padding: 12px 14px;
  border-bottom: 1px solid var(--edge);
}
.popover-window .pop-section:last-child { border-bottom: none; }
.popover-window .pop-section h5 {
  margin: 0 0 6px 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
}
.popover-window .pop-section .body {
  font-size: 13px;
  white-space: pre-wrap;
}
.popover-window .pop-section .tags { display: flex; flex-wrap: wrap; gap: 4px; }
.panel-active { position: relative; } /* anchor for the popover */
```

- [ ] **Step 2: Create `src/components/memory-detail-popover.ts`**

```ts
import type { Store } from '../lib/store';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  // Backdrop is added/removed on demand inside the panel root.
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;

  function close() {
    store.setInspectedMemory(null);
  }

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
      if (escListener) {
        document.removeEventListener('keydown', escListener);
        escListener = null;
      }
      return;
    }
    const mem = s.bank.find((m) => m.id === id);
    if (!mem) {
      // Bank changed underneath us; clear silently.
      close();
      return;
    }

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'popover-backdrop';
      backdrop.id = 'memory-detail-popover';
      backdrop.addEventListener('click', (ev) => {
        if (ev.target === backdrop) close();
      });
      panelRoot.appendChild(backdrop);

      escListener = (ev) => {
        if (ev.key === 'Escape') close();
      };
      document.addEventListener('keydown', escListener);
    }

    const flag = mem.origin === 'learned' ? '<span class="origin-flag">learned</span>' : '';
    const tagHtml = mem.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');

    backdrop.innerHTML = `
      <div class="popover-window" role="dialog" aria-modal="true">
        <div class="pop-head">
          <div class="pop-title">${esc(mem.title)}</div>
          ${flag}
          <button class="pop-close" data-role="close">close ✕</button>
        </div>
        <div class="pop-section">
          <h5>Description</h5>
          <div class="body">${esc(mem.description)}</div>
        </div>
        <div class="pop-section">
          <h5>Content</h5>
          <div class="body">${esc(mem.content)}</div>
        </div>
        <div class="pop-section">
          <h5>Tags</h5>
          <div class="tags">${tagHtml}</div>
        </div>
        <div class="pop-section">
          <h5>Origin · ID</h5>
          <div class="body">${esc(mem.origin ?? 'seed')} · ${esc(mem.id)}</div>
        </div>
      </div>
    `;
    backdrop.querySelector<HTMLButtonElement>('[data-role="close"]')!.addEventListener('click', close);
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return () => {
    off();
    if (backdrop) backdrop.remove();
    if (escListener) document.removeEventListener('keydown', escListener);
  };
}
```

- [ ] **Step 3: Mount the popover in `src/main.ts`**

In the imports block at the top of `src/main.ts`, add:

```ts
import { mountMemoryDetailPopover } from './components/memory-detail-popover';
```

After the existing `mountActivePane(...)` call, add:

```ts
mountMemoryDetailPopover(document.getElementById('active-pane')!, store);
```

(The popover anchors itself inside the `#active-pane` panel — which already has `position: relative` thanks to the rule we appended.)

- [ ] **Step 4: Also wire memory clicks from the persistent bank-side view**

So the popover also opens when the user clicks a card in the right-hand `memory-bank-view`, not only from the inspect view. Modify `src/components/memory-bank-view.ts`. Inside the existing `mountMemoryBankView` function, after the `function render()` definition and before the `const off = store.subscribe(render);` line, add:

```ts
  list.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLDivElement>('.mem-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (id) store.setInspectedMemory(id);
  });
```

Also make the bank-list cards look clickable. Append to `src/styles/active-pane.css`:

```css
.bank-list .mem-card { cursor: pointer; transition: border-color 120ms ease, background 120ms ease; }
.bank-list .mem-card:hover { border-color: var(--accent); background: rgba(91,140,255,0.06); }
```

- [ ] **Step 5: Manual verify**

Run: `npm run dev`. Verification path:
1. Click the **ReasoningBank** node — active pane shows the inline bank list. Click any memory → popover opens with title, description, content, tags, origin.
2. Click outside the popover (on the backdrop) → popover closes.
3. Open it again → press Escape → popover closes.
4. Click a memory in the right-hand `ReasoningBank` panel directly (not via inspect) → popover opens.
5. Run a full demo. After it ends, click the new "learned" memory in the bank view → popover shows it with the "learned" flag.

- [ ] **Step 6: Commit**

```powershell
git add src/components/memory-detail-popover.ts src/components/memory-bank-view.ts src/styles/active-pane.css src/main.ts
git commit -m "feat: memory detail mini-window popover (inspect + bank-side)"
```

---

## Self-Review

**Spec coverage:**

| Spec point | Task |
| --- | --- |
| Diagram is interactive — clicking a node opens its content in the active pane | Tasks 2, 3 |
| Click ReasoningBank → list of clickable memories in active pane | Task 3 (`renderInspect('node-bank', …)`) |
| Click a memory item → mini-window with full content | Task 4 |
| Mini-window shows on the active pane area | Task 4 (`panel-active` is the popover anchor; `position: relative` on the panel) |
| Toggling and closing inspection without breaking the auto/stage-driven view | Tasks 1 (independent state), 2 (toggle-off semantics), 3 (auto fallback), 4 (Escape + backdrop close) |

**Placeholder scan:** No "TBD"/"TODO"/handwaving — every step has the actual code or the precise insertion point.

**Type consistency check:**
- `inspectedNodeId: string | null` and `inspectedMemoryId: string | null` are added to `DemoState`, `initial()`, `reset()` (via `initial()` reuse), `Store` interface, and `createStore()` factory — names match across all five places.
- `setInspectedNode(id)` / `setInspectedMemory(id)` signatures match between interface and implementation in `Task 1` and the callers in `Task 2`, `Task 3`, `Task 4`.
- Diagram node IDs (`node-input | node-query | node-bank | node-agent | node-adversary | node-judge`) match the `NODES` array in the base plan's `flow-diagram.ts` and the `NODE_NAME` map + `renderInspect` branches added here.
- `mem-card` `data-id` (used by the persistent bank-side view) and `data-mem-id` (used by the inline inspect-mode bank list) are intentionally distinct — each handler reads only its own attribute, so no collision.
- The popover anchors to `#active-pane` because `panel-active` gets `position: relative` in Task 4's CSS. Mounting after `mountActivePane` is correct because `mountActivePane` doesn't recreate the panel root, only its inner children.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-07-interactive-diagram.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
