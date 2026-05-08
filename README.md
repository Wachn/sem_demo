# ReasoningBank · Anti-Fraud Demo

A fully scripted, interactive frontend that visualizes a **ReasoningBank-style self-evolving memory agent** applied to anti-fraud / anti-scam scenarios (pig-butchering 杀猪盘, romance scams, recovery scams). No real LLM, no real memory bank — every behavior is hand-authored data driven through a deterministic stage runner so the demo is reproducible and presentation-friendly.

Inspired by Google Cloud's [ReasoningBank paper](https://arxiv.org/abs/2509.25140) on self-evolving agent memory, with a five-stage process adapted for cloud-based fraud-prevention agents.

---

## Quick start

```powershell
npm install
npm run dev          # http://localhost:5173
```

Other commands:

| Command            | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Vite dev server with hot reload                     |
| `npm run build`    | TypeScript check + production build to `dist/`      |
| `npm run preview`  | Serve the production build                          |
| `npm test`         | Run the Vitest suite (currently 44 tests)           |
| `npm run test:watch` | Vitest in watch mode                              |

---

## What the demo shows

The agent runs through five stages on every demo. Pick a query, click **Run demo**, and watch the diagram light up, the chat stream, the active pane track progress, and a new memory get committed to the bank.

| Stage         | What happens                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **1 · Input**     | One of two duality modes is loaded — fraud-signal report (auto-detection) or pasted chat snippet (user in doubt). |
| **2 · Query**     | A user query is formed and routed to the agent.                                                       |
| **3 · Retrieval** | Top-3 memories are sampled from a hand-authored linked pool inside ReasoningBank and injected into the system prompt. |
| **4 · 1.5MaTTs**  | Memory test-time scaling loop: `thought → planned_action → adversary_projection → action_taken → environment_observation` repeats until the agent emits `terminate`. |
| **5 · Factory**   | LLM-as-judge evaluates the trajectory; on success extracts an *insight memory*, on failure extracts a *reflection memory*. The new memory is committed to the bank. |

After each successful run, the bank counter ticks up and the new memory is auto-linked into related queries' retrieval pools — making the **self-evolving loop visible**: subsequent runs draw on memories produced by earlier runs.

### Try this flow

1. Pick a query in the Chat / Query Console (queries are grouped by mode via `<optgroup>`).
2. Click **Run demo**.
3. Watch nodes light up, edges pulse, chat messages stream in.
4. Click any **diagram node** for inspect mode — Active Pane shows that node's contents.
5. Click the **ReasoningBank** node, then click any memory → mini-window with full schema.
6. Click the **Judge** node to see the verbatim LLM-as-judge prompt template.
7. Toggle **EN / 中文** in the header — every label translates instantly.
8. Drag any diagram node to reposition; edges re-route in real time.

---

## Architecture

Vanilla TypeScript, no UI framework. Three coordinated views are driven by a single pub/sub store; a stage runner walks pre-authored trajectories on a timer.

```
┌─────────────────── Header ─────────────────────────────┐
│  Brand    Lang (EN/中文)              Run · Reset      │
├──────────────┬───────────────────┬─────────────────────┤
│              │  Active Pane      │  ReasoningBank      │
│ Flow Diagram │  (stage-aware OR  │  · seed memories    │
│  (n8n-style  │   inspect mode)   │  · learned · success│
│   draggable  ├───────────────────┤  · learned · reflect│
│   SVG +      │  Chat / Query     │   filter by tag…    │
│   pulses)    │  Console (stream) │                     │
└──────────────┴───────────────────┴─────────────────────┘
                                           Status footer
```

### Module layout

```
src/
├── main.ts                          # boots app, mounts components, wires Run/Reset
├── types.ts                         # shared types (Localized, StepKind, Origin, …)
├── styles/
│   ├── main.css                     # design tokens, panel chrome
│   ├── layout.css                   # 4-panel grid
│   ├── flow-diagram.css
│   ├── chat-panel.css
│   └── active-pane.css              # active pane + popover + bank list
├── data/
│   ├── memory-bank.ts               # 12 seed + reflection memories (EN/中文)
│   ├── fraud-signals.ts             # 3 auto-detection samples
│   ├── chat-snippets.ts             # 3 chat conversations
│   ├── queries.ts                   # 6 queries linked to memory pools + scripts
│   ├── trajectories.ts              # 6 hand-authored agent ↔ adversary ↔ env loops
│   └── ui-strings.ts                # ~80 bilingual UI labels
├── lib/
│   ├── i18n.ts                      # t() / ui() helpers + JUDGE_PROMPT_TEMPLATE
│   ├── retrieval.ts                 # picks 3 memories from a linked pool (seedable rng)
│   ├── store.ts                     # pub/sub store + DemoState
│   ├── stage-runner.ts              # orchestrates the 5-stage flow
│   └── sleep.ts
└── components/                      # each is `mountX(root, store) → cleanupFn`
    ├── language-selector.ts         # EN ↔ 中文 toggle
    ├── flow-diagram.ts              # SVG diagram, draggable + clickable nodes
    ├── chat-panel.ts                # message list + query picker (optgroups)
    ├── active-pane.ts               # stage-aware OR per-node inspect view
    ├── memory-bank-view.ts          # bank list with tag filter
    └── memory-detail-popover.ts     # mini-window for a single memory
tests/
├── data.test.ts                     # data integrity (bilingual, schemas, links)
├── i18n.test.ts
├── retrieval.test.ts
├── store.test.ts
├── stage-runner.test.ts
└── smoke.test.ts
```

