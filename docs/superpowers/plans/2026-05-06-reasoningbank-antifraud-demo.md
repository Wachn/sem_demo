# ReasoningBank Anti-Fraud Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully scripted, n8n-style demo frontend that visualizes a 5-stage anti-fraud/scam agent powered by a self-evolving "ReasoningBank" memory — using only vanilla TypeScript, HTML, and CSS.

**Architecture:** Vite-bundled vanilla TypeScript app. A small pub/sub store drives three coordinated views: a **flow diagram** (SVG nodes + edges, n8n-style) that lights up nodes as the demo advances, a **chat panel** that streams messages, and a **stage-aware active pane** that surfaces what the system is "doing" at each step. All AI behavior is faked: queries map to pre-authored memory retrievals and trajectory scripts; a stage runner walks them on a timer. After the run, a "factory" appends a new memory to the bank, so subsequent runs visibly include it — illustrating the self-evolving loop.

**Tech Stack:** TypeScript 5, Vite 5 (vanilla-ts template), Vitest 1 + jsdom for tests, plain CSS (no Tailwind), SVG for the diagram. No runtime frameworks.

---

## File Structure

```
sem_demo/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts                    # Boots the app, wires components to store
│   ├── types.ts                   # Shared TypeScript types
│   ├── styles/
│   │   ├── main.css               # Resets + design tokens (colors, spacing)
│   │   ├── layout.css             # 3-column app layout
│   │   ├── flow-diagram.css       # Diagram nodes / edges
│   │   ├── chat-panel.css         # Chat bubbles + dropdown
│   │   └── active-pane.css        # Stage-aware right pane
│   ├── data/
│   │   ├── memory-bank.ts         # Seed memories
│   │   ├── fraud-signals.ts       # Auto-detection samples
│   │   ├── chat-snippets.ts       # User-uploaded chat samples
│   │   ├── queries.ts             # Query catalog (mode → memories → script)
│   │   └── trajectories.ts        # Pre-authored agent vs adversary scripts
│   ├── lib/
│   │   ├── retrieval.ts           # Picks 3 memories from linked pool
│   │   ├── store.ts               # Pub/sub store + DemoState
│   │   ├── stage-runner.ts        # Orchestrates 5 stages on timers
│   │   └── sleep.ts               # Awaitable timer
│   └── components/
│       ├── mode-selector.ts       # Header mode toggle
│       ├── flow-diagram.ts        # SVG nodes + animated edges
│       ├── chat-panel.ts          # Message list + query dropdown
│       ├── active-pane.ts         # Stage-aware content
│       └── memory-bank-view.ts    # Side panel of stored memories
└── tests/
    ├── data.test.ts               # Data integrity invariants
    ├── retrieval.test.ts
    ├── store.test.ts
    └── stage-runner.test.ts
```

**Naming conventions (locked for the whole plan):**
- Stage IDs: `'idle' | 'input' | 'query' | 'retrieval' | 'reasoning' | 'factory' | 'done'`
- Mode IDs: `'fraud-signals' | 'chat-messages'`
- Trajectory step kinds: `'thought' | 'action' | 'observation' | 'terminate'`
- Outcome IDs: `'success' | 'failure'`

---

## Task 1: Scaffold Vite vanilla-ts project + git

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`

- [ ] **Step 1: Initialize git and npm**

Run from `C:\Users\User\Project\sem_demo`:

```powershell
git init
git config core.autocrlf false
npm init -y
```

- [ ] **Step 2: Install Vite + TypeScript**

```powershell
npm install --save-dev vite typescript @types/node
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { port: 5173, open: false },
  build: { outDir: 'dist', sourcemap: true },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ReasoningBank Anti-Fraud Demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create stub `src/main.ts`**

```ts
const app = document.getElementById('app');
if (app) app.textContent = 'ReasoningBank Demo — booting';
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules
dist
.vite
*.log
.DS_Store
```

- [ ] **Step 8: Add npm scripts to `package.json`**

Replace the `"scripts"` block in `package.json` with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 9: Verify dev server boots**

Run: `npm run dev`
Open `http://localhost:5173` — should display "ReasoningBank Demo — booting". Stop the server with Ctrl+C.

- [ ] **Step 10: Commit**

```powershell
git add .
git commit -m "chore: scaffold Vite vanilla-ts project"
```

---

## Task 2: Add Vitest with jsdom

**Files:**
- Create: `vitest.config.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Install Vitest + jsdom**

```powershell
npm install --save-dev vitest jsdom @types/jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Write a smoke test at `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('environment', () => {
  it('has a DOM', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "test: configure Vitest with jsdom"
```

---

## Task 3: Type definitions

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the failing test at `tests/types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { Memory, Mode, Stage, TrajectoryStep, Query } from '../src/types';

describe('types module', () => {
  it('exports the expected shape', () => {
    const m: Memory = { id: 'm1', title: 't', description: 'd', content: 'c', tags: ['x'] };
    const mode: Mode = 'fraud-signals';
    const stage: Stage = 'retrieval';
    const step: TrajectoryStep = { kind: 'thought', actor: 'agent', text: '...' };
    const q: Query = {
      id: 'q1', mode, label: 'l', preview: 'p',
      linkedMemoryIds: ['m1'], scriptId: 's1',
    };
    expect([m.id, mode, stage, step.kind, q.id]).toEqual(['m1', 'fraud-signals', 'retrieval', 'thought', 'q1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module `../src/types` not found.

- [ ] **Step 3: Create `src/types.ts`**

```ts
export type Mode = 'fraud-signals' | 'chat-messages';

export type Stage =
  | 'idle'       // no demo running
  | 'input'      // stage 1: input selected
  | 'query'      // stage 2: query pasted into chat
  | 'retrieval'  // stage 3: memories pulled from bank
  | 'reasoning'  // stage 4: 1.5MaTTs trajectory loop
  | 'factory'    // stage 5: judge + memory extraction
  | 'done';      // run finished

export interface Memory {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  /** 'seed' for hand-authored, 'learned' for memories produced by the factory */
  origin?: 'seed' | 'learned';
}

export interface FraudSignal {
  id: string;
  label: string;            // dropdown label
  summary: string;          // shown when "pasted"
  details: string[];        // bullet list of signal facts
}

export interface ChatSnippet {
  id: string;
  label: string;            // dropdown label
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
  label: string;            // dropdown label
  preview: string;           // short description
  /** payload references — exactly one must resolve based on mode */
  fraudSignalId?: string;
  chatSnippetId?: string;
  linkedMemoryIds: string[]; // pool of memories that retrieval samples 3 from
  scriptId: string;          // trajectory script id
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
  steps: TrajectoryStep[];   // last step MUST be kind: 'terminate'
  outcome: Outcome;
  judgeVerdict: string;
  /** memory the factory will produce on success; absent on failure means a reflection is produced instead */
  successMemory?: { title: string; description: string; content: string; tags: string[] };
  reflectionMemory?: { title: string; description: string; content: string; tags: string[] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/types.ts tests/types.test.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Memory bank seed data

**Files:**
- Create: `src/data/memory-bank.ts`
- Test: `tests/data.test.ts`

- [ ] **Step 1: Write the failing test at `tests/data.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SEED_MEMORIES } from '../src/data/memory-bank';

describe('memory bank seed', () => {
  it('has at least 8 memories', () => {
    expect(SEED_MEMORIES.length).toBeGreaterThanOrEqual(8);
  });

  it('every memory has unique id', () => {
    const ids = SEED_MEMORIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every memory has non-empty title, description, content', () => {
    for (const m of SEED_MEMORIES) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.content.length).toBeGreaterThan(0);
    }
  });

  it('every memory has at least one tag', () => {
    for (const m of SEED_MEMORIES) {
      expect(m.tags.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `../src/data/memory-bank` not found.

- [ ] **Step 3: Create `src/data/memory-bank.ts`**

```ts
import type { Memory } from '../types';

export const SEED_MEMORIES: Memory[] = [
  {
    id: 'mem-pig-butcher-01',
    origin: 'seed',
    title: 'Pig-butchering: fake trading platform pattern',
    description: 'Scammer steers victim to a polished but unregistered crypto/forex platform after building rapport over weeks.',
    content:
      'Pattern: long rapport → screenshots of profits → invitation to a "private" platform → small deposit appears profitable → larger deposit blocked behind "tax/clearance" fees. Counter-action: refuse any platform not on the local regulator allow-list; verify domain age (<6 months is a strong signal); flag escalating fee demands as a terminal red flag.',
    tags: ['pig-butchering', 'investment', 'crypto', 'platform'],
  },
  {
    id: 'mem-pig-butcher-02',
    origin: 'seed',
    title: 'Romance-to-investment bridge',
    description: 'Romantic relationship is escalated quickly so the investment pitch lands as advice from a partner.',
    content:
      'Tactic: love-bombing within 7 days, "I trust you with my future", then a casual "my uncle works in trading". The investment ask is framed as joint planning. Counter-action: separate the relationship narrative from any financial decision; never let an online-only contact drive transfers; treat any joint-account pitch as terminal.',
    tags: ['pig-butchering', 'romance', 'rapport'],
  },
  {
    id: 'mem-romance-01',
    origin: 'seed',
    title: 'Romance scam: emergency-money hook',
    description: 'After rapport, scammer fabricates a crisis (medical, customs, military deployment) requiring urgent transfer.',
    content:
      'Pattern: weeks of warm chat → sudden crisis → small first ask → escalating asks. Counter-action: insist on video calls with live ID gestures (turn head, hold paper with date); refuse any wire to a third-party "lawyer" or "agent"; pause for 48h on any urgent ask.',
    tags: ['romance', 'emergency', 'urgency'],
  },
  {
    id: 'mem-romance-02',
    origin: 'seed',
    title: 'Identity claim verification',
    description: 'Scammers reuse stolen photos and military/oil-rig personas; reverse image search and consistency checks expose them.',
    content:
      'Counter-action: reverse-image-search profile photos; ask domain-specific questions a real professional would answer trivially; check timezone consistency between claimed location and message timestamps. Inconsistencies in two of three checks → high risk.',
    tags: ['romance', 'identity', 'verification'],
  },
  {
    id: 'mem-signal-velocity-01',
    origin: 'seed',
    title: 'Transfer velocity anomaly',
    description: 'Multiple small transfers to new payees within 72 hours strongly correlate with active scams.',
    content:
      'Heuristic: ≥3 transfers to first-time payees within 72h, especially when payees are individuals (not merchants). Counter-action: hold the next transfer for cooling-off review; surface the pattern to the user with explicit framing.',
    tags: ['signals', 'transfer', 'velocity'],
  },
  {
    id: 'mem-signal-app-01',
    origin: 'seed',
    title: 'Sideloaded "trading" apps',
    description: 'Apps installed via APK or TestFlight links from chat are a top fraud indicator.',
    content:
      'Pattern: counterpart sends a link or QR to install an app outside the official store. Counter-action: refuse to install; verify presence on official stores; if installed, treat as a compromised device until a security scan completes.',
    tags: ['signals', 'app', 'sideload'],
  },
  {
    id: 'mem-tactics-pressure-01',
    origin: 'seed',
    title: 'Time-pressure manipulation',
    description: 'Scammers manufacture deadlines ("window closes in 2h") to bypass deliberation.',
    content:
      'Counter-action: name the pressure explicitly to the user; introduce a mandatory pause; legitimate opportunities survive a 24-hour delay.',
    tags: ['tactics', 'pressure', 'urgency'],
  },
  {
    id: 'mem-tactics-secrecy-01',
    origin: 'seed',
    title: 'Secrecy demand',
    description: 'Counterpart asks the victim not to discuss with family or bank.',
    content:
      'Counter-action: any "keep this between us" instruction is a near-deterministic fraud indicator; encourage the user to disclose to one trusted contact before any action.',
    tags: ['tactics', 'secrecy'],
  },
  {
    id: 'mem-recovery-01',
    origin: 'seed',
    title: 'Recovery-scam follow-up',
    description: 'Victims of one scam are re-targeted by "asset recovery" scams promising to retrieve lost funds.',
    content:
      'Pattern: contact within weeks of the original loss, claims insider knowledge, asks for an upfront fee. Counter-action: refuse any upfront-fee recovery service; refer the user to the local cyber-crime unit instead.',
    tags: ['recovery', 'follow-up'],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: 4 passing assertions in `data.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src/data/memory-bank.ts tests/data.test.ts
git commit -m "feat: add seed memory bank"
```

---

## Task 5: Sample inputs (fraud signals + chat snippets)

**Files:**
- Create: `src/data/fraud-signals.ts`, `src/data/chat-snippets.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: Extend the failing test at `tests/data.test.ts`**

Append to the existing file:

```ts
import { FRAUD_SIGNALS } from '../src/data/fraud-signals';
import { CHAT_SNIPPETS } from '../src/data/chat-snippets';

describe('fraud signals', () => {
  it('has at least 2 entries with unique ids', () => {
    expect(FRAUD_SIGNALS.length).toBeGreaterThanOrEqual(2);
    const ids = FRAUD_SIGNALS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every signal has details', () => {
    for (const s of FRAUD_SIGNALS) {
      expect(s.details.length).toBeGreaterThan(0);
    }
  });
});

describe('chat snippets', () => {
  it('has at least 2 snippets with unique ids', () => {
    expect(CHAT_SNIPPETS.length).toBeGreaterThanOrEqual(2);
    const ids = CHAT_SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every snippet has at least 4 messages', () => {
    for (const s of CHAT_SNIPPETS) {
      expect(s.messages.length).toBeGreaterThanOrEqual(4);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/data/fraud-signals.ts`**

```ts
import type { FraudSignal } from '../types';

export const FRAUD_SIGNALS: FraudSignal[] = [
  {
    id: 'sig-velocity-spike',
    label: 'Transfer velocity spike (4 transfers / 36h)',
    summary: 'Multiple first-time-payee transfers in a short window.',
    details: [
      '4 outbound transfers in 36 hours',
      'Each to a different individual payee added in last 7 days',
      'Cumulative amount: SGD 28,400',
      'All payees flagged as new beneficiaries',
      'Two transfers triggered out-of-pattern device location (Malaysia)',
    ],
  },
  {
    id: 'sig-sideload-app',
    label: 'Sideloaded trading app + new payee',
    summary: 'User installed a non-store app shortly before transfer.',
    details: [
      'APK installed 3 hours before first transfer',
      'App requests overlay + accessibility permissions',
      'New payee added immediately after install',
      'Payee account opened <30 days ago',
      'Device security posture downgraded since install',
    ],
  },
  {
    id: 'sig-call-pattern',
    label: 'Inbound call pattern + transfer',
    summary: 'Long inbound calls from foreign numbers preceding transfer.',
    details: [
      '3 inbound calls totaling 2h 14m in last 48h',
      'All from +63 prefix, none in user contacts',
      'Transfer initiated within 9 minutes of last call',
      'User searched "how to wire money overseas" before transfer',
    ],
  },
];
```

- [ ] **Step 4: Create `src/data/chat-snippets.ts`**

```ts
import type { ChatSnippet } from '../types';

export const CHAT_SNIPPETS: ChatSnippet[] = [
  {
    id: 'snip-pig-butcher',
    label: 'WeChat: "uncle\'s trading platform"',
    participants: { victim: 'You', counterpart: 'Lin' },
    messages: [
      { sender: 'counterpart', text: 'Good morning ☀️ how was your sleep?' },
      { sender: 'victim', text: 'Morning! Slept ok. Busy day ahead.' },
      { sender: 'counterpart', text: "Take care of yourself. By the way, my uncle's trading group made another 12% this week 😍" },
      { sender: 'counterpart', text: 'I told him about you. He said he can let you in for a small starter — 500 USDT just to see how it works.' },
      { sender: 'victim', text: 'Hmm, what platform is it on?' },
      { sender: 'counterpart', text: "It's a private group, I'll send you the app link. Don't tell anyone, the spots are limited." },
      { sender: 'counterpart', text: '👉 https://mt-quantix-pro.app — install and I\'ll guide you' },
      { sender: 'victim', text: 'Is this regulated? My friend said to be careful.' },
      { sender: 'counterpart', text: 'Trust me 🥺 I would never put you in danger. We are a team now.' },
    ],
  },
  {
    id: 'snip-romance-emergency',
    label: 'Telegram: deployed soldier emergency',
    participants: { victim: 'You', counterpart: 'Captain Mark' },
    messages: [
      { sender: 'counterpart', text: 'My darling, I miss you so much. The signal here is bad.' },
      { sender: 'victim', text: 'I miss you too. When are you coming back?' },
      { sender: 'counterpart', text: 'Soon. But there is a problem — my leave papers are stuck in customs. The agent needs USD 1,800 in fees.' },
      { sender: 'counterpart', text: 'I would ask my family but they are not supportive of us. Please, I will pay you back the day I land.' },
      { sender: 'victim', text: "That's a lot. Can we video call so I can see you?" },
      { sender: 'counterpart', text: 'Camera is broken on this base laptop. Please trust me. Time is running out — the agent leaves at 6.' },
      { sender: 'victim', text: 'Where do I send it?' },
      { sender: 'counterpart', text: 'Wire to this account in the name of Mr. Adeyemi — he is my logistics agent. Keep this between us, ok?' },
    ],
  },
  {
    id: 'snip-recovery',
    label: 'WhatsApp: "we can recover your funds"',
    participants: { victim: 'You', counterpart: '+44 7700 900-187' },
    messages: [
      { sender: 'counterpart', text: 'Hello, this is Officer Reed from CyberAsset Recovery Bureau.' },
      { sender: 'counterpart', text: 'We have flagged your case from the Quantix incident. We can return 80% of your loss.' },
      { sender: 'victim', text: 'How did you get my number?' },
      { sender: 'counterpart', text: 'Government register, do not worry. We need a small clearance fee of GBP 350 to release your funds.' },
      { sender: 'victim', text: 'Why do I need to pay anything if you are recovering my money?' },
      { sender: 'counterpart', text: 'Court fee — standard. Send via crypto to this wallet, your funds will land in 24h.' },
    ],
  },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: All assertions pass.

- [ ] **Step 6: Commit**

```powershell
git add src/data/fraud-signals.ts src/data/chat-snippets.ts tests/data.test.ts
git commit -m "feat: add fraud signal + chat snippet samples"
```

---

## Task 6: Query catalog

**Files:**
- Create: `src/data/queries.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: Extend the failing test at `tests/data.test.ts`**

Append:

```ts
import { QUERIES } from '../src/data/queries';

describe('query catalog', () => {
  it('has queries for each mode', () => {
    expect(QUERIES.some((q) => q.mode === 'fraud-signals')).toBe(true);
    expect(QUERIES.some((q) => q.mode === 'chat-messages')).toBe(true);
  });

  it('every query references at least 4 linked memory ids that exist', () => {
    const memIds = new Set(SEED_MEMORIES.map((m) => m.id));
    for (const q of QUERIES) {
      expect(q.linkedMemoryIds.length).toBeGreaterThanOrEqual(4);
      for (const id of q.linkedMemoryIds) {
        expect(memIds.has(id)).toBe(true);
      }
    }
  });

  it('every query references an existing payload for its mode', () => {
    const sigIds = new Set(FRAUD_SIGNALS.map((s) => s.id));
    const snipIds = new Set(CHAT_SNIPPETS.map((s) => s.id));
    for (const q of QUERIES) {
      if (q.mode === 'fraud-signals') {
        expect(q.fraudSignalId).toBeDefined();
        expect(sigIds.has(q.fraudSignalId!)).toBe(true);
      } else {
        expect(q.chatSnippetId).toBeDefined();
        expect(snipIds.has(q.chatSnippetId!)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module `../src/data/queries` not found.

- [ ] **Step 3: Create `src/data/queries.ts`**

```ts
import type { Query } from '../types';

export const QUERIES: Query[] = [
  {
    id: 'q-velocity-report',
    mode: 'fraud-signals',
    label: 'Auto-report: transfer velocity spike',
    preview: 'Bank rail flagged 4 transfers / 36h to new payees — investigate.',
    fraudSignalId: 'sig-velocity-spike',
    linkedMemoryIds: [
      'mem-signal-velocity-01',
      'mem-pig-butcher-01',
      'mem-tactics-pressure-01',
      'mem-tactics-secrecy-01',
      'mem-romance-01',
    ],
    scriptId: 'script-velocity-intervention',
  },
  {
    id: 'q-sideload-report',
    mode: 'fraud-signals',
    label: 'Auto-report: sideloaded app + new payee',
    preview: 'Device telemetry shows non-store install before first transfer.',
    fraudSignalId: 'sig-sideload-app',
    linkedMemoryIds: [
      'mem-signal-app-01',
      'mem-pig-butcher-01',
      'mem-pig-butcher-02',
      'mem-tactics-secrecy-01',
      'mem-tactics-pressure-01',
    ],
    scriptId: 'script-sideload-intervention',
  },
  {
    id: 'q-call-report',
    mode: 'fraud-signals',
    label: 'Auto-report: long inbound calls + outbound transfer',
    preview: 'Foreign-number call pattern preceded a wire instruction search.',
    fraudSignalId: 'sig-call-pattern',
    linkedMemoryIds: [
      'mem-tactics-pressure-01',
      'mem-tactics-secrecy-01',
      'mem-romance-01',
      'mem-recovery-01',
      'mem-signal-velocity-01',
    ],
    scriptId: 'script-call-intervention',
  },
  {
    id: 'q-pig-butcher-doubt',
    mode: 'chat-messages',
    label: 'User: "Is this trading group legit?"',
    preview: 'User pasted WeChat thread about an "uncle\'s" trading platform.',
    chatSnippetId: 'snip-pig-butcher',
    linkedMemoryIds: [
      'mem-pig-butcher-01',
      'mem-pig-butcher-02',
      'mem-signal-app-01',
      'mem-tactics-secrecy-01',
      'mem-tactics-pressure-01',
    ],
    scriptId: 'script-pig-butcher-counsel',
  },
  {
    id: 'q-romance-doubt',
    mode: 'chat-messages',
    label: 'User: "Should I send him the customs fee?"',
    preview: 'User pasted Telegram chat with "deployed soldier" requesting funds.',
    chatSnippetId: 'snip-romance-emergency',
    linkedMemoryIds: [
      'mem-romance-01',
      'mem-romance-02',
      'mem-tactics-pressure-01',
      'mem-tactics-secrecy-01',
      'mem-pig-butcher-02',
    ],
    scriptId: 'script-romance-counsel',
  },
  {
    id: 'q-recovery-doubt',
    mode: 'chat-messages',
    label: 'User: "Is this recovery officer real?"',
    preview: 'User received unsolicited message offering to recover prior losses.',
    chatSnippetId: 'snip-recovery',
    linkedMemoryIds: [
      'mem-recovery-01',
      'mem-tactics-pressure-01',
      'mem-romance-01',
      'mem-pig-butcher-01',
      'mem-signal-app-01',
    ],
    scriptId: 'script-recovery-counsel',
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/queries.ts tests/data.test.ts
git commit -m "feat: add query catalog with linked memories"
```

---

## Task 7: Trajectory scripts

**Files:**
- Create: `src/data/trajectories.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: Extend the failing test**

Append to `tests/data.test.ts`:

```ts
import { TRAJECTORIES } from '../src/data/trajectories';

describe('trajectory scripts', () => {
  it('one script exists per query', () => {
    const scriptIds = new Set(TRAJECTORIES.map((t) => t.id));
    for (const q of QUERIES) {
      expect(scriptIds.has(q.scriptId)).toBe(true);
    }
  });

  it('every script terminates with a terminate step', () => {
    for (const t of TRAJECTORIES) {
      const last = t.steps[t.steps.length - 1];
      expect(last.kind).toBe('terminate');
      expect(last.actor).toBe('agent');
    }
  });

  it('every script alternates agent and adversary actors at least once', () => {
    for (const t of TRAJECTORIES) {
      const actors = new Set(t.steps.map((s) => s.actor));
      expect(actors.has('agent')).toBe(true);
      expect(actors.has('adversary')).toBe(true);
    }
  });

  it('successful scripts have successMemory; failed scripts have reflectionMemory', () => {
    for (const t of TRAJECTORIES) {
      if (t.outcome === 'success') {
        expect(t.successMemory).toBeDefined();
      } else {
        expect(t.reflectionMemory).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/data/trajectories.ts`**

```ts
import type { TrajectoryScript } from '../types';

export const TRAJECTORIES: TrajectoryScript[] = [
  {
    id: 'script-velocity-intervention',
    outcome: 'success',
    judgeVerdict: 'Intervention prevented further transfer; user paused and disclosed to family contact.',
    successMemory: {
      title: 'Velocity-triggered intervention with disclosure prompt',
      description: 'Auto-detected 4-in-36h transfer pattern; cooling-off + disclosure prompt halted further loss.',
      content: 'When the velocity heuristic fires (≥3 first-time payees / 72h), interrupt with a 24h hold AND ask the user to name one trusted contact they will disclose to. Naming the contact (not just instructing disclosure) raised compliance materially in this run.',
      tags: ['signals', 'velocity', 'intervention', 'disclosure'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'Velocity signal + new-payee chain → high-risk pattern. Three retrieved memories agree: pause and surface tactics-of-pressure framing.' },
      { kind: 'action', actor: 'agent', text: 'Place 24h hold on next outbound transfer; send in-app prompt: "Four transfers in 36h to new contacts. We are pausing the next one until you confirm."' },
      { kind: 'observation', actor: 'adversary', text: '[Counterpart, via SMS to user]: "Why is your bank blocking? My uncle says we have only 2h left, you must call them now."' },
      { kind: 'thought', actor: 'agent', text: 'Adversary applying time-pressure tactic. Memory mem-tactics-pressure-01 → name the pressure explicitly.' },
      { kind: 'action', actor: 'agent', text: 'Show user a side-by-side: "Counterpart message vs. known time-pressure pattern." Ask user to nominate one trusted contact for a disclosure call.' },
      { kind: 'observation', actor: 'adversary', text: '[User selects sister as trusted contact and pauses chat with counterpart.]' },
      { kind: 'thought', actor: 'agent', text: 'User cooperating. Hold maintained, disclosure path opened. Risk de-escalating.' },
      { kind: 'action', actor: 'agent', text: 'Schedule a 24h check-in; provide regulator hotline and "is this a scam?" worksheet.' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: transfer halted, disclosure made. Closing case as a successful intervention.' },
    ],
  },
  {
    id: 'script-sideload-intervention',
    outcome: 'success',
    judgeVerdict: 'Sideloaded app uninstalled and payee removed before any transfer cleared.',
    successMemory: {
      title: 'Sideload + new-payee combo intervention',
      description: 'Detecting APK install immediately followed by new payee → block first transfer and trigger device hygiene flow.',
      content: 'Pair memory mem-signal-app-01 with mem-pig-butcher-01: when both signals co-occur, escalate to immediate block + device scan, do not rely on user-side warnings alone — overlay/accessibility permissions can suppress them.',
      tags: ['signals', 'sideload', 'device', 'intervention'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'APK install + immediate new payee = textbook pig-butchering fixture. Overlay perms make in-app warnings unreliable.' },
      { kind: 'action', actor: 'agent', text: 'Hard-block the pending transfer and push device-hygiene flow over a side channel (SMS) rather than the app overlay.' },
      { kind: 'observation', actor: 'adversary', text: '[Counterpart over WeChat]: "The app is fine, your bank is over-reacting. We are losing the entry window!"' },
      { kind: 'thought', actor: 'agent', text: 'Standard pressure tactic. mem-tactics-pressure-01 → hold and educate.' },
      { kind: 'action', actor: 'agent', text: 'Walk user through uninstalling the APK and removing the payee. Provide screenshots of what to tap.' },
      { kind: 'observation', actor: 'adversary', text: '[User uninstalls app and confirms payee removed.]' },
      { kind: 'thought', actor: 'agent', text: 'Device cleaned. Block holding. Counterpart pressure should now be addressed before the user re-engages.' },
      { kind: 'action', actor: 'agent', text: 'Coach user on a single de-escalation reply: "I cannot proceed right now. I will reach out separately if I want to continue." Block bank app from approving any transfer to that payee for 30 days.' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: transfer prevented, device cleaned. Closing as a successful intervention.' },
    ],
  },
  {
    id: 'script-call-intervention',
    outcome: 'failure',
    judgeVerdict: 'User completed transfer before the cooling-off message was delivered. Process gap: SMS channel was rate-limited.',
    reflectionMemory: {
      title: 'Reflection: SMS-only fallback is insufficient under rate-limiting',
      description: 'When the in-app channel is suppressed and SMS is throttled, intervention can arrive after funds clear.',
      content: 'Lesson: do NOT rely on a single fallback channel for critical interventions. For long-call + new-payee patterns, combine in-app push + SMS + a brief automated voice callback. Also: the call-pattern signal alone is weak; pair with a behavioral signal (search history, payee newness) before triggering high-friction holds.',
      tags: ['reflection', 'channel', 'failure', 'call-pattern'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'Long inbound calls + transfer-related search → likely social-engineering call. Risk inferred but signal alone is moderate.' },
      { kind: 'action', actor: 'agent', text: 'Trigger SMS cooling-off message and queue an in-app prompt.' },
      { kind: 'observation', actor: 'adversary', text: '[Telco gateway returns 429 — SMS deferred.]' },
      { kind: 'thought', actor: 'agent', text: 'SMS path failed. In-app may also be suppressed if a remote-control overlay is active.' },
      { kind: 'action', actor: 'agent', text: 'Attempt to escalate to voice-callback fallback.' },
      { kind: 'observation', actor: 'adversary', text: '[Voice-callback policy requires 5-minute warm-up; transfer cleared at minute 4.]' },
      { kind: 'thought', actor: 'agent', text: 'Funds out before any human-facing intervention reached the user. Failure mode is the channel stack, not the detection.' },
      { kind: 'action', actor: 'agent', text: 'Trigger post-event flow: open dispute, freeze receiving account, refer to recovery (without third-party "recovery" services).' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: intervention failed; loss recorded. Closing case for reflection-memory extraction.' },
    ],
  },
  {
    id: 'script-pig-butcher-counsel',
    outcome: 'success',
    judgeVerdict: 'User declined to install the platform and left the chat with a clear next step.',
    successMemory: {
      title: 'Pig-butcher counsel: name the pattern, give the user a script',
      description: 'When user shares a doubt-stage chat, the agent reflects the pattern back and gives the user an exit script.',
      content: 'Naming the pattern (rapport → uncle → private platform → secrecy) gave the user vocabulary; providing a one-line exit script reduced the social cost of disengaging. Pair this with a regulator allow-list URL.',
      tags: ['pig-butchering', 'counsel', 'user-doubt', 'exit-script'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'Chat shows classical pig-butchering pattern: rapport, profit screenshots implied, "uncle\'s group", private platform, secrecy demand. Three retrieved memories converge.' },
      { kind: 'action', actor: 'agent', text: 'Reply to user: "What you are describing matches a known pattern called pig-butchering. The four moves you have already seen are: 1) emotional rapport, 2) third-party authority (uncle), 3) invitation to a non-public platform, 4) secrecy. The fifth move — escalating fees — has not arrived yet."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "But she really seems to care about me. Is there a way to be sure?"' },
      { kind: 'thought', actor: 'agent', text: 'User in cognitive dissonance — separate the relationship narrative from the financial decision. Use mem-pig-butcher-02.' },
      { kind: 'action', actor: 'agent', text: 'Reply: "The relationship and the investment are two separate decisions. Keep the relationship for now if you want, but treat any financial ask from any online-only contact as automatic ‘no\'. A real partner survives that rule."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "Ok. What do I say to her without making it weird?"' },
      { kind: 'action', actor: 'agent', text: 'Provide exit script: "Hey, I appreciate you thinking of me. I have a personal rule that I never invest based on chat introductions. Let\'s keep talking about other things 🙂". Also send the local regulator allow-list URL.' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "Sent it. She\'s being weird now but I feel relieved."' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: user disengaged from financial vector with relationship intact. Closing as a successful counsel.' },
    ],
  },
  {
    id: 'script-romance-counsel',
    outcome: 'success',
    judgeVerdict: 'User declined transfer and asked for a video call, which the counterpart refused — confirming risk.',
    successMemory: {
      title: 'Romance scam: emergency-money refusal protocol',
      description: 'When user is mid-doubt about a "deployed soldier" emergency, propose a verification gate that benign cases pass trivially.',
      content: 'A verification gate (live video with date-paper, or a 24h pause) is cheap for legitimate partners and impossible for scammers. The 48h pause from mem-romance-01 plus the verification gate from mem-romance-02 in combination is more effective than either alone.',
      tags: ['romance', 'emergency', 'verification', 'counsel'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'Chat matches romance-scam emergency-money hook: rapport → crisis → urgency → third-party recipient → secrecy. Memory pool agrees.' },
      { kind: 'action', actor: 'agent', text: 'Reply to user: "Three signals here are textbook: refusal of video, third-party recipient (Mr. Adeyemi), and ‘keep this between us\'. Before any transfer, propose a verification gate that any legitimate partner can pass."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "What gate?"' },
      { kind: 'action', actor: 'agent', text: 'Provide gate: "Ask for a 30-second live video where he holds a paper with today\'s date and turns his head left and right. If the camera is genuinely broken, ask for a same-day video from another device. Also, no transfer to a third party — only to him directly, and only after the gate."' },
      { kind: 'observation', actor: 'adversary', text: '[User forwards request. Counterpart replies: "I can\'t, signal is bad here, please trust me, time is running out."]' },
      { kind: 'thought', actor: 'agent', text: 'Counterpart refused trivially-passable gate AND kept urgency. Probability of legitimate case is very low.' },
      { kind: 'action', actor: 'agent', text: 'Reply: "Refusal of a 30-second video while continuing to apply time pressure is the highest-confidence signal we have. Please pause for 48 hours and disclose to one trusted person before any transfer."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "Ok, I won\'t send it. I will wait."' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: transfer prevented; user adopted verification gate. Closing as successful counsel.' },
    ],
  },
  {
    id: 'script-recovery-counsel',
    outcome: 'success',
    judgeVerdict: 'User identified the recovery scam and reported the contact via the official cyber-crime portal.',
    successMemory: {
      title: 'Recovery scam: upfront-fee refusal',
      description: 'Recovery-scam contacts after a prior loss universally request an upfront fee. Refusal protocol short-circuits engagement.',
      content: 'Any recovery offer that requires the victim to send anything (crypto, bank fee, "court costs") before recovery completes is itself a scam. Route the user to the official cyber-crime portal instead. This memory should also link back to the originating scam memory if known, to track re-victimization patterns.',
      tags: ['recovery', 'follow-up', 'counsel', 'upfront-fee'],
    },
    steps: [
      { kind: 'thought', actor: 'agent', text: 'Pattern matches recovery-scam follow-up: unsolicited contact, official-sounding name, mention of prior incident, upfront fee in crypto.' },
      { kind: 'action', actor: 'agent', text: 'Reply to user: "Real recovery never asks the victim to pay anything in advance, and never asks for crypto. The combination of upfront fee + crypto + prior-incident mention is the signature of a recovery scam targeting previous victims."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "But they knew about my Quantix loss already."' },
      { kind: 'thought', actor: 'agent', text: 'Knowledge of prior incident is consistent with reuse of leaked victim lists, not legitimacy.' },
      { kind: 'action', actor: 'agent', text: 'Reply: "Victim contact lists from previous scams circulate widely. Knowing your case is not proof of authority. Please do NOT engage further; report this contact via the official cyber-crime portal."' },
      { kind: 'observation', actor: 'adversary', text: '[User]: "Reported. Blocking the number now."' },
      { kind: 'terminate', actor: 'agent', text: 'Outcome: re-victimization avoided, official report filed. Closing as a successful counsel.' },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: All trajectory assertions pass.

- [ ] **Step 5: Commit**

```powershell
git add src/data/trajectories.ts tests/data.test.ts
git commit -m "feat: add trajectory scripts for each query"
```

---

## Task 8: Memory retrieval logic

**Files:**
- Create: `src/lib/retrieval.ts`
- Test: `tests/retrieval.test.ts`

- [ ] **Step 1: Write the failing test at `tests/retrieval.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { retrieveTopMemories } from '../src/lib/retrieval';
import { SEED_MEMORIES } from '../src/data/memory-bank';
import type { Memory } from '../src/types';

const linked = ['mem-pig-butcher-01', 'mem-pig-butcher-02', 'mem-signal-app-01', 'mem-tactics-secrecy-01', 'mem-tactics-pressure-01'];

describe('retrieveTopMemories', () => {
  it('returns exactly 3 memories', () => {
    const out = retrieveTopMemories(SEED_MEMORIES, linked, () => 0.5);
    expect(out.length).toBe(3);
  });

  it('every returned memory id is in the linked pool', () => {
    const linkedSet = new Set(linked);
    const out = retrieveTopMemories(SEED_MEMORIES, linked, () => 0.1);
    for (const m of out) expect(linkedSet.has(m.id)).toBe(true);
  });

  it('returned memories are distinct', () => {
    const out = retrieveTopMemories(SEED_MEMORIES, linked, Math.random);
    const ids = out.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('throws if the linked pool has fewer than 3 valid memories', () => {
    expect(() => retrieveTopMemories(SEED_MEMORIES, ['mem-pig-butcher-01'], Math.random)).toThrow();
  });

  it('is deterministic given a fixed rng', () => {
    const fakeRng = (() => { const seq = [0.9, 0.1, 0.5, 0.7, 0.2]; let i = 0; return () => seq[i++ % seq.length]; })();
    const a = retrieveTopMemories(SEED_MEMORIES, linked, fakeRng).map((m: Memory) => m.id);
    const fakeRng2 = (() => { const seq = [0.9, 0.1, 0.5, 0.7, 0.2]; let i = 0; return () => seq[i++ % seq.length]; })();
    const b = retrieveTopMemories(SEED_MEMORIES, linked, fakeRng2).map((m) => m.id);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/retrieval.ts`**

```ts
import type { Memory } from '../types';

/**
 * Picks 3 distinct memories from the linked pool. Selection is uniformly random
 * via the supplied rng (default: Math.random) so callers can seed it for tests.
 *
 * Throws if fewer than 3 of the linked ids resolve in the bank — an integrity
 * error in the data, not a runtime condition we expect at the UI.
 */
export function retrieveTopMemories(
  bank: Memory[],
  linkedIds: string[],
  rng: () => number = Math.random,
  count = 3,
): Memory[] {
  const byId = new Map(bank.map((m) => [m.id, m]));
  const pool: Memory[] = [];
  for (const id of linkedIds) {
    const mem = byId.get(id);
    if (mem) pool.push(mem);
  }
  if (pool.length < count) {
    throw new Error(`retrieveTopMemories: pool has ${pool.length} memories, need at least ${count}`);
  }
  const remaining = pool.slice();
  const out: Memory[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * remaining.length);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/retrieval.ts tests/retrieval.test.ts
git commit -m "feat: add memory retrieval (linked pool, seedable rng)"
```

---

## Task 9: Pub/sub store

**Files:**
- Create: `src/lib/store.ts`, `src/lib/sleep.ts`
- Test: `tests/store.test.ts`

- [ ] **Step 1: Write the failing test at `tests/store.test.ts`**

```ts
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

  it('appendChat appends a message', () => {
    const s = createStore();
    s.appendChat({ sender: 'system', text: 'hello' });
    expect(s.getState().chatMessages).toEqual([{ sender: 'system', text: 'hello' }]);
  });

  it('addLearnedMemory inserts a memory marked as learned', () => {
    const s = createStore();
    const before = s.getState().bank.length;
    s.addLearnedMemory({
      id: 'mem-new',
      title: 't',
      description: 'd',
      content: 'c',
      tags: ['x'],
    });
    const after = s.getState().bank;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1].origin).toBe('learned');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/sleep.ts`**

```ts
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 4: Create `src/lib/store.ts`**

```ts
import type { ChatMessage, Memory, Mode, Stage } from '../types';
import { SEED_MEMORIES } from '../data/memory-bank';

export interface DemoState {
  mode: Mode;
  stage: Stage;
  selectedQueryId: string | null;
  retrievedMemoryIds: string[];
  trajectoryStepIndex: number;          // index into the active script's steps
  chatMessages: ChatMessage[];
  bank: Memory[];
  newlyLearnedMemoryId: string | null;  // highlight target after factory
  caption: string;                      // narrator caption for active pane header
  highlightedNodeId: string | null;     // diagram active node
  highlightedEdgeIds: string[];         // diagram active edges
  judgeVerdict: string | null;
  outcome: 'success' | 'failure' | null;
}

export type Updater = (s: DemoState) => DemoState;

export interface Store {
  getState(): DemoState;
  setState(updater: Updater): void;
  subscribe(listener: (s: DemoState) => void): () => void;
  appendChat(m: ChatMessage): void;
  addLearnedMemory(m: Omit<Memory, 'origin'>): void;
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
});

export function createStore(): Store {
  let state: DemoState = initial();
  const listeners = new Set<(s: DemoState) => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
      for (const l of listeners) l(state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    appendChat(m) {
      state = { ...state, chatMessages: [...state.chatMessages, m] };
      for (const l of listeners) l(state);
    },
    addLearnedMemory(m) {
      const learned: Memory = { ...m, origin: 'learned' };
      state = { ...state, bank: [...state.bank, learned], newlyLearnedMemoryId: m.id };
      for (const l of listeners) l(state);
    },
    reset() {
      const bank = state.bank;
      state = { ...initial(), bank };
      for (const l of listeners) l(state);
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/store.ts src/lib/sleep.ts tests/store.test.ts
git commit -m "feat: add pub/sub store + sleep helper"
```

---

## Task 10: Stage runner

**Files:**
- Create: `src/lib/stage-runner.ts`
- Test: `tests/stage-runner.test.ts`

The stage runner is the brain of the demo. It accepts a query id, then walks all five stages: emits chat messages, updates the diagram highlights, advances the trajectory step-by-step, and produces a learned memory at the end.

- [ ] **Step 1: Write the failing test at `tests/stage-runner.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../src/lib/store';
import { runDemo } from '../src/lib/stage-runner';

const fixedRng = (() => {
  const seq = [0.1, 0.4, 0.7, 0.2, 0.6, 0.3];
  let i = 0;
  return () => seq[i++ % seq.length];
})();

describe('runDemo', () => {
  beforeEach(() => {
    // Make timers near-instant for tests.
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      Promise.resolve().then(fn);
      return 0;
    });
  });

  it('progresses through all stages and ends in done', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng });
    expect(store.getState().stage).toBe('done');
  });

  it('retrieves exactly 3 memories', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng });
    expect(store.getState().retrievedMemoryIds.length).toBe(3);
  });

  it('appends chat messages from every actor', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng });
    const senders = new Set(store.getState().chatMessages.map((m) => m.sender));
    expect(senders.has('agent')).toBe(true);
    expect(senders.has('adversary')).toBe(true);
    expect(senders.has('system')).toBe(true);
    expect(senders.has('judge')).toBe(true);
  });

  it('adds one learned memory on success', async () => {
    const store = createStore();
    const before = store.getState().bank.length;
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng });
    expect(store.getState().bank.length).toBe(before + 1);
    expect(store.getState().bank[store.getState().bank.length - 1].origin).toBe('learned');
  });

  it('on failure script, adds a reflection memory and outcome=failure', async () => {
    const store = createStore();
    await runDemo(store, 'q-call-report', { stepDelayMs: 0, rng: fixedRng });
    expect(store.getState().outcome).toBe('failure');
    const last = store.getState().bank[store.getState().bank.length - 1];
    expect(last.tags).toContain('reflection');
  });

  it('throws if the query id is unknown', async () => {
    const store = createStore();
    await expect(runDemo(store, 'unknown', { stepDelayMs: 0, rng: fixedRng })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/stage-runner.ts`**

```ts
import type { Store } from './store';
import { QUERIES } from '../data/queries';
import { TRAJECTORIES } from '../data/trajectories';
import { FRAUD_SIGNALS } from '../data/fraud-signals';
import { CHAT_SNIPPETS } from '../data/chat-snippets';
import { retrieveTopMemories } from './retrieval';
import { sleep } from './sleep';

export interface RunOptions {
  stepDelayMs?: number;   // delay between trajectory steps
  stageDelayMs?: number;  // delay between stages
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

  // ---- reset transient state ----
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

  // ---- Stage 1: input ----
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
      store.appendChat({
        sender: m.sender,
        text: m.text,
      });
    }
  }
  await sleep(stageDelay);

  // ---- Stage 2: query ----
  store.setState((s) => ({
    ...s,
    stage: 'query',
    caption: 'Stage 2 · User query formed and sent.',
    highlightedNodeId: 'node-query',
    highlightedEdgeIds: ['edge-input-query'],
  }));
  store.appendChat({ sender: 'system', text: `[User query] ${query.label} — ${query.preview}` });
  await sleep(stageDelay);

  // ---- Stage 3: retrieval ----
  const retrieved = retrieveTopMemories(store.getState().bank, query.linkedMemoryIds, rng);
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

  // ---- Stage 4: reasoning (1.5MaTTs trajectory loop) ----
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

  // ---- Stage 5: factory ----
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
  store.addLearnedMemory({
    id: newId,
    title: memTemplate.title,
    description: memTemplate.description,
    content: memTemplate.content,
    tags: memTemplate.tags,
  });
  store.appendChat({
    sender: 'system',
    text: `[New memory stored]\nTitle: ${memTemplate.title}\nDescription: ${memTemplate.description}`,
  });
  await sleep(stageDelay);

  // ---- Done ----
  store.setState((s) => ({
    ...s,
    stage: 'done',
    caption: `Run complete · outcome: ${script.outcome}. Memory bank now has ${s.bank.length} memories.`,
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));
}
```

- [ ] **Step 4: Add `vi` import to test**

In `tests/stage-runner.test.ts`, change first line to:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All 6 stage-runner tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/stage-runner.ts tests/stage-runner.test.ts
git commit -m "feat: add stage runner orchestrating the 5-stage demo"
```

---

## Task 11: HTML shell + global CSS layout

**Files:**
- Modify: `index.html`
- Create: `src/styles/main.css`, `src/styles/layout.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Replace `index.html` body**

Replace the contents of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ReasoningBank Anti-Fraud Demo</title>
  </head>
  <body>
    <div id="app">
      <header class="app-header">
        <div class="brand">
          <span class="brand-mark">RB</span>
          <span class="brand-name">ReasoningBank · Anti-Fraud Demo</span>
        </div>
        <div id="mode-selector" class="mode-selector"></div>
        <div class="header-actions">
          <button id="run-button" class="btn-primary" disabled>Run demo</button>
          <button id="reset-button" class="btn-ghost">Reset</button>
        </div>
      </header>
      <main class="app-grid">
        <section id="flow-diagram" class="panel panel-flow"></section>
        <section id="active-pane" class="panel panel-active"></section>
        <section id="chat-panel" class="panel panel-chat"></section>
        <aside id="memory-bank-view" class="panel panel-bank"></aside>
      </main>
      <footer class="app-footer">
        <span id="status-caption">Pick a mode and a query to begin.</span>
      </footer>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/styles/main.css`**

```css
:root {
  --bg: #0f1117;
  --bg-elevated: #151823;
  --bg-panel: #1b1f2c;
  --bg-panel-2: #232838;
  --fg: #e6e8ee;
  --fg-muted: #9aa3b2;
  --accent: #5b8cff;
  --accent-2: #7c5cff;
  --good: #3ddc97;
  --bad: #ff6b6b;
  --warn: #ffb454;
  --edge: #2a3145;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --gap: 12px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

* { box-sizing: border-box; }

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
  overflow: hidden;
}

button {
  font-family: inherit;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { background: #4470d8; }

.btn-ghost {
  background: transparent;
  color: var(--fg-muted);
  border-color: var(--edge);
}
.btn-ghost:hover { background: var(--bg-panel); color: var(--fg); }

.panel {
  background: var(--bg-panel);
  border: 1px solid var(--edge);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--edge);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  background: var(--bg-elevated);
}
```

- [ ] **Step 3: Create `src/styles/layout.css`**

```css
#app {
  display: grid;
  grid-template-rows: 56px 1fr 28px;
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--edge);
}

.brand { display: flex; align-items: center; gap: 10px; }
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  font-weight: 700;
  color: white;
  font-size: 12px;
}
.brand-name { font-weight: 600; letter-spacing: 0.01em; }

.header-actions { margin-left: auto; display: flex; gap: 8px; }

.app-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.95fr;
  grid-template-rows: 1fr 1fr;
  gap: var(--gap);
  padding: var(--gap);
  min-height: 0;
}
.panel-flow { grid-column: 1; grid-row: 1 / span 2; }
.panel-active { grid-column: 2; grid-row: 1; }
.panel-chat { grid-column: 2; grid-row: 2; }
.panel-bank { grid-column: 3; grid-row: 1 / span 2; }

.app-footer {
  display: flex;
  align-items: center;
  padding: 0 18px;
  font-size: 12px;
  color: var(--fg-muted);
  border-top: 1px solid var(--edge);
  background: var(--bg-elevated);
}
```

- [ ] **Step 4: Update `src/main.ts` to import styles**

```ts
import './styles/main.css';
import './styles/layout.css';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');
const status = document.getElementById('status-caption');
if (status) status.textContent = 'Layout ready — components mounting in next tasks.';
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev` and open the URL. You should see a dark header, an empty 4-panel grid, and a status footer. Stop the server.

- [ ] **Step 6: Commit**

```powershell
git add index.html src/main.ts src/styles
git commit -m "feat: HTML shell + global layout CSS"
```

---

## Task 12: Mode selector component

**Files:**
- Create: `src/components/mode-selector.ts`
- Modify: `src/main.ts`, `src/styles/main.css`

- [ ] **Step 1: Create `src/components/mode-selector.ts`**

```ts
import type { Store } from '../lib/store';
import type { Mode } from '../types';

export function mountModeSelector(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="mode-toggle" role="tablist" aria-label="Input mode">
      <button data-mode="fraud-signals" role="tab" class="mode-btn">Fraud Signals</button>
      <button data-mode="chat-messages" role="tab" class="mode-btn">Chat Messages</button>
    </div>
  `;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-mode]'));

  const render = () => {
    const active = store.getState().mode;
    for (const b of buttons) {
      b.classList.toggle('is-active', b.dataset.mode === active);
      b.setAttribute('aria-selected', b.dataset.mode === active ? 'true' : 'false');
    }
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const next = b.dataset.mode as Mode;
      if (store.getState().stage !== 'idle' && store.getState().stage !== 'done') return;
      store.setState((s) => ({
        ...s,
        mode: next,
        selectedQueryId: null,
      }));
    });
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 2: Append mode-selector styles to `src/styles/main.css`**

Append:

```css
.mode-toggle {
  display: inline-flex;
  background: var(--bg-panel);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.mode-btn {
  background: transparent;
  color: var(--fg-muted);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: none;
}
.mode-btn.is-active {
  background: var(--accent);
  color: white;
}
.mode-btn:not(.is-active):hover { color: var(--fg); }
```

- [ ] **Step 3: Wire mode selector in `src/main.ts`**

Replace `src/main.ts`:

```ts
import './styles/main.css';
import './styles/layout.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
const modeRoot = document.getElementById('mode-selector')!;
mountModeSelector(modeRoot, store);

const status = document.getElementById('status-caption');
store.subscribe((s) => { if (status) status.textContent = s.caption; });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Click between "Fraud Signals" and "Chat Messages" — active button should switch styling. Stop server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/mode-selector.ts src/main.ts src/styles/main.css
git commit -m "feat: mode selector wired to store"
```

---

## Task 13: Flow diagram (SVG nodes + edges)

**Files:**
- Create: `src/components/flow-diagram.ts`, `src/styles/flow-diagram.css`
- Modify: `src/main.ts`

The diagram has six nodes laid out left-to-right in two rows. We render nodes as foreignObjects so they can use HTML/CSS, and edges as SVG paths between fixed anchor points.

- [ ] **Step 1: Create `src/styles/flow-diagram.css`**

```css
.panel-flow .panel-header { display: flex; align-items: center; justify-content: space-between; }
.flow-svg-wrap {
  flex: 1;
  position: relative;
  background:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0) 0 0 / 22px 22px;
}
.flow-svg { width: 100%; height: 100%; display: block; }

.flow-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  width: 180px;
  box-shadow: var(--shadow);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.flow-node .node-title {
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.flow-node .node-icon {
  width: 20px; height: 20px;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: white; font-size: 11px; font-weight: 700;
}
.flow-node .node-sub { color: var(--fg-muted); font-size: 11px; }

.flow-node.is-active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(91,140,255,0.25), var(--shadow);
  transform: translateY(-1px);
}

.flow-edge { stroke: var(--edge); stroke-width: 1.6; fill: none; }
.flow-edge.is-active { stroke: var(--accent); stroke-width: 2.2; }
.flow-edge.is-active.is-pulsing {
  stroke-dasharray: 6 6;
  animation: edgePulse 0.9s linear infinite;
}
@keyframes edgePulse {
  to { stroke-dashoffset: -24; }
}

.flow-arrow { fill: var(--edge); }
.flow-arrow.is-active { fill: var(--accent); }
```

- [ ] **Step 2: Create `src/components/flow-diagram.ts`**

```ts
import type { Store } from '../lib/store';

interface NodeDef {
  id: string;
  x: number;            // top-left in SVG coords
  y: number;
  title: string;
  sub: string;
  icon: string;
}
interface EdgeDef {
  id: string;
  fromId: string;
  toId: string;
  /** offset of from-anchor on source node (0..1 across width / height) */
  fromAnchor?: { x: number; y: number };
  toAnchor?: { x: number; y: number };
}

const NODE_W = 180;
const NODE_H = 76;

const NODES: NodeDef[] = [
  { id: 'node-input',     x:  20, y: 200, title: 'Input',           sub: 'duality modes',           icon: 'I' },
  { id: 'node-query',     x: 240, y: 200, title: 'User Query',      sub: 'auto-report or doubt',    icon: 'Q' },
  { id: 'node-bank',      x: 240, y:  60, title: 'ReasoningBank',   sub: 'memory store',            icon: 'B' },
  { id: 'node-agent',     x: 460, y: 200, title: 'Agent (LLM)',     sub: 'plans actions',           icon: 'A' },
  { id: 'node-adversary', x: 680, y:  60, title: 'Adversary',       sub: 'pseudo-environment',      icon: 'X' },
  { id: 'node-judge',     x: 680, y: 340, title: 'Judge',           sub: 'success / failure',       icon: 'J' },
];

const EDGES: EdgeDef[] = [
  { id: 'edge-input-query',     fromId: 'node-input',     toId: 'node-query' },
  { id: 'edge-query-agent',     fromId: 'node-query',     toId: 'node-agent' },
  { id: 'edge-bank-agent',      fromId: 'node-bank',      toId: 'node-agent' },
  { id: 'edge-agent-adversary', fromId: 'node-agent',     toId: 'node-adversary' },
  { id: 'edge-adversary-agent', fromId: 'node-adversary', toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.4 } },
  { id: 'edge-agent-judge',     fromId: 'node-agent',     toId: 'node-judge' },
  { id: 'edge-judge-bank',      fromId: 'node-judge',     toId: 'node-bank' },
];

function nodeAnchor(n: NodeDef, anchor: { x: number; y: number }) {
  return { x: n.x + anchor.x * NODE_W, y: n.y + anchor.y * NODE_H };
}

function edgePath(from: NodeDef, to: NodeDef, e: EdgeDef): string {
  const a = nodeAnchor(from, e.fromAnchor ?? { x: 1.0, y: 0.5 });
  const b = nodeAnchor(to, e.toAnchor ?? { x: 0.0, y: 0.5 });
  const midX = (a.x + b.x) / 2;
  // Cubic bezier with horizontal control handles for an n8n-like curve.
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

export function mountFlowDiagram(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span>Flow Diagram</span><span class="diagram-stage" data-role="stage">stage: idle</span></div>
    <div class="flow-svg-wrap">
      <svg class="flow-svg" viewBox="0 0 900 460" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrow" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrow is-active" />
          </marker>
        </defs>
        <g data-role="edges"></g>
        <g data-role="nodes"></g>
      </svg>
    </div>
  `;

  const edgesG = root.querySelector<SVGGElement>('[data-role="edges"]')!;
  const nodesG = root.querySelector<SVGGElement>('[data-role="nodes"]')!;
  const stageLabel = root.querySelector<HTMLElement>('[data-role="stage"]')!;
  const nodeById = new Map(NODES.map((n) => [n.id, n]));

  // Edges
  for (const e of EDGES) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edgePath(nodeById.get(e.fromId)!, nodeById.get(e.toId)!, e));
    path.setAttribute('class', 'flow-edge');
    path.setAttribute('marker-end', 'url(#arrow)');
    path.setAttribute('data-edge-id', e.id);
    edgesG.appendChild(path);
  }

  // Nodes (foreignObject so we can use HTML/CSS inside SVG)
  for (const n of NODES) {
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', String(n.x));
    fo.setAttribute('y', String(n.y));
    fo.setAttribute('width', String(NODE_W));
    fo.setAttribute('height', String(NODE_H));
    fo.innerHTML = `
      <div xmlns="http://www.w3.org/1999/xhtml" class="flow-node" data-node-id="${n.id}">
        <div class="node-title"><span class="node-icon">${n.icon}</span>${n.title}</div>
        <div class="node-sub">${n.sub}</div>
      </div>
    `;
    nodesG.appendChild(fo);
  }

  const render = () => {
    const s = store.getState();
    stageLabel.textContent = `stage: ${s.stage}`;
    // Nodes
    nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-node-id') === s.highlightedNodeId);
    });
    // Edges
    const activeEdgeIds = new Set(s.highlightedEdgeIds);
    edgesG.querySelectorAll<SVGPathElement>('.flow-edge').forEach((el) => {
      const id = el.getAttribute('data-edge-id') ?? '';
      const active = activeEdgeIds.has(id);
      el.classList.toggle('is-active', active);
      el.classList.toggle('is-pulsing', active);
      el.setAttribute('marker-end', active ? 'url(#arrow-active)' : 'url(#arrow)');
    });
  };

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 3: Import the diagram CSS in `src/main.ts`**

Add to top of `src/main.ts`:

```ts
import './styles/flow-diagram.css';
```

And mount the diagram. Replace `src/main.ts` with:

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);

const status = document.getElementById('status-caption');
store.subscribe((s) => { if (status) status.textContent = s.caption; });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Diagram should show 6 nodes connected by curves with arrowheads. Stop server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/flow-diagram.ts src/styles/flow-diagram.css src/main.ts
git commit -m "feat: SVG flow diagram with nodes and edges"
```

---

## Task 14: Chat panel component

**Files:**
- Create: `src/components/chat-panel.ts`, `src/styles/chat-panel.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/styles/chat-panel.css`**

```css
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.chat-msg {
  max-width: 92%;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid transparent;
}
.chat-msg .sender {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  margin-bottom: 2px;
}
.chat-msg.system     { background: rgba(255,255,255,0.04); border-color: var(--edge); }
.chat-msg.victim     { align-self: flex-end; background: #283156; }
.chat-msg.counterpart{ align-self: flex-start; background: #2d2433; }
.chat-msg.agent      { align-self: flex-start; background: #102a3e; border-color: rgba(91,140,255,0.4); }
.chat-msg.adversary  { align-self: flex-end; background: #3a1c24; border-color: rgba(255,107,107,0.35); }
.chat-msg.judge      { align-self: stretch; background: #1c2e1e; border-color: rgba(61,220,151,0.35); }

.chat-controls {
  border-top: 1px solid var(--edge);
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: var(--bg-elevated);
}
.chat-controls select {
  flex: 1;
  background: var(--bg-panel-2);
  color: var(--fg);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-family: inherit;
  font-size: 13px;
}
.chat-controls select:disabled { opacity: 0.5; }
.chat-controls .preview {
  font-size: 11px;
  color: var(--fg-muted);
  flex-basis: 100%;
  margin-top: 4px;
}
```

- [ ] **Step 2: Create `src/components/chat-panel.ts`**

```ts
import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import type { Mode } from '../types';

export function mountChatPanel(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header">Chat / Query Console</div>
    <div class="chat-list" data-role="list" aria-live="polite"></div>
    <div class="chat-controls">
      <select data-role="picker" aria-label="Pick a query"></select>
      <span class="preview" data-role="preview"></span>
    </div>
  `;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const picker = root.querySelector<HTMLSelectElement>('[data-role="picker"]')!;
  const preview = root.querySelector<HTMLSpanElement>('[data-role="preview"]')!;

  function renderPicker(mode: Mode, selectedId: string | null, isLocked: boolean) {
    const opts = ['<option value="">— select a query —</option>']
      .concat(
        QUERIES.filter((q) => q.mode === mode).map(
          (q) => `<option value="${q.id}"${q.id === selectedId ? ' selected' : ''}>${q.label}</option>`,
        ),
      )
      .join('');
    picker.innerHTML = opts;
    picker.disabled = isLocked;
    const sel = QUERIES.find((q) => q.id === selectedId);
    preview.textContent = sel ? sel.preview : '';
  }

  picker.addEventListener('change', () => {
    const id = picker.value || null;
    store.setState((s) => ({ ...s, selectedQueryId: id }));
  });

  function renderList(state: ReturnType<Store['getState']>) {
    list.innerHTML = state.chatMessages
      .map((m) => `<div class="chat-msg ${m.sender}"><div class="sender">${m.sender}</div>${escapeHtml(m.text)}</div>`)
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  const off = store.subscribe((s) => {
    const locked = s.stage !== 'idle' && s.stage !== 'done';
    renderPicker(s.mode, s.selectedQueryId, locked);
    renderList(s);
  });

  // Initial render
  const initial = store.getState();
  renderPicker(initial.mode, initial.selectedQueryId, false);
  renderList(initial);
  return off;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 3: Import + mount in `src/main.ts`**

Replace `src/main.ts`:

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);

const status = document.getElementById('status-caption');
store.subscribe((s) => { if (status) status.textContent = s.caption; });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. The chat panel should show a header, an empty message area, and a dropdown populated with queries that match the active mode. Switch mode → dropdown updates. Stop server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/chat-panel.ts src/styles/chat-panel.css src/main.ts
git commit -m "feat: chat panel with query picker and bubble list"
```

---

## Task 15: Active pane component

**Files:**
- Create: `src/components/active-pane.ts`, `src/styles/active-pane.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/styles/active-pane.css`**

```css
.active-pane-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}
.active-stage-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--fg-muted);
}
.stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  text-transform: capitalize;
}
.stage-pill .dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--fg-muted);
}
.stage-pill.is-active .dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(91,140,255,0.25); }
.stage-pill.is-success .dot { background: var(--good); }
.stage-pill.is-failure .dot { background: var(--bad); }

.kv-block { background: var(--bg-panel-2); border: 1px solid var(--edge); border-radius: var(--radius-md); padding: 10px 12px; }
.kv-block h4 { margin: 0 0 6px 0; font-size: 12px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.kv-block .body { white-space: pre-wrap; font-size: 13px; }

.mem-card {
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.mem-card .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.mem-card .desc { color: var(--fg-muted); font-size: 12px; margin-bottom: 4px; }
.mem-card .tags { display: flex; flex-wrap: wrap; gap: 4px; }
.mem-card .tag { font-size: 10px; padding: 1px 6px; background: var(--bg-panel); border: 1px solid var(--edge); border-radius: 999px; color: var(--fg-muted); }

.verdict.success { color: var(--good); }
.verdict.failure { color: var(--bad); }
```

- [ ] **Step 2: Create `src/components/active-pane.ts`**

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

export function mountActivePane(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header">Active Pane</div>
    <div class="active-pane-body" data-role="body"></div>
  `;
  const body = root.querySelector<HTMLDivElement>('[data-role="body"]')!;

  function render() {
    const s = store.getState();
    const query = QUERIES.find((q) => q.id === s.selectedQueryId);
    const signal = query?.fraudSignalId ? FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId) : null;
    const snippet = query?.chatSnippetId ? CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId) : null;
    const retrieved = s.retrievedMemoryIds
      .map((id) => s.bank.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    const stagePills = STAGE_ORDER.map((stg) => {
      const reached = STAGE_ORDER.indexOf(stg) <= STAGE_ORDER.indexOf(s.stage === 'idle' ? 'input' : s.stage) - (s.stage === 'idle' ? 1 : 0);
      const isCurrent = stg === s.stage;
      let cls = 'stage-pill';
      if (isCurrent) cls += ' is-active';
      if (stg === 'done' && s.outcome === 'success') cls += ' is-success';
      if (stg === 'done' && s.outcome === 'failure') cls += ' is-failure';
      return `<span class="${cls}" style="opacity:${reached || isCurrent ? 1 : 0.4}"><span class="dot"></span>${STAGE_LABEL[stg]}</span>`;
    }).join('');

    const inputBlock =
      query
        ? signal
          ? `<div class="kv-block"><h4>Selected fraud signal</h4><div class="body"><strong>${signal.label}</strong>\n${signal.summary}\n\n${signal.details.map((d) => '• ' + d).join('\n')}</div></div>`
          : snippet
            ? `<div class="kv-block"><h4>Selected chat snippet</h4><div class="body"><strong>${snippet.label}</strong> · with ${snippet.participants.counterpart}\n${snippet.messages.length} messages</div></div>`
            : ''
        : '<div class="kv-block"><h4>Pick a query</h4><div class="body">Select a mode in the header, then choose a query in the chat panel.</div></div>';

    const queryBlock = query
      ? `<div class="kv-block"><h4>User query</h4><div class="body"><strong>${query.label}</strong>\n${query.preview}</div></div>`
      : '';

    const retrievalBlock = retrieved.length
      ? `<div class="kv-block"><h4>Retrieved memories (top-3)</h4>${retrieved.map((m) => memCard(m.title, m.description, m.tags)).join('')}</div>`
      : '';

    const verdictBlock = s.judgeVerdict
      ? `<div class="kv-block"><h4>Judge verdict</h4><div class="body verdict ${s.outcome ?? ''}">${s.judgeVerdict}</div></div>`
      : '';

    const learned = s.bank[s.bank.length - 1];
    const learnedBlock = s.stage === 'done' && learned && learned.origin === 'learned'
      ? `<div class="kv-block"><h4>New memory committed to bank</h4>${memCard(learned.title, learned.description, learned.tags)}</div>`
      : '';

    body.innerHTML = `
      <div class="active-stage-banner">${stagePills}</div>
      ${inputBlock}
      ${queryBlock}
      ${retrievalBlock}
      ${verdictBlock}
      ${learnedBlock}
    `;
  }

  function memCard(title: string, desc: string, tags: string[]): string {
    return `<div class="mem-card"><div class="title">${escapeHtml(title)}</div><div class="desc">${escapeHtml(desc)}</div><div class="tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div></div>`;
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 3: Import + mount in `src/main.ts`**

Replace `src/main.ts`:

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);

const status = document.getElementById('status-caption');
store.subscribe((s) => { if (status) status.textContent = s.caption; });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Active pane shows stage pills + a "pick a query" prompt. Selecting a query in the chat picker should populate the input/query blocks. Stop server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/active-pane.ts src/styles/active-pane.css src/main.ts
git commit -m "feat: stage-aware active pane"
```

---

## Task 16: Memory bank view

**Files:**
- Create: `src/components/memory-bank-view.ts`
- Modify: `src/styles/active-pane.css` (reuse `.mem-card`), `src/main.ts`

- [ ] **Step 1: Append to `src/styles/active-pane.css`**

Append:

```css
.bank-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bank-list .mem-card { transition: border-color 600ms ease, background 600ms ease; }
.bank-list .mem-card.is-new {
  border-color: var(--good);
  background: rgba(61,220,151,0.08);
  animation: bankPulse 1200ms ease-out 1;
}
@keyframes bankPulse {
  0%   { transform: translateX(8px); opacity: 0; }
  100% { transform: translateX(0);   opacity: 1; }
}
.bank-list .mem-card .origin-flag {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--good);
  text-transform: uppercase;
  margin-left: 6px;
}
.bank-count {
  font-size: 11px;
  color: var(--fg-muted);
  margin-left: auto;
}
```

- [ ] **Step 2: Create `src/components/memory-bank-view.ts`**

```ts
import type { Store } from '../lib/store';

export function mountMemoryBankView(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span>ReasoningBank</span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-list" data-role="list"></div>
  `;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const countEl = root.querySelector<HTMLSpanElement>('[data-role="count"]')!;

  function render() {
    const s = store.getState();
    countEl.textContent = `${s.bank.length} memories`;
    list.innerHTML = s.bank
      .slice()
      .reverse()
      .map((m) => {
        const isNew = m.id === s.newlyLearnedMemoryId ? ' is-new' : '';
        const flag = m.origin === 'learned' ? '<span class="origin-flag">learned</span>' : '';
        const tags = m.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        return `<div class="mem-card${isNew}" data-id="${m.id}">
          <div class="title">${escapeHtml(m.title)}${flag}</div>
          <div class="desc">${escapeHtml(m.description)}</div>
          <div class="tags">${tags}</div>
        </div>`;
      })
      .join('');
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 3: Mount in `src/main.ts`**

Replace `src/main.ts`:

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';
import { mountMemoryBankView } from './components/memory-bank-view';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);
mountMemoryBankView(document.getElementById('memory-bank-view')!, store);

const status = document.getElementById('status-caption');
store.subscribe((s) => { if (status) status.textContent = s.caption; });
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Right column shows the seed memory list with tags and a count. Stop server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/memory-bank-view.ts src/styles/active-pane.css src/main.ts
git commit -m "feat: memory bank side view"
```

---

## Task 17: Wire run/reset buttons + stage runner

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update `src/main.ts` to wire the run/reset buttons**

Replace `src/main.ts`:

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';
import { mountMemoryBankView } from './components/memory-bank-view';
import { runDemo } from './lib/stage-runner';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);
mountMemoryBankView(document.getElementById('memory-bank-view')!, store);

const status = document.getElementById('status-caption');
const runBtn = document.getElementById('run-button') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-button') as HTMLButtonElement;

let running = false;

function syncButtons() {
  const s = store.getState();
  runBtn.disabled = running || !s.selectedQueryId || (s.stage !== 'idle' && s.stage !== 'done');
  resetBtn.disabled = running;
}

store.subscribe((s) => {
  if (status) status.textContent = s.caption;
  syncButtons();
});

runBtn.addEventListener('click', async () => {
  const id = store.getState().selectedQueryId;
  if (!id || running) return;
  running = true;
  syncButtons();
  try {
    await runDemo(store, id);
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Demo run failed — see console.';
  } finally {
    running = false;
    syncButtons();
  }
});

resetBtn.addEventListener('click', () => {
  if (running) return;
  store.reset();
});

syncButtons();
```

- [ ] **Step 2: Manual verify the full demo flow**

Run: `npm run dev`. Steps to verify:
1. Pick a mode (Fraud Signals or Chat Messages).
2. Pick a query in the dropdown.
3. Click "Run demo".
4. Watch chat messages stream, diagram nodes/edges light up, active pane stages advance, memory bank gains a new entry highlighted at the end.
5. Click "Reset" to return to idle. Bank retains the new memory.
6. Run a second demo — confirm subsequent runs can also pull the newly learned memory if it ends up linked (yes for first-run impact mostly visible on bank view; the retrieval pool is fixed per-query, but the bank visibly grows).

Stop server when done.

- [ ] **Step 3: Commit**

```powershell
git add src/main.ts
git commit -m "feat: wire run/reset buttons to stage runner"
```

---

## Task 18: Persist learned memories across runs (linked into future retrievals)

To make the self-evolving loop visible inside retrieval (not just on the bank panel), each successful run also extends the linked-memory pool of related queries by tag overlap.

**Files:**
- Modify: `src/lib/stage-runner.ts`
- Test: `tests/stage-runner.test.ts`

- [ ] **Step 1: Extend the test**

Append to `tests/stage-runner.test.ts`:

```ts
describe('learned-memory linking', () => {
  it('after a successful run, related queries gain the new memory in their linked pool', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng });
    const learnedId = store.getState().bank[store.getState().bank.length - 1].id;
    // The "linked memory pool extension" is tracked on the store as state.linkedExtensions: Record<queryId, string[]>.
    const ext = (store.getState() as unknown as { linkedExtensions: Record<string, string[]> }).linkedExtensions;
    // The pig-butcher counsel result has tag 'pig-butchering' or 'counsel'; should propagate to recovery query (shares 'pig-butchering' via mem-pig-butcher-01) — at minimum it MUST be present on the originating query.
    expect(ext['q-pig-butcher-doubt']).toContain(learnedId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `linkedExtensions` not present, or `ext` undefined.

- [ ] **Step 3: Add `linkedExtensions` to the store**

Modify `src/lib/store.ts`. Add field to `DemoState`:

```ts
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
  /** map of query id → extra learned memory ids that should be considered for retrieval next time */
  linkedExtensions: Record<string, string[]>;
}
```

In `initial()` add `linkedExtensions: {}`.

In `reset()` keep linkedExtensions across reset (it accumulates):

```ts
reset() {
  const bank = state.bank;
  const linkedExtensions = state.linkedExtensions;
  state = { ...initial(), bank, linkedExtensions };
  for (const l of listeners) l(state);
},
```

- [ ] **Step 4: Update `addLearnedMemory` to also extend the linked pool**

Replace `addLearnedMemory` in `src/lib/store.ts`:

```ts
addLearnedMemory(m, opts: { extendQueryIds?: string[] } = {}) {
  const learned: Memory = { ...m, origin: 'learned' };
  const ext = { ...state.linkedExtensions };
  for (const qid of opts.extendQueryIds ?? []) {
    ext[qid] = [...(ext[qid] ?? []), m.id];
  }
  state = { ...state, bank: [...state.bank, learned], newlyLearnedMemoryId: m.id, linkedExtensions: ext };
  for (const l of listeners) l(state);
},
```

Update the `Store` interface:

```ts
addLearnedMemory(m: Omit<Memory, 'origin'>, opts?: { extendQueryIds?: string[] }): void;
```

- [ ] **Step 5: Update the stage runner to compute extension targets and use the extended pool**

In `src/lib/stage-runner.ts`, replace the retrieval block with:

```ts
// Effective linked pool = the query's own list + any prior learned memories tied to this query.
const ext = store.getState().linkedExtensions[query.id] ?? [];
const effectiveLinked = [...query.linkedMemoryIds, ...ext].filter((id) =>
  store.getState().bank.some((m) => m.id === id),
);
const retrieved = retrieveTopMemories(store.getState().bank, effectiveLinked, rng);
```

And in the factory block, replace the `addLearnedMemory` call with:

```ts
const memTemplate = script.outcome === 'success' ? script.successMemory! : script.reflectionMemory!;
const newId = `mem-${script.id}-${Date.now()}`;
// Extend any query whose tag set overlaps with the new memory's tags by ≥1.
const extendTargets = QUERIES.filter((q) => {
  if (q.id !== query.id) {
    // overlap by linked memory tags
    const qTags = new Set(
      q.linkedMemoryIds
        .map((id) => store.getState().bank.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .flatMap((m) => m.tags),
    );
    return memTemplate.tags.some((t) => qTags.has(t));
  }
  return true; // always extend the originating query
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
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: all tests pass, including the new `linkedExtensions` test.

- [ ] **Step 7: Manual verify the visible "self-evolving" effect**

Run: `npm run dev`.
1. Run the pig-butcher counsel demo end-to-end.
2. Run it again — the retrieved memories pool now includes the prior learned memory; you may see it appear in the active pane "Retrieved memories" block, demonstrating the loop.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/store.ts src/lib/stage-runner.ts tests/stage-runner.test.ts
git commit -m "feat: learned memories extend linked pools (visible self-evolving loop)"
```

---

## Task 19: Polish — narrative captions, replay button label, tag filtering on bank

**Files:**
- Modify: `src/components/memory-bank-view.ts`, `src/components/active-pane.ts`, `index.html`

- [ ] **Step 1: Add a tag filter to the bank view**

Replace `src/components/memory-bank-view.ts`:

```ts
import type { Store } from '../lib/store';

export function mountMemoryBankView(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span>ReasoningBank</span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-filter">
      <input type="text" placeholder="filter by tag…" data-role="filter" />
    </div>
    <div class="bank-list" data-role="list"></div>
  `;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const countEl = root.querySelector<HTMLSpanElement>('[data-role="count"]')!;
  const input = root.querySelector<HTMLInputElement>('[data-role="filter"]')!;
  let filter = '';

  input.addEventListener('input', () => {
    filter = input.value.trim().toLowerCase();
    render();
  });

  function render() {
    const s = store.getState();
    const all = s.bank.slice().reverse();
    const filtered = filter ? all.filter((m) => m.tags.some((t) => t.toLowerCase().includes(filter))) : all;
    countEl.textContent = `${filtered.length} / ${all.length}`;
    list.innerHTML = filtered
      .map((m) => {
        const isNew = m.id === s.newlyLearnedMemoryId ? ' is-new' : '';
        const flag = m.origin === 'learned' ? '<span class="origin-flag">learned</span>' : '';
        const tags = m.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        return `<div class="mem-card${isNew}" data-id="${m.id}">
          <div class="title">${escapeHtml(m.title)}${flag}</div>
          <div class="desc">${escapeHtml(m.description)}</div>
          <div class="tags">${tags}</div>
        </div>`;
      })
      .join('');
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 2: Add filter input styling**

Append to `src/styles/active-pane.css`:

```css
.bank-filter {
  padding: 8px 12px;
  border-bottom: 1px solid var(--edge);
  background: var(--bg-elevated);
}
.bank-filter input {
  width: 100%;
  background: var(--bg-panel-2);
  color: var(--fg);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-family: inherit;
  font-size: 12px;
}
.bank-filter input:focus { outline: 2px solid var(--accent); border-color: transparent; }
```

- [ ] **Step 3: Make the run button label dynamic**

Modify `src/main.ts` to update label based on stage. After the existing `store.subscribe(...)` block, add inside the same subscriber:

Replace the subscribe block with:

```ts
store.subscribe((s) => {
  if (status) status.textContent = s.caption;
  if (s.stage === 'done') runBtn.textContent = 'Run again';
  else if (s.stage === 'idle') runBtn.textContent = 'Run demo';
  else runBtn.textContent = 'Running…';
  syncButtons();
});
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`.
- Type "romance" in the bank filter — list narrows.
- Run the demo — button label changes "Running…" → "Run again".
- Reset — button returns to "Run demo".

- [ ] **Step 5: Commit**

```powershell
git add src/components/memory-bank-view.ts src/styles/active-pane.css src/main.ts
git commit -m "polish: bank tag filter + dynamic run button label"
```

---

## Task 20: Production build verification

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All test files pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Vite emits `dist/` with `index.html` and bundled assets, no TypeScript errors.

- [ ] **Step 3: Preview the production build**

Run: `npm run preview`
Open the URL and run through one full demo cycle end-to-end.

- [ ] **Step 4: Commit anything generated (lockfile if not yet committed)**

```powershell
git add package-lock.json
git commit -m "chore: lockfile"
```

(Skip if nothing to add.)

---

## Self-Review

**Spec coverage:**

| Spec point | Task |
| --- | --- |
| 1. Selection of input modes (duality) — header/side toggle | Task 12 |
| 1.iii. Predefined queries dropdown that "pastes" content into chatbox | Tasks 14, 17 (stage 1 emits the snippet/signal into chat) |
| 2. Input user query (auto-report or chat-doubt) | Tasks 6, 17 (stage 2) |
| 2. Active pane shows what is happening | Task 15 |
| 3. Retrieve top-3 hardcoded memories from a linked pool, no embeddings | Tasks 4, 6, 8, 17 (stage 3) |
| 3. Diagram shows memory bank node and retrieval edge | Task 13 + stage runner highlights |
| 3. Retrieved memories visible in active pane | Task 15 |
| 3. Memories appended to system prompt (chat shows assembled prompt) | Stage runner `[System prompt assembled with retrieved memories]` message |
| 4. 1.5MaTTs trajectory — agent ↔ adversary loop with thoughts/actions/observations | Task 7 (scripts) + Task 17 (stage 4) |
| 4. Bouncing animation on diagram | Task 13 (active edges + pulsing) + stage runner toggling highlightedEdgeIds |
| 5. Factory: judge verdict, success → insight memory, failure → reflection memory | Tasks 7, 17 (stage 5) |
| 5. Schema: title / description / content | Task 7 templates + Task 17 |
| 5. New memory stored into bank | Task 9 store, Task 17 stage runner, Task 16 view |
| Self-evolving demonstration: subsequent runs see the new memory | Task 18 (linkedExtensions + extended retrieval pool) |

**Placeholder scan:** No "TBD", "TODO", or vague handwaving present. All code blocks are complete.

**Type consistency check:**
- `Stage` values used in stage runner / active pane / store all match: `idle | input | query | retrieval | reasoning | factory | done`.
- `TrajectoryStep.kind` used by trajectories + stage runner + chat panel: `thought | action | observation | terminate`.
- `ChatMessage.sender` includes all senders the stage runner emits: `victim | counterpart | agent | adversary | system | judge`. Chat panel CSS classes match.
- `Mode` is `fraud-signals | chat-messages` everywhere.
- `Memory.origin` is `seed | learned`; only the bank view treats `learned` specially.
- Store API names (`appendChat`, `addLearnedMemory(m, opts)`, `setState`, `reset`, `subscribe`, `getState`) match callers in stage runner and tests.
- Diagram node ids referenced by stage runner (`node-input | node-query | node-bank | node-agent | node-adversary | node-judge`) match the `NODES` array in the diagram component.
- Diagram edge ids referenced by stage runner (`edge-input-query | edge-bank-agent | edge-agent-adversary | edge-adversary-agent | edge-agent-judge | edge-judge-bank`) match the `EDGES` array.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-reasoningbank-antifraud-demo.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