### Data flow

```
user click Run
     │
     ▼
runDemo(store, queryId)
     │  ├── stage 'input'      → emit fraud-signal or chat-snippet to chat
     │  ├── stage 'query'      → emit user query
     │  ├── stage 'retrieval'  → retrieveTopMemories(bank, linked + extensions)
     │  ├── stage 'reasoning'  → for each TrajectoryStep: highlight node + edge, append chat
     │  ├── stage 'factory'    → judge verdict, addLearnedMemory(origin: success|failure)
     │  └── stage 'done'
     ▼
each setState/appendChat fans out to all subscribed components
     │
     ▼
flow-diagram, chat-panel, active-pane, bank-view re-render
```

### Self-evolution loop

When a run completes, `addLearnedMemory` does two things:

1. Inserts the new memory into `state.bank` with `origin: 'learned-success'` or `'learned-failure'`.
2. Extends the `linkedExtensions[queryId]` map for the originating query *and* every query whose linked-pool tags overlap the new memory's tags.

On the next run, `runDemo` reads `state.linkedExtensions[query.id]`, merges it with the query's static `linkedMemoryIds`, and feeds that effective pool to `retrieveTopMemories`. This means **memories produced by earlier runs can be retrieved by later runs**, demonstrating the self-evolving loop visually (you'll see the new memory show up in retrieved-top-3 on subsequent runs).

---

## Memory schema (ReasoningBank)

Every memory item — seed, learned-success, or learned-failure — follows the schema from the paper:

```ts
interface Memory {
  id: string;
  title:       Localized;        // a concise identifier summarizing the strategy
  description: Localized;        // one-sentence summary
  content:     Localized;        // distilled reasoning steps / decision rationales / insights
  tags: string[];                // technical taxonomy, kept in English
  origin?: 'seed' | 'learned-success' | 'learned-failure';
}
```

`Localized = { en: string; zh: string }`. The Judge node in the diagram exposes the verbatim **LLM-as-judge prompt template** (in both languages) that would extract these fields from a trajectory.

---

## Trajectory step kinds

The 1.5MaTTs (Memory Test-Time Scaling) loop is modeled with explicit step kinds so the agent / adversary / environment ping-pong is visible:

| Kind                       | Actor       | Meaning                                                              |
| -------------------------- | ----------- | -------------------------------------------------------------------- |
| `thought`                  | agent       | Internal reasoning before planning                                    |
| `planned_action`           | agent       | Intended next move, sent to adversary for projection                  |
| `adversary_projection`     | adversary   | Projected counterparty / scammer response — pseudo-environment        |
| `action_taken`             | agent       | Revised action after considering the projection                       |
| `environment_observation`  | environment | Actual observation from the real world                                |
| `terminate`                | agent       | Trajectory ends → factory stage runs                                   |

---

## Internationalization

Every translatable string is a `Localized` value. UI chrome strings live in `src/data/ui-strings.ts` (~80 keys); data strings live with the data they describe. Two helpers:

```ts
import { t, ui } from './lib/i18n';

t({ en: 'Run', zh: '运行' }, 'zh');   // → '运行'
ui('header.run', 'en');               // → 'Run demo'
```

Technical jargon (ReasoningBank, LLM, 1.5MaTTs, APK, USDT, WeChat, Telegram, WhatsApp, USD/SGD/GBP) stays in its source form in both languages by design.

---

## Plans & specs

The repo's design history lives under `docs/superpowers/plans/`:

- `2026-05-06-reasoningbank-antifraud-demo.md` — base 20-task plan
- `2026-05-07-interactive-diagram.md` — clickable nodes + memory popover
- `2026-05-07-i18n-trajectory-draggable.md` — i18n, full trajectory loop, Environment node, draggable nodes

---

## Tech stack

- **Vite 8** — build + dev server
- **TypeScript 6** — strict, no any (a couple of `as any` for typed string-union UI keys)
- **Vitest 4 + jsdom** — 44 tests across data integrity, retrieval, store, stage runner, i18n
- **Plain CSS** — no Tailwind, no UI framework
- **SVG** — flow diagram with `foreignObject` for rich HTML inside nodes

No runtime dependencies — the production bundle is ~72 KB raw / ~28 KB gzip.
