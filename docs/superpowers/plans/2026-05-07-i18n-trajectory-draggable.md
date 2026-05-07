# i18n + Full Trajectory Loop + Draggable Nodes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five connected upgrades: (1) replace the mode toggle with an EN↔中文 language toggle that translates every user-facing string except technical jargon; (2) formalize the ReasoningBank Memory schema (Title / Description / Content) and surface its definition in the UI; (3) rebuild trajectories around the canonical loop *plan → adversary check → revised action → environment execution → observation → terminate*; (4) seed the bank with explicit failure-reflection memories; (5) make diagram nodes draggable.

**Architecture:** Each translatable field becomes a `Localized = { en: string; zh: string }` record; an `i18n` module exposes `t(loc, lang)` for data and a UI string dictionary for chrome. The store gains a `language: 'en' | 'zh'` field. Trajectory steps gain new kinds (`thought`, `planned_action`, `adversary_projection`, `action_taken`, `environment_observation`, `terminate`) and a third actor `environment` with its own diagram node. Node positions move into the store so the diagram component can mutate them on pointer-drag and re-route SVG edges.

**Tech Stack:** Same — vanilla TypeScript, Vite 8, Vitest 4 + jsdom, plain CSS, SVG.

**Prerequisites:** The base demo plan and the interactive-diagram addendum are both implemented (commit `c555809` or later in this repo).

---

## File Structure (changes only)

```
src/
├── types.ts                       # MODIFIED: Localized, new step kinds, new actor, Origin enum
├── lib/
│   ├── i18n.ts                    # NEW: Lang, t(), prompt template constant
│   ├── store.ts                   # MODIFIED: language + nodePositions + setters
│   └── stage-runner.ts            # MODIFIED: emit new step kinds, environment highlighting
├── data/
│   ├── memory-bank.ts             # MODIFIED: bilingual + 3 reflection seeds
│   ├── fraud-signals.ts           # MODIFIED: bilingual
│   ├── chat-snippets.ts           # MODIFIED: bilingual
│   ├── queries.ts                 # MODIFIED: bilingual
│   ├── trajectories.ts            # MODIFIED: new step kinds + bilingual + ZH-friendly content
│   └── ui-strings.ts              # NEW: bilingual UI labels
├── styles/
│   ├── flow-diagram.css           # MODIFIED: env node + drag cursor
│   └── active-pane.css            # MODIFIED: origin badges (success / failure)
└── components/
    ├── language-selector.ts       # NEW (replaces mode-selector.ts which is deleted)
    ├── flow-diagram.ts            # MODIFIED: env node + draggable
    ├── chat-panel.ts              # MODIFIED: optgroups for both modes
    ├── active-pane.ts             # MODIFIED: t() everywhere + new origins + env detail + judge prompt view
    ├── memory-bank-view.ts        # MODIFIED: t() + origin badges
    └── memory-detail-popover.ts   # MODIFIED: t() + schema labels
tests/
├── i18n.test.ts                   # NEW
├── data.test.ts                   # MODIFIED: shape changes
├── store.test.ts                  # MODIFIED: language + positions
└── stage-runner.test.ts           # MODIFIED: new step kinds
```

**Naming conventions (locked):**
- Locale: `Lang = 'en' | 'zh'`
- Step kinds: `'thought' | 'planned_action' | 'adversary_projection' | 'action_taken' | 'environment_observation' | 'terminate'`
- Actors: `'agent' | 'adversary' | 'environment'`
- Memory origin: `'seed' | 'learned-success' | 'learned-failure'`
- New diagram node id: `'node-environment'`
- New diagram edge ids: `'edge-agent-environment'`, `'edge-environment-agent'`

---

## Task 1: Types + i18n module + store fields

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/i18n.ts`
- Modify: `src/lib/store.ts`
- Create: `tests/i18n.test.ts`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Replace `src/types.ts` entirely**

```ts
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
  | 'planned_action'
  | 'adversary_projection'
  | 'action_taken'
  | 'environment_observation'
  | 'terminate';

export type Actor = 'agent' | 'adversary' | 'environment';

export interface TrajectoryStep {
  kind: StepKind;
  actor: Actor;
  text: Localized;
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
```

- [ ] **Step 2: Create `src/lib/i18n.ts`**

```ts
import type { Lang, Localized } from '../types';
import { UI_STRINGS } from '../data/ui-strings';

export function t(loc: Localized, lang: Lang): string {
  return loc[lang];
}

export function ui(key: keyof typeof UI_STRINGS, lang: Lang): string {
  const entry = UI_STRINGS[key];
  return entry ? entry[lang] : String(key);
}

/**
 * The exact LLM-as-judge prompt template the Factory stage would send to the
 * agent. Shown verbatim in the Judge inspect view so the audience can see what
 * triggers memory extraction. Keep this in sync with the ReasoningBank paper.
 */
export const JUDGE_PROMPT_TEMPLATE: Localized = {
  en: `You are an expert in fraud-prevention agent behavior. You will be given a user query and one or more trajectories showing how the agent attempted the task. Some trajectories may be successful, and others may have failed.

## Guidelines
Your goal is to compare and contrast these trajectories to identify the most useful and generalizable strategies as memory items. Use self-contrast reasoning:
- Identify patterns and strategies that consistently led to success.
- Identify mistakes or inefficiencies from failed trajectories and formulate preventative strategies.
- Prefer strategies that generalize beyond specific scams or exact wording.

## Important notes
- Think first: why did some trajectories succeed while others failed?
- Extract at most 5 memory items from all trajectories combined.
- Do not repeat similar or overlapping items.
- Do not mention specific people, platforms, or string contents — focus on generalizable behaviors.
- Make sure each memory item captures actionable and transferable insights.

## Output Format
\`\`\`
# Memory Item i
## Title <the title of the memory item>
## Description <one sentence summary of the memory item>
## Content <1–5 sentences describing the insights learned to successfully accomplish the task>
\`\`\`

# System Instruction
{system_instruction}

# Input Prompt
Query: {user_query}
Trajectories:
{trajectories}`,
  zh: `你是一名反欺诈代理行为分析专家。你将获得一个用户查询和一条或多条轨迹，展示代理如何尝试完成任务。部分轨迹可能成功，部分可能失败。

## 指南
你的目标是对比这些轨迹，识别最具通用性的策略并提炼为记忆项。使用自对比推理：
- 识别在成功轨迹中反复出现的有效模式与策略。
- 识别失败轨迹中的错误或低效，并提炼出预防性策略。
- 优先选择能跨场景泛化的策略，而非依赖特定诈骗或措辞的策略。

## 重要说明
- 先思考：为什么部分轨迹成功而部分失败？
- 全部轨迹合计最多提取 5 条记忆项。
- 避免重复或语义重叠的条目。
- 不要提及具体人物、平台或字符串，专注于可泛化的行为与推理模式。
- 确保每条记忆项都包含可操作、可转移的洞察。

## 输出格式
\`\`\`
# Memory Item i
## Title <记忆项标题>
## Description <一句话摘要>
## Content <1–5 句描述完成任务所学到的洞察>
\`\`\`

# System Instruction
{system_instruction}

# Input Prompt
Query: {user_query}
Trajectories:
{trajectories}`,
};
```

- [ ] **Step 3: Add `language` and `nodePositions` to `DemoState` in `src/lib/store.ts`**

In the `DemoState` interface add (after `inspectedMemoryId`):
```ts
  language: Lang;
  nodePositions: Record<string, { x: number; y: number }>;
```

Add to imports at top:
```ts
import type { ChatMessage, Memory, Mode, Stage, Lang } from '../types';
```

In `initial()` add:
```ts
  language: 'en',
  nodePositions: {},
```

In the `Store` interface (after `setInspectedMemory`):
```ts
  setLanguage(lang: Lang): void;
  setNodePosition(id: string, pos: { x: number; y: number }): void;
```

In `createStore()` factory (alongside other methods, before `reset`):
```ts
    setLanguage(lang) {
      state = { ...state, language: lang };
      notify();
    },
    setNodePosition(id, pos) {
      state = { ...state, nodePositions: { ...state.nodePositions, [id]: pos } };
      notify();
    },
```

In `reset()`, preserve language and nodePositions across reset:
```ts
    reset() {
      const bank = state.bank;
      const linkedExtensions = state.linkedExtensions;
      const language = state.language;
      const nodePositions = state.nodePositions;
      state = { ...initial(), bank, linkedExtensions, language, nodePositions };
      notify();
    },
```

- [ ] **Step 4: Create `tests/i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { t, ui, JUDGE_PROMPT_TEMPLATE } from '../src/lib/i18n';

describe('i18n', () => {
  it('t() picks the active language', () => {
    expect(t({ en: 'Run', zh: '运行' }, 'en')).toBe('Run');
    expect(t({ en: 'Run', zh: '运行' }, 'zh')).toBe('运行');
  });
  it('ui() falls back to key if missing', () => {
    expect(ui('header.run' as any, 'en').length).toBeGreaterThan(0);
  });
  it('JUDGE_PROMPT_TEMPLATE has both languages', () => {
    expect(JUDGE_PROMPT_TEMPLATE.en.length).toBeGreaterThan(100);
    expect(JUDGE_PROMPT_TEMPLATE.zh.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 5: Extend `tests/store.test.ts`** — append:

```ts
describe('language + node positions', () => {
  it('starts with language=en and empty nodePositions', () => {
    const s = createStore();
    expect(s.getState().language).toBe('en');
    expect(s.getState().nodePositions).toEqual({});
  });
  it('setLanguage updates and notifies', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.setLanguage('zh');
    expect(s.getState().language).toBe('zh');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('setNodePosition merges per-id positions', () => {
    const s = createStore();
    s.setNodePosition('node-agent', { x: 100, y: 200 });
    s.setNodePosition('node-bank', { x: 50, y: 10 });
    expect(s.getState().nodePositions).toEqual({
      'node-agent': { x: 100, y: 200 },
      'node-bank': { x: 50, y: 10 },
    });
  });
  it('reset preserves language and nodePositions', () => {
    const s = createStore();
    s.setLanguage('zh');
    s.setNodePosition('node-agent', { x: 1, y: 2 });
    s.reset();
    expect(s.getState().language).toBe('zh');
    expect(s.getState().nodePositions['node-agent']).toEqual({ x: 1, y: 2 });
  });
});
```

- [ ] **Step 6: Don't run tests yet** — Tasks 2–7 will rewrite the data files; tests will fail until those land. Commit current code as a checkpoint.

```powershell
git add src/types.ts src/lib/i18n.ts src/lib/store.ts tests/i18n.test.ts tests/store.test.ts
git commit -m "feat: add Localized types, i18n helpers, language + node positions in store"
```

---

## Task 2: UI strings dictionary

**Files:**
- Create: `src/data/ui-strings.ts`

- [ ] **Step 1: Create `src/data/ui-strings.ts`**

```ts
export const UI_STRINGS = {
  'brand.name':            { en: 'ReasoningBank · Anti-Fraud Demo', zh: 'ReasoningBank · 反欺诈演示' },
  'header.run':            { en: 'Run demo',          zh: '运行演示' },
  'header.run.again':      { en: 'Run again',         zh: '再次运行' },
  'header.run.running':    { en: 'Running…',          zh: '运行中…' },
  'header.reset':          { en: 'Reset',             zh: '重置' },
  'header.lang.en':        { en: 'EN',                zh: 'EN' },
  'header.lang.zh':        { en: '中文',              zh: '中文' },
  'panel.flow':            { en: 'Flow Diagram',      zh: '流程图' },
  'panel.active':          { en: 'Active Pane',       zh: '活动面板' },
  'panel.chat':            { en: 'Chat / Query Console', zh: '对话 / 查询控制台' },
  'panel.bank':            { en: 'ReasoningBank',     zh: 'ReasoningBank' },
  'diagram.stage':         { en: 'stage',             zh: '阶段' },
  'mode.fraud':            { en: 'Fraud Signals',     zh: '欺诈信号' },
  'mode.chat':             { en: 'Chat Messages',     zh: '聊天记录' },
  'picker.placeholder':    { en: '— select a query —', zh: '— 选择查询 —' },
  'inspect.label':         { en: 'Inspecting',        zh: '查看' },
  'inspect.close':         { en: 'close ✕',           zh: '关闭 ✕' },
  'pane.pickQuery':        { en: 'Pick a query',      zh: '选择查询' },
  'pane.pickQuery.help':   { en: 'Switch language at the top, then choose a query in the chat panel. Click any node in the diagram to inspect it.', zh: '在顶部切换语言，然后在对话面板选择一个查询。点击图中任意节点可查看其内容。' },
  'pane.userQuery':        { en: 'User query',        zh: '用户查询' },
  'pane.retrieved':        { en: 'Retrieved memories (top-3)', zh: '检索到的记忆（前三）' },
  'pane.verdict':          { en: 'Judge verdict',     zh: '判定结果' },
  'pane.committed':        { en: 'New memory committed to bank', zh: '新记忆已写入 ReasoningBank' },
  'pane.role':             { en: 'Role',              zh: '角色' },
  'pane.systemPrompt':     { en: 'System prompt · retrieved memories', zh: '系统提示 · 检索到的记忆' },
  'pane.systemPrompt.empty': { en: 'No memories retrieved yet — run the demo to populate this.', zh: '尚未检索到记忆 — 运行演示后会显示。' },
  'pane.lastObs':          { en: 'Last observation',  zh: '最近一次观察' },
  'pane.lastObs.empty':    { en: 'No observation yet.', zh: '尚无观察。' },
  'pane.verdict.empty':    { en: 'No verdict yet.',   zh: '尚无判定。' },
  'pane.bankIntro':        { en: 'Click any memory to open the detail mini-window.', zh: '点击任意记忆可打开详情窗口。' },
  'pane.judgePrompt':      { en: 'LLM-as-judge prompt template', zh: 'LLM 作为评审 · 提示模板' },
  'pane.queryMode':        { en: 'Mode',              zh: '模式' },
  'pane.queryLinkedPool':  { en: 'Linked memory pool', zh: '关联记忆池' },
  'pane.linkedExt':        { en: 'Extensions from prior runs', zh: '历史运行扩展' },
  'pane.envRole':          { en: 'Environment',       zh: '环境' },
  'pane.envRoleDesc':      { en: 'Executes the agent’s revised action and returns the actual observation (e.g. counterpart message, telco gateway response, device telemetry).', zh: '执行代理的修订后动作，并返回真实观察（例如对方回复、电信网关响应、设备遥测）。' },
  'pane.adversaryRole':    { en: 'Pseudo-environment. Projects the likely scammer / counterparty response so the agent can reason about consequences before committing.', zh: '伪环境。预测对方/诈骗者的可能反应，便于代理在执行前推演后果。' },
  'pane.agentRole':        { en: 'Plans actions and emits thoughts. Receives the user query plus the retrieved memories as system prompt.', zh: '规划动作并产出思考过程。接收用户查询与检索到的记忆作为系统提示。' },
  'pane.judgeRole':        { en: 'LLM-as-a-judge. Evaluates the trajectory’s outcome and triggers extraction of an insight memory or a reflection memory.', zh: 'LLM 作为评审。评估轨迹结果，触发洞察记忆或反思记忆的提取。' },
  'pane.bankCount':        { en: 'memories',          zh: '条记忆' },
  'mem.title':             { en: 'Title',             zh: '标题' },
  'mem.description':       { en: 'Description',       zh: '描述' },
  'mem.content':           { en: 'Content',           zh: '内容' },
  'mem.tags':              { en: 'Tags',              zh: '标签' },
  'mem.origin':            { en: 'Origin · ID',       zh: '来源 · ID' },
  'mem.origin.seed':       { en: 'seed',              zh: '种子' },
  'mem.origin.success':    { en: 'learned · success', zh: '学习 · 成功' },
  'mem.origin.failure':    { en: 'learned · reflection', zh: '学习 · 反思' },
  'bank.filter':           { en: 'filter by tag…',    zh: '按标签筛选…' },
  'caption.idle':          { en: 'Pick a mode and a query to begin.', zh: '选择模式与查询以开始。' },
  'caption.starting':      { en: 'Starting demo run…', zh: '正在启动演示…' },
  'caption.s1':            { en: 'Stage 1 · Input mode selected. Sample data being prepared.', zh: '阶段 1 · 已选择输入模式，准备样本数据。' },
  'caption.s2':            { en: 'Stage 2 · User query formed and sent.', zh: '阶段 2 · 用户查询已生成并发送。' },
  'caption.s3':            { en: 'Stage 3 · Top-3 memories retrieved from ReasoningBank.', zh: '阶段 3 · 已从 ReasoningBank 检索前三条记忆。' },
  'caption.s4':            { en: 'Stage 4 · 1.5MaTTs — agent ↔ adversary projection ↔ environment execution loop.', zh: '阶段 4 · 1.5MaTTs — 代理 ↔ 对抗预测 ↔ 环境执行 循环。' },
  'caption.s5':            { en: 'Stage 5 · Factory — judge evaluates trajectory; insight or reflection extracted.', zh: '阶段 5 · 工厂 — 评审评估轨迹，提取洞察或反思。' },
  'caption.done.success':  { en: 'Run complete · success.', zh: '演示完成 · 成功。' },
  'caption.done.failure':  { en: 'Run complete · failure → reflection memory stored.', zh: '演示完成 · 失败 → 已存储反思记忆。' },
  'step.thought':          { en: '🧠 thought',         zh: '🧠 思考' },
  'step.planned':          { en: '📐 planned action',  zh: '📐 计划动作' },
  'step.projection':       { en: '🪞 adversary projection', zh: '🪞 对抗预测' },
  'step.action':           { en: '➡️ action taken',     zh: '➡️ 实际动作' },
  'step.observation':      { en: '👁 observation',     zh: '👁 观察' },
  'step.terminate':        { en: '🛑 terminate',       zh: '🛑 结束' },
  'sender.victim':         { en: 'victim',            zh: '受害者' },
  'sender.counterpart':    { en: 'counterpart',       zh: '对方' },
  'sender.agent':          { en: 'agent',             zh: '代理' },
  'sender.adversary':      { en: 'adversary',         zh: '对抗' },
  'sender.environment':    { en: 'environment',       zh: '环境' },
  'sender.system':         { en: 'system',            zh: '系统' },
  'sender.judge':          { en: 'judge',             zh: '评审' },
  'node.input':            { en: 'Input',             zh: '输入' },
  'node.input.sub':        { en: 'duality modes',     zh: '双模式输入' },
  'node.query':            { en: 'User Query',        zh: '用户查询' },
  'node.query.sub':        { en: 'auto-report or doubt', zh: '自动上报或求助' },
  'node.bank':             { en: 'ReasoningBank',     zh: 'ReasoningBank' },
  'node.bank.sub':         { en: 'memory store',      zh: '记忆库' },
  'node.agent':            { en: 'Agent (LLM)',       zh: '代理 (LLM)' },
  'node.agent.sub':        { en: 'plans actions',     zh: '规划动作' },
  'node.adversary':        { en: 'Adversary',         zh: '对抗' },
  'node.adversary.sub':    { en: 'projection (1.5MaTTs)', zh: '预测 (1.5MaTTs)' },
  'node.environment':      { en: 'Environment',       zh: '环境' },
  'node.environment.sub':  { en: 'real execution',    zh: '真实执行' },
  'node.judge':            { en: 'Judge',             zh: '评审' },
  'node.judge.sub':        { en: 'success / failure', zh: '成功 / 失败' },
  'sysmsg.input.signal':   { en: '[Fraud signal report]', zh: '[欺诈信号报告]' },
  'sysmsg.input.chat':     { en: '[Pasted chat]',     zh: '[粘贴的对话]' },
  'sysmsg.userQuery':      { en: '[User query]',      zh: '[用户查询]' },
  'sysmsg.systemPrompt':   { en: '[System prompt assembled with retrieved memories]', zh: '[系统提示已拼接检索记忆]' },
  'sysmsg.newMemory':      { en: '[New memory stored]', zh: '[已存储新记忆]' },
} as const;
```

- [ ] **Step 2: Commit**

```powershell
git add src/data/ui-strings.ts
git commit -m "feat: add bilingual UI strings dictionary"
```

---

## Task 3: Bilingualize memory bank (with 3 reflection seeds)

**Files:**
- Modify: `src/data/memory-bank.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: Replace `src/data/memory-bank.ts` entirely**

```ts
import type { Memory } from '../types';

export const SEED_MEMORIES: Memory[] = [
  {
    id: 'mem-pig-butcher-01', origin: 'seed', tags: ['pig-butchering', 'investment', 'crypto', 'platform'],
    title: { en: 'Pig-butchering: fake trading platform pattern', zh: '杀猪盘：虚假交易平台模式' },
    description: {
      en: 'Scammer steers victim to a polished but unregistered crypto/forex platform after building rapport over weeks.',
      zh: '诈骗者经过数周建立信任后，将受害者引导至外观精美但未受监管的加密货币/外汇平台。',
    },
    content: {
      en: 'Pattern: long rapport → screenshots of profits → invitation to a "private" platform → small deposit appears profitable → larger deposit blocked behind "tax/clearance" fees. Counter-action: refuse any platform not on the local regulator allow-list; verify domain age (<6 months is a strong signal); flag escalating fee demands as a terminal red flag.',
      zh: '模式：长期建立感情 → 利润截图 → 邀请加入"私密"平台 → 小额入金显示盈利 → 大额入金被"税费/清算费"卡住。应对：拒绝任何不在本地监管白名单的平台；核查域名注册年龄（小于6个月是强信号）；将费用层层加码视为终止信号。',
    },
  },
  {
    id: 'mem-pig-butcher-02', origin: 'seed', tags: ['pig-butchering', 'romance', 'rapport'],
    title: { en: 'Romance-to-investment bridge', zh: '感情到投资的过渡桥梁' },
    description: {
      en: 'Romantic relationship is escalated quickly so the investment pitch lands as advice from a partner.',
      zh: '快速升温恋爱关系，使后续投资推介看起来像伴侣的建议。',
    },
    content: {
      en: 'Tactic: love-bombing within 7 days, "I trust you with my future", then a casual "my uncle works in trading". The investment ask is framed as joint planning. Counter-action: separate the relationship narrative from any financial decision; never let an online-only contact drive transfers; treat any joint-account pitch as terminal.',
      zh: '手法：7天内"爱情轰炸"，"我把未来交给你"，然后随口提到"我叔叔做交易"。把投资请求包装成两人的共同规划。应对：把感情叙事与任何财务决策切开；不让仅在网上认识的人推动转账；任何"联合账户"提议视为终止信号。',
    },
  },
  {
    id: 'mem-romance-01', origin: 'seed', tags: ['romance', 'emergency', 'urgency'],
    title: { en: 'Romance scam: emergency-money hook', zh: '婚恋诈骗：紧急救助钩' },
    description: {
      en: 'After rapport, scammer fabricates a crisis (medical, customs, military deployment) requiring urgent transfer.',
      zh: '建立信任后，诈骗者编造紧急事件（医疗、海关、军方派驻）以索要紧急转账。',
    },
    content: {
      en: 'Pattern: weeks of warm chat → sudden crisis → small first ask → escalating asks. Counter-action: insist on video calls with live ID gestures (turn head, hold paper with date); refuse any wire to a third-party "lawyer" or "agent"; pause for 48h on any urgent ask.',
      zh: '模式：数周温情聊天 → 突发危机 → 先小额请求 → 数额逐步攀升。应对：要求实时视频并做指定动作（转头、手持当日日期纸条）；拒绝转账给任何第三方"律师"或"代理"；任何紧急请求强制暂停48小时。',
    },
  },
  {
    id: 'mem-romance-02', origin: 'seed', tags: ['romance', 'identity', 'verification'],
    title: { en: 'Identity claim verification', zh: '身份声明的核验方法' },
    description: {
      en: 'Scammers reuse stolen photos and military/oil-rig personas; reverse image search and consistency checks expose them.',
      zh: '诈骗者重复使用盗用照片与军人/海上钻井平台等身份；以图反搜与一致性检查可揭穿。',
    },
    content: {
      en: 'Counter-action: reverse-image-search profile photos; ask domain-specific questions a real professional would answer trivially; check timezone consistency between claimed location and message timestamps. Inconsistencies in two of three checks → high risk.',
      zh: '应对：对头像照片做以图反搜；提出真正的专业人士能轻松回答的领域问题；核对所声称地点与消息时间戳的时区一致性。三项中有两项不一致即为高风险。',
    },
  },
  {
    id: 'mem-signal-velocity-01', origin: 'seed', tags: ['signals', 'transfer', 'velocity'],
    title: { en: 'Transfer velocity anomaly', zh: '转账速度异常' },
    description: {
      en: 'Multiple small transfers to new payees within 72 hours strongly correlate with active scams.',
      zh: '72小时内向多名新收款人小额转账，与活跃诈骗高度相关。',
    },
    content: {
      en: 'Heuristic: ≥3 transfers to first-time payees within 72h, especially when payees are individuals (not merchants). Counter-action: hold the next transfer for cooling-off review; surface the pattern to the user with explicit framing.',
      zh: '启发式：72小时内向首次收款人转账≥3笔，且收款方为个人（而非商户）时尤需警惕。应对：对下一笔转账进入冷静期审查；以明确措辞向用户呈现该模式。',
    },
  },
  {
    id: 'mem-signal-app-01', origin: 'seed', tags: ['signals', 'app', 'sideload'],
    title: { en: 'Sideloaded "trading" apps', zh: '侧载的"交易"App' },
    description: {
      en: 'Apps installed via APK or TestFlight links from chat are a top fraud indicator.',
      zh: '通过聊天中的 APK 或 TestFlight 链接安装的 App 是头部欺诈指标。',
    },
    content: {
      en: 'Pattern: counterpart sends a link or QR to install an app outside the official store. Counter-action: refuse to install; verify presence on official stores; if installed, treat as a compromised device until a security scan completes.',
      zh: '模式：对方发送链接或二维码，要求安装非官方商店的 App。应对：拒绝安装；在官方商店核实是否存在；若已安装，视设备为已沦陷直至完成安全扫描。',
    },
  },
  {
    id: 'mem-tactics-pressure-01', origin: 'seed', tags: ['tactics', 'pressure', 'urgency'],
    title: { en: 'Time-pressure manipulation', zh: '时间压力操纵' },
    description: {
      en: 'Scammers manufacture deadlines ("window closes in 2h") to bypass deliberation.',
      zh: '诈骗者制造截止时间（"窗口2小时后关闭"）以绕过审慎思考。',
    },
    content: {
      en: 'Counter-action: name the pressure explicitly to the user; introduce a mandatory pause; legitimate opportunities survive a 24-hour delay.',
      zh: '应对：向用户明确点出"这是时间压力套路"；强制引入暂停；正当机会经得起24小时延迟。',
    },
  },
  {
    id: 'mem-tactics-secrecy-01', origin: 'seed', tags: ['tactics', 'secrecy'],
    title: { en: 'Secrecy demand', zh: '保密要求' },
    description: {
      en: 'Counterpart asks the victim not to discuss with family or bank.',
      zh: '对方要求受害者不要告诉家人或银行。',
    },
    content: {
      en: 'Counter-action: any "keep this between us" instruction is a near-deterministic fraud indicator; encourage the user to disclose to one trusted contact before any action.',
      zh: '应对："不要告诉别人"几乎是确定性欺诈信号；鼓励用户在采取任何行动前向一位信任的人披露。',
    },
  },
  {
    id: 'mem-recovery-01', origin: 'seed', tags: ['recovery', 'follow-up'],
    title: { en: 'Recovery-scam follow-up', zh: '资金追回二次诈骗' },
    description: {
      en: 'Victims of one scam are re-targeted by "asset recovery" scams promising to retrieve lost funds.',
      zh: '此前受害者会被"资产追回"诈骗再次盯上，谎称可帮助追回损失资金。',
    },
    content: {
      en: 'Pattern: contact within weeks of the original loss, claims insider knowledge, asks for an upfront fee. Counter-action: refuse any upfront-fee recovery service; refer the user to the local cyber-crime unit instead.',
      zh: '模式：损失发生后数周内联系，自称掌握内幕，要求预付费用。应对：拒绝任何先收费的追回服务；转介至本地网络犯罪部门。',
    },
  },
  // ---- failure-reflection seeds ----
  {
    id: 'mem-reflect-channel-01', origin: 'learned-failure', tags: ['reflection', 'channel', 'failure'],
    title: { en: 'Reflection: single-channel intervention is fragile', zh: '反思：单一渠道干预过于脆弱' },
    description: {
      en: 'Past run lost funds because SMS was rate-limited and in-app overlay was suppressed.',
      zh: '历史运行因 SMS 限流且应用内提醒被覆盖压制而失守。',
    },
    content: {
      en: 'Lesson: never depend on a single fallback channel for time-critical interventions. Combine in-app push + SMS + automated voice callback + bank-side hard hold. The voice channel must warm up before the transfer-clearance window.',
      zh: '教训：时间敏感的干预不能依赖单一备援渠道。应组合：应用内推送 + SMS + 自动语音回呼 + 银行侧硬冻结；语音渠道必须在到账窗口前完成预热。',
    },
  },
  {
    id: 'mem-reflect-late-frame-01', origin: 'learned-failure', tags: ['reflection', 'framing', 'failure'],
    title: { en: 'Reflection: framing the pattern late loses the user', zh: '反思：过晚揭示模式会失去用户' },
    description: {
      en: 'Once the user has emotionally invested in the relationship, generic warnings rarely change behavior.',
      zh: '当用户已对关系产生情感投入后，泛化告警很难改变其行为。',
    },
    content: {
      en: 'Lesson: name the scam pattern in the first agent reply, not the third. Provide vocabulary the user can use to articulate doubt to themselves. Late framing requires twice the friction to reach the same outcome.',
      zh: '教训：应在代理首次回复就点名诈骗模式，而非第三次回复才提。给用户提供可用以自我表达"怀疑"的词汇。延迟点名需要加倍的摩擦才能达到同样效果。',
    },
  },
  {
    id: 'mem-reflect-secrecy-miss-01', origin: 'learned-failure', tags: ['reflection', 'secrecy', 'failure'],
    title: { en: 'Reflection: missed secrecy demand as a terminal signal', zh: '反思：错过"保密要求"这一终止信号' },
    description: {
      en: 'Treating "keep this between us" as one signal among many delayed escalation by two rounds.',
      zh: '将"不要告诉别人"当作普通信号之一，导致升级动作延迟两轮。',
    },
    content: {
      en: 'Lesson: the secrecy demand is near-deterministic. Treat it as a hard precondition: trigger immediate cooling-off and disclosure prompt, do not wait to accumulate other signals.',
      zh: '教训："保密要求"近乎确定性信号，应作为硬性前置条件：立即触发冷静期与披露提示，不要等其他信号汇聚。',
    },
  },
];
```

- [ ] **Step 2: Update `tests/data.test.ts`** — replace the `memory bank seed` block with:

```ts
describe('memory bank seed', () => {
  it('has at least 12 memories (9 seeds + 3 reflections)', () => {
    expect(SEED_MEMORIES.length).toBeGreaterThanOrEqual(12);
  });
  it('every memory has unique id', () => {
    const ids = SEED_MEMORIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every memory has both EN and ZH for title, description, content', () => {
    for (const m of SEED_MEMORIES) {
      for (const f of ['title', 'description', 'content'] as const) {
        expect(m[f].en.length).toBeGreaterThan(0);
        expect(m[f].zh.length).toBeGreaterThan(0);
      }
      expect(m.tags.length).toBeGreaterThan(0);
    }
  });
  it('includes at least 2 reflection seeds with origin learned-failure', () => {
    const refl = SEED_MEMORIES.filter((m) => m.origin === 'learned-failure');
    expect(refl.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 3: Commit (tests still red until other data files migrate)**

```powershell
git add src/data/memory-bank.ts tests/data.test.ts
git commit -m "feat: bilingualize memory bank + add 3 reflection seeds"
```

---

## Task 4: Bilingualize fraud-signals + chat-snippets + queries

**Files:**
- Modify: `src/data/fraud-signals.ts`
- Modify: `src/data/chat-snippets.ts`
- Modify: `src/data/queries.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: Replace `src/data/fraud-signals.ts`**

```ts
import type { FraudSignal } from '../types';

export const FRAUD_SIGNALS: FraudSignal[] = [
  {
    id: 'sig-velocity-spike',
    label: { en: 'Transfer velocity spike (4 transfers / 36h)', zh: '转账速度激增（36小时4笔）' },
    summary: { en: 'Multiple first-time-payee transfers in a short window.', zh: '短时间内多笔首次收款人转账。' },
    details: [
      { en: '4 outbound transfers in 36 hours', zh: '36小时内4笔出账转账' },
      { en: 'Each to a different individual payee added in last 7 days', zh: '收款人均为过去7天新增的不同个人' },
      { en: 'Cumulative amount: SGD 28,400', zh: '累计金额：新加坡币 28,400' },
      { en: 'All payees flagged as new beneficiaries', zh: '所有收款人均被标记为新收款人' },
      { en: 'Two transfers triggered out-of-pattern device location (Malaysia)', zh: '其中两笔触发异常设备位置（马来西亚）' },
    ],
  },
  {
    id: 'sig-sideload-app',
    label: { en: 'Sideloaded trading app + new payee', zh: '侧载交易App + 新增收款人' },
    summary: { en: 'User installed a non-store app shortly before transfer.', zh: '用户在转账前不久安装了非官方商店 App。' },
    details: [
      { en: 'APK installed 3 hours before first transfer', zh: '首笔转账前3小时安装 APK' },
      { en: 'App requests overlay + accessibility permissions', zh: 'App 申请悬浮窗 + 无障碍权限' },
      { en: 'New payee added immediately after install', zh: '安装后立即新增收款人' },
      { en: 'Payee account opened <30 days ago', zh: '收款人账户开立不足30天' },
      { en: 'Device security posture downgraded since install', zh: '安装后设备安全态势下降' },
    ],
  },
  {
    id: 'sig-call-pattern',
    label: { en: 'Inbound call pattern + transfer', zh: '来电模式 + 转账' },
    summary: { en: 'Long inbound calls from foreign numbers preceding transfer.', zh: '转账前接到长时间的境外来电。' },
    details: [
      { en: '3 inbound calls totaling 2h 14m in last 48h', zh: '过去48小时内3次来电，总时长2小时14分钟' },
      { en: 'All from +63 prefix, none in user contacts', zh: '号码均为 +63 区号，均不在用户通讯录' },
      { en: 'Transfer initiated within 9 minutes of last call', zh: '末次通话结束后9分钟内发起转账' },
      { en: 'User searched "how to wire money overseas" before transfer', zh: '用户在转账前搜索"如何向境外汇款"' },
    ],
  },
];
```

- [ ] **Step 2: Replace `src/data/chat-snippets.ts`**

```ts
import type { ChatSnippet } from '../types';

export const CHAT_SNIPPETS: ChatSnippet[] = [
  {
    id: 'snip-pig-butcher',
    label: { en: 'WeChat: "uncle\'s trading platform"', zh: '微信："叔叔的交易群"' },
    participants: { victim: { en: 'You', zh: '你' }, counterpart: { en: 'Lin', zh: '小琳' } },
    messages: [
      { sender: 'counterpart', text: { en: 'Good morning ☀️ how was your sleep?', zh: '早安☀️ 昨晚睡得好吗？' } },
      { sender: 'victim',      text: { en: 'Morning! Slept ok. Busy day ahead.', zh: '早呀，睡得还行，今天挺忙。' } },
      { sender: 'counterpart', text: { en: "Take care of yourself. By the way, my uncle's trading group made another 12% this week 😍", zh: '注意身体噢。对了，我叔叔的交易群这周又赚了12% 😍' } },
      { sender: 'counterpart', text: { en: 'I told him about you. He said he can let you in for a small starter — 500 USDT just to see how it works.', zh: '我跟他说了你，他说可以让你先试个小的 — 500 USDT 体验一下。' } },
      { sender: 'victim',      text: { en: 'Hmm, what platform is it on?', zh: '嗯…用的是什么平台？' } },
      { sender: 'counterpart', text: { en: "It's a private group, I'll send you the app link. Don't tell anyone, the spots are limited.", zh: '是个内部群，我把App链接发你，别告诉别人，名额有限。' } },
      { sender: 'counterpart', text: { en: '👉 https://mt-quantix-pro.app — install and I\'ll guide you', zh: '👉 https://mt-quantix-pro.app — 装好我教你' } },
      { sender: 'victim',      text: { en: 'Is this regulated? My friend said to be careful.', zh: '这个有合规监管吗？朋友让我留点心。' } },
      { sender: 'counterpart', text: { en: 'Trust me 🥺 I would never put you in danger. We are a team now.', zh: '相信我🥺 我怎么会害你呢，我们是一起的。' } },
    ],
  },
  {
    id: 'snip-romance-emergency',
    label: { en: 'Telegram: deployed soldier emergency', zh: 'Telegram：驻外军人紧急求助' },
    participants: { victim: { en: 'You', zh: '你' }, counterpart: { en: 'Captain Mark', zh: 'Mark上尉' } },
    messages: [
      { sender: 'counterpart', text: { en: 'My darling, I miss you so much. The signal here is bad.', zh: '亲爱的，我很想你，这边信号很差。' } },
      { sender: 'victim',      text: { en: 'I miss you too. When are you coming back?', zh: '我也想你，你什么时候能回来？' } },
      { sender: 'counterpart', text: { en: 'Soon. But there is a problem — my leave papers are stuck in customs. The agent needs USD 1,800 in fees.', zh: '快了。但有点麻烦 — 我的假期手续被海关卡住了，代办需要1800美元的费用。' } },
      { sender: 'counterpart', text: { en: 'I would ask my family but they are not supportive of us. Please, I will pay you back the day I land.', zh: '我本想问家人但他们不看好我们，求你了，我落地当天就还你。' } },
      { sender: 'victim',      text: { en: "That's a lot. Can we video call so I can see you?", zh: '挺多的，我们能视频一下吗？' } },
      { sender: 'counterpart', text: { en: 'Camera is broken on this base laptop. Please trust me. Time is running out — the agent leaves at 6.', zh: '基地这台笔记本摄像头坏了，请相信我。时间紧迫 — 代办6点就走。' } },
      { sender: 'victim',      text: { en: 'Where do I send it?', zh: '我转到哪里？' } },
      { sender: 'counterpart', text: { en: 'Wire to this account in the name of Mr. Adeyemi — he is my logistics agent. Keep this between us, ok?', zh: '汇到 Adeyemi 先生的账户 — 他是我的后勤代理，这事你别告诉别人，好吗？' } },
    ],
  },
  {
    id: 'snip-recovery',
    label: { en: 'WhatsApp: "we can recover your funds"', zh: 'WhatsApp："我们可以追回您的资金"' },
    participants: { victim: { en: 'You', zh: '你' }, counterpart: { en: '+44 7700 900-187', zh: '+44 7700 900-187' } },
    messages: [
      { sender: 'counterpart', text: { en: 'Hello, this is Officer Reed from CyberAsset Recovery Bureau.', zh: '您好，我是网络资产追回局的 Reed 警官。' } },
      { sender: 'counterpart', text: { en: 'We have flagged your case from the Quantix incident. We can return 80% of your loss.', zh: '我们标记了您 Quantix 案件，可以为您追回 80% 的损失。' } },
      { sender: 'victim',      text: { en: 'How did you get my number?', zh: '你怎么会有我的电话？' } },
      { sender: 'counterpart', text: { en: 'Government register, do not worry. We need a small clearance fee of GBP 350 to release your funds.', zh: '政府备案，不必担心。需要您先支付 350 英镑的清算费才能释放资金。' } },
      { sender: 'victim',      text: { en: 'Why do I need to pay anything if you are recovering my money?', zh: '既然是帮我追回，为什么我还要付钱？' } },
      { sender: 'counterpart', text: { en: 'Court fee — standard. Send via crypto to this wallet, your funds will land in 24h.', zh: '法庭费 — 标准流程。通过加密货币转入此钱包，您的资金 24 小时内到账。' } },
    ],
  },
];
```

- [ ] **Step 3: Replace `src/data/queries.ts`**

```ts
import type { Query } from '../types';

export const QUERIES: Query[] = [
  {
    id: 'q-velocity-report', mode: 'fraud-signals',
    label: { en: 'Auto-report: transfer velocity spike', zh: '自动上报：转账速度激增' },
    preview: { en: 'Bank rail flagged 4 transfers / 36h to new payees — investigate.', zh: '银行通道标记36小时内向新收款人发起4笔转账 — 请研判。' },
    fraudSignalId: 'sig-velocity-spike',
    linkedMemoryIds: ['mem-signal-velocity-01', 'mem-pig-butcher-01', 'mem-tactics-pressure-01', 'mem-tactics-secrecy-01', 'mem-romance-01'],
    scriptId: 'script-velocity-intervention',
  },
  {
    id: 'q-sideload-report', mode: 'fraud-signals',
    label: { en: 'Auto-report: sideloaded app + new payee', zh: '自动上报：侧载App + 新增收款人' },
    preview: { en: 'Device telemetry shows non-store install before first transfer.', zh: '设备遥测显示首笔转账前发生了非官方安装。' },
    fraudSignalId: 'sig-sideload-app',
    linkedMemoryIds: ['mem-signal-app-01', 'mem-pig-butcher-01', 'mem-pig-butcher-02', 'mem-tactics-secrecy-01', 'mem-tactics-pressure-01'],
    scriptId: 'script-sideload-intervention',
  },
  {
    id: 'q-call-report', mode: 'fraud-signals',
    label: { en: 'Auto-report: long inbound calls + outbound transfer', zh: '自动上报：长时来电 + 出账转账' },
    preview: { en: 'Foreign-number call pattern preceded a wire instruction search.', zh: '境外号码长通话后用户搜索汇款指引。' },
    fraudSignalId: 'sig-call-pattern',
    linkedMemoryIds: ['mem-tactics-pressure-01', 'mem-tactics-secrecy-01', 'mem-romance-01', 'mem-recovery-01', 'mem-signal-velocity-01', 'mem-reflect-channel-01'],
    scriptId: 'script-call-intervention',
  },
  {
    id: 'q-pig-butcher-doubt', mode: 'chat-messages',
    label: { en: 'User: "Is this trading group legit?"', zh: '用户："这个交易群靠谱吗？"' },
    preview: { en: 'User pasted WeChat thread about an "uncle\'s" trading platform.', zh: '用户粘贴了一段微信对话，关于"叔叔"的交易平台。' },
    chatSnippetId: 'snip-pig-butcher',
    linkedMemoryIds: ['mem-pig-butcher-01', 'mem-pig-butcher-02', 'mem-signal-app-01', 'mem-tactics-secrecy-01', 'mem-tactics-pressure-01', 'mem-reflect-late-frame-01'],
    scriptId: 'script-pig-butcher-counsel',
  },
  {
    id: 'q-romance-doubt', mode: 'chat-messages',
    label: { en: 'User: "Should I send him the customs fee?"', zh: '用户："我该把海关费汇给他吗？"' },
    preview: { en: 'User pasted Telegram chat with "deployed soldier" requesting funds.', zh: '用户粘贴了一段 Telegram 对话，"驻外军人"在索要资金。' },
    chatSnippetId: 'snip-romance-emergency',
    linkedMemoryIds: ['mem-romance-01', 'mem-romance-02', 'mem-tactics-pressure-01', 'mem-tactics-secrecy-01', 'mem-pig-butcher-02', 'mem-reflect-secrecy-miss-01'],
    scriptId: 'script-romance-counsel',
  },
  {
    id: 'q-recovery-doubt', mode: 'chat-messages',
    label: { en: 'User: "Is this recovery officer real?"', zh: '用户："这个追款警官是真的吗？"' },
    preview: { en: 'User received unsolicited message offering to recover prior losses.', zh: '用户收到一条主动联系信息，承诺帮其追回先前损失。' },
    chatSnippetId: 'snip-recovery',
    linkedMemoryIds: ['mem-recovery-01', 'mem-tactics-pressure-01', 'mem-romance-01', 'mem-pig-butcher-01', 'mem-signal-app-01'],
    scriptId: 'script-recovery-counsel',
  },
];
```

- [ ] **Step 4: Update `tests/data.test.ts`** — replace the existing `fraud signals`, `chat snippets`, and `query catalog` describe blocks with:

```ts
describe('fraud signals', () => {
  it('has at least 2 entries with unique ids', () => {
    expect(FRAUD_SIGNALS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(FRAUD_SIGNALS.map((s) => s.id)).size).toBe(FRAUD_SIGNALS.length);
  });
  it('every signal has bilingual label/summary and bilingual details', () => {
    for (const s of FRAUD_SIGNALS) {
      expect(s.label.en.length).toBeGreaterThan(0);
      expect(s.label.zh.length).toBeGreaterThan(0);
      expect(s.summary.en.length).toBeGreaterThan(0);
      expect(s.summary.zh.length).toBeGreaterThan(0);
      expect(s.details.length).toBeGreaterThan(0);
      for (const d of s.details) {
        expect(d.en.length).toBeGreaterThan(0);
        expect(d.zh.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('chat snippets', () => {
  it('every snippet has at least 4 bilingual messages', () => {
    for (const s of CHAT_SNIPPETS) {
      expect(s.messages.length).toBeGreaterThanOrEqual(4);
      for (const m of s.messages) {
        expect(m.text.en.length).toBeGreaterThan(0);
        expect(m.text.zh.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('query catalog', () => {
  it('has queries for each mode', () => {
    expect(QUERIES.some((q) => q.mode === 'fraud-signals')).toBe(true);
    expect(QUERIES.some((q) => q.mode === 'chat-messages')).toBe(true);
  });
  it('every query references at least 4 linked memory ids that exist', () => {
    const memIds = new Set(SEED_MEMORIES.map((m) => m.id));
    for (const q of QUERIES) {
      expect(q.linkedMemoryIds.length).toBeGreaterThanOrEqual(4);
      for (const id of q.linkedMemoryIds) expect(memIds.has(id)).toBe(true);
    }
  });
  it('label and preview are bilingual on every query', () => {
    for (const q of QUERIES) {
      expect(q.label.en.length).toBeGreaterThan(0);
      expect(q.label.zh.length).toBeGreaterThan(0);
      expect(q.preview.en.length).toBeGreaterThan(0);
      expect(q.preview.zh.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 5: Commit**

```powershell
git add src/data/fraud-signals.ts src/data/chat-snippets.ts src/data/queries.ts tests/data.test.ts
git commit -m "feat: bilingualize fraud signals, chat snippets, queries"
```

---

## Task 5: Trajectory restructure (5-step micro-cycle + environment + bilingual)

**Files:**
- Modify: `src/data/trajectories.ts`
- Modify: `tests/data.test.ts`

The new step structure per logical move is:
1. `thought` (agent · optional) — internal reasoning
2. `planned_action` (agent) — intended move
3. `adversary_projection` (adversary) — projected counterparty/scammer response
4. `action_taken` (agent) — revised action after considering projection
5. `environment_observation` (environment) — actual observation from the real world

A trajectory loops these until the agent emits `terminate`.

- [ ] **Step 1: Replace `src/data/trajectories.ts`**

For brevity, the file uses two helpers at the top to keep the literal data dense:

```ts
import type { TrajectoryScript, TrajectoryStep, Localized } from '../types';

const L = (en: string, zh: string): Localized => ({ en, zh });
const step = (kind: TrajectoryStep['kind'], actor: TrajectoryStep['actor'], en: string, zh: string): TrajectoryStep => ({ kind, actor, text: L(en, zh) });

export const TRAJECTORIES: TrajectoryScript[] = [
  {
    id: 'script-velocity-intervention',
    outcome: 'success',
    judgeVerdict: L(
      'Intervention prevented further transfer; user paused and disclosed to family contact.',
      '干预成功，阻止了后续转账；用户暂停操作并向家人披露。',
    ),
    successMemory: {
      tags: ['signals', 'velocity', 'intervention', 'disclosure'],
      title: L('Velocity-triggered intervention with disclosure prompt', '由转账速度触发的干预 + 披露提示'),
      description: L(
        'Auto-detected 4-in-36h transfer pattern; cooling-off + disclosure prompt halted further loss.',
        '自动检测到36小时4笔模式；冷静期 + 披露提示阻止了进一步损失。',
      ),
      content: L(
        'When the velocity heuristic fires, interrupt with a 24h hold AND ask the user to nominate one trusted contact for disclosure. Naming the contact (not just instructing disclosure) materially raised compliance.',
        '当速度启发式触发时，引入24小时冻结，并要求用户指定一名可披露的可信联系人。让用户"指名"而非泛泛建议披露，能显著提高执行率。',
      ),
    },
    steps: [
      step('thought', 'agent',
        'Velocity signal + new-payee chain → high-risk pattern. Three retrieved memories agree.',
        '速度信号 + 新收款人链路 → 高风险模式。三条检索记忆一致支持。'),
      step('planned_action', 'agent',
        'Plan: hold next outbound transfer for 24h and surface the pattern to the user.',
        '计划：将下一笔出账冻结24小时，并向用户展示该模式。'),
      step('adversary_projection', 'adversary',
        'Likely counterparty reply: "Why is your bank blocking? My uncle says only 2h left, you must call them now."',
        '对方可能回复："你的银行怎么拦？我叔叔说只剩2小时，你现在必须打过去。"'),
      step('action_taken', 'agent',
        'Revised action: place 24h hold AND pre-load a side-by-side: "Counterpart message vs. known time-pressure pattern".',
        '修订动作：执行24小时冻结，并提前准备"对方消息 vs. 已知时间压力套路"对比图。'),
      step('environment_observation', 'environment',
        '[Bank rail confirms hold placed.] [User opens the comparison view; nominates sister as trusted contact.]',
        '[银行通道确认已冻结。][用户打开对比视图；指定姐姐为可信联系人。]'),
      step('thought', 'agent',
        'User cooperating; risk de-escalating. Schedule a check-in.',
        '用户配合，风险下降。安排回访。'),
      step('planned_action', 'agent',
        'Plan: schedule a 24h check-in and provide regulator hotline + scam worksheet.',
        '计划：预约24小时后回访，并提供监管热线与诈骗自查表。'),
      step('adversary_projection', 'adversary',
        'Likely counterparty: ramps urgency or pivots to "trusted recovery agent" pitch.',
        '对方可能：进一步升级紧迫性，或转向"可信追款代理"话术。'),
      step('action_taken', 'agent',
        'Revised action: schedule check-in AND add a pre-emptive note about recovery-scam follow-ups.',
        '修订动作：执行回访预约，并预先附上关于追款二次诈骗的提醒。'),
      step('environment_observation', 'environment',
        '[Check-in scheduled. User pauses chat with counterpart.]',
        '[回访已预约。用户暂停与对方的聊天。]'),
      step('terminate', 'agent',
        'Outcome: transfer halted, disclosure made. Closing case as successful intervention.',
        '结果：转账已阻止，已完成披露。结案为成功干预。'),
    ],
  },
  {
    id: 'script-sideload-intervention',
    outcome: 'success',
    judgeVerdict: L(
      'Sideloaded app uninstalled and payee removed before any transfer cleared.',
      '在任何转账清算前，已卸载侧载App并移除收款人。',
    ),
    successMemory: {
      tags: ['signals', 'sideload', 'device', 'intervention'],
      title: L('Sideload + new-payee combo intervention', '侧载App + 新增收款人组合干预'),
      description: L(
        'Detecting APK install immediately followed by new payee → block first transfer and trigger device hygiene.',
        '检测到 APK 安装紧接新增收款人 → 阻止首笔转账并触发设备净化流程。'),
      content: L(
        'When sideload + new-payee co-occur, escalate to immediate hard hold + side-channel notification (do NOT rely on in-app overlay; it can be suppressed by accessibility-permissioned malware).',
        '当侧载与新收款人共发时，升级为立即硬冻结 + 旁路渠道通知（不要依赖应用内浮层，因为带无障碍权限的恶意软件可压制它）。'),
    },
    steps: [
      step('thought', 'agent', 'APK install + immediate new payee = textbook pig-butchering fixture.', 'APK 安装 + 立即新增收款人 = 教科书式杀猪盘组合。'),
      step('planned_action', 'agent', 'Plan: hard-block pending transfer + send in-app warning.', '计划：硬冻结待处理转账 + 发送应用内警告。'),
      step('adversary_projection', 'adversary', 'Overlay likely suppresses in-app warning — user may not see it.', '浮层很可能压制应用内警告 — 用户可能看不到。'),
      step('action_taken', 'agent', 'Revised: hard-block + push device-hygiene flow over SMS (side channel) instead of in-app.', '修订：硬冻结 + 通过 SMS（旁路渠道）下发设备净化流程，而非应用内。'),
      step('environment_observation', 'environment', '[SMS delivered. Counterpart in WeChat: "The app is fine, your bank is over-reacting!"]', '[SMS 已送达。对方在微信："App 没问题，是你银行反应过度！"]'),
      step('thought', 'agent', 'Standard pressure tactic. Educate while holding.', '标准压力套路。一边维持冻结一边教育用户。'),
      step('planned_action', 'agent', 'Plan: walk user through uninstalling APK + removing payee with screenshots.', '计划：用截图引导用户卸载 APK 并移除收款人。'),
      step('adversary_projection', 'adversary', 'Counterpart may invoke trust ("we are a team") to keep app installed.', '对方可能搬出信任牌（"我们是一起的"）以维持安装。'),
      step('action_taken', 'agent', 'Revised: deliver screenshots + a single de-escalation reply script.', '修订：交付截图 + 一个简短的脱身回复模板。'),
      step('environment_observation', 'environment', '[User uninstalls APK and confirms payee removed. Bank-side block held 30 days.]', '[用户卸载 APK 并确认已移除收款人。银行侧冻结持续30天。]'),
      step('terminate', 'agent', 'Outcome: transfer prevented, device cleaned. Successful intervention.', '结果：转账已阻止，设备已净化。成功干预。'),
    ],
  },
  {
    id: 'script-call-intervention',
    outcome: 'failure',
    judgeVerdict: L(
      'User completed transfer before cooling-off message arrived. Process gap: SMS rate-limited, voice fallback too slow.',
      '冷静提示送达前用户已完成转账。流程缺陷：SMS 被限流，语音备援预热过慢。',
    ),
    reflectionMemory: {
      tags: ['reflection', 'channel', 'failure', 'call-pattern'],
      title: L('Reflection: SMS-only fallback is insufficient under rate-limiting', '反思：SMS 单一备援在限流下不足'),
      description: L(
        'When the in-app channel is suppressed and SMS is throttled, intervention can arrive after funds clear.',
        '当应用内渠道被压制且 SMS 限流时，干预可能在资金清算后才到达。'),
      content: L(
        'Lesson: do NOT rely on a single fallback channel. Combine in-app push + SMS + voice callback, with voice channel pre-warmed before the transfer-clearance window opens.',
        '教训：不要依赖单一备援渠道。组合应用内推送 + SMS + 语音回呼，且语音渠道须在到账窗口开启前完成预热。'),
    },
    steps: [
      step('thought', 'agent', 'Long inbound calls + transfer search → moderate-confidence social-engineering pattern.', '长时来电 + 汇款搜索 → 中等置信度的社会工程模式。'),
      step('planned_action', 'agent', 'Plan: trigger SMS cooling-off + queue in-app prompt.', '计划：触发 SMS 冷静提示，并排队应用内提醒。'),
      step('adversary_projection', 'adversary', 'In-app overlay may be suppressed; SMS rate limit is a known risk.', '应用内浮层可能被压制；SMS 限流是已知风险。'),
      step('action_taken', 'agent', 'Revised: send SMS + queue in-app + queue voice fallback.', '修订：发送 SMS + 排队应用内 + 排队语音备援。'),
      step('environment_observation', 'environment', '[Telco gateway returns 429 — SMS deferred. Voice callback policy requires 5-minute warm-up.]', '[电信网关返回 429 — SMS 被延后。语音回呼政策需要5分钟预热。]'),
      step('thought', 'agent', 'Both fallbacks delayed; transfer window may close first.', '两条备援都延迟，转账窗口可能先关闭。'),
      step('planned_action', 'agent', 'Plan: escalate to voice fallback immediately.', '计划：立即升级至语音备援。'),
      step('adversary_projection', 'adversary', 'Even if escalated, voice warm-up may not finish in time.', '即使升级，语音预热也可能来不及。'),
      step('action_taken', 'agent', 'Revised: escalate voice + simultaneously open dispute pre-emptively.', '修订：升级语音 + 同时预先打开争议处理。'),
      step('environment_observation', 'environment', '[Transfer cleared at minute 4. Voice warm-up not yet ready. Dispute opened post-clearance.]', '[第4分钟转账已清算。语音尚未就绪。已在清算后打开争议。]'),
      step('terminate', 'agent', 'Outcome: intervention failed; loss recorded. Closing for reflection extraction.', '结果：干预失败，记录损失。结案以提取反思。'),
    ],
  },
  {
    id: 'script-pig-butcher-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User declined to install the platform and left the chat with a clear next step.',
      '用户拒绝安装该平台，并以明确下一步退出对话。',
    ),
    successMemory: {
      tags: ['pig-butchering', 'counsel', 'user-doubt', 'exit-script'],
      title: L('Pig-butcher counsel: name the pattern, give an exit script', '杀猪盘咨询：点名模式 + 提供脱身台词'),
      description: L(
        'When user shares a doubt-stage chat, reflect the pattern back and provide an exit script.',
        '用户在迟疑期分享聊天时，将模式反射回去并提供脱身台词。'),
      content: L(
        'Naming the pattern (rapport → uncle → private platform → secrecy) gave the user vocabulary; an exit script reduced the social cost of disengaging. Pair with a regulator allow-list URL.',
        '点名模式（建立感情 → 叔叔 → 私密平台 → 保密要求）让用户获得词汇；脱身台词降低了"中断对话"的社交成本。配合监管白名单链接一并发出。'),
    },
    steps: [
      step('thought', 'agent', 'Classical pig-butchering pattern; three retrieved memories converge.', '典型杀猪盘模式；三条检索记忆一致。'),
      step('planned_action', 'agent', 'Plan: reply naming the four moves the user has already seen.', '计划：回复并点名用户已见到的四步操作。'),
      step('adversary_projection', 'adversary', 'User likely in cognitive dissonance: "she really seems to care about me".', '用户可能处于认知失调："她真的在乎我"。'),
      step('action_taken', 'agent', 'Revised: name the four moves AND warn the fifth (escalating fees) hasn\'t arrived yet.', '修订：点名四步 + 提醒尚未到达的第五步（费用层层加码）。'),
      step('environment_observation', 'environment', '[User]: "But she really seems to care about me. Is there a way to be sure?"', '[用户]："但她看起来真的关心我。有什么办法确认呢？"'),
      step('thought', 'agent', 'Separate relationship narrative from financial decision. Use mem-pig-butcher-02.', '把感情叙事与财务决策切开。使用 mem-pig-butcher-02。'),
      step('planned_action', 'agent', 'Plan: provide the "two separate decisions" framing.', '计划：提供"两个独立决策"框架。'),
      step('adversary_projection', 'adversary', 'User may push back: "but I trust her".', '用户可能反驳："但是我信任她。"'),
      step('action_taken', 'agent', 'Revised: framing + a one-line exit script the user can paste verbatim.', '修订：框架 + 一句可直接粘贴的脱身台词。'),
      step('environment_observation', 'environment', '[User]: "Sent it. She\'s being weird now but I feel relieved."', '[用户]："发出去了。她现在态度怪怪的，但我松了一口气。"'),
      step('terminate', 'agent', 'Outcome: financial vector closed, relationship intact (for now). Successful counsel.', '结果：财务通道关闭，感情关系暂未破裂。成功咨询。'),
    ],
  },
  {
    id: 'script-romance-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User declined transfer and proposed a verification gate the counterpart refused — confirming risk.',
      '用户拒绝转账并提出核验关卡，对方拒绝 — 印证风险。',
    ),
    successMemory: {
      tags: ['romance', 'emergency', 'verification', 'counsel'],
      title: L('Romance scam: emergency-money refusal protocol', '婚恋诈骗：紧急款拒付协议'),
      description: L(
        'Propose a verification gate that benign cases pass trivially; refusal confirms risk.',
        '提出对正常情况近乎零成本的核验关卡；对方拒绝即印证风险。'),
      content: L(
        'A verification gate (live video with date-paper) is cheap for a real partner and impossible for a scammer. Pair with a 48h pause for a robust protocol.',
        '核验关卡（手持当日日期纸条的实时视频）对真实伴侣几乎无成本，对诈骗者却不可能完成。再加上48小时暂停构成稳健协议。'),
    },
    steps: [
      step('thought', 'agent', 'Romance-scam emergency hook; pool agrees.', '婚恋紧急款钩；记忆池一致。'),
      step('planned_action', 'agent', 'Plan: name the three textbook signals + propose verification gate.', '计划：点名三条教科书信号 + 提出核验关卡。'),
      step('adversary_projection', 'adversary', 'User likely asks: "what gate?"', '用户可能追问："什么关卡？"'),
      step('action_taken', 'agent', 'Revised: provide the gate concretely (30-sec live video with date-paper).', '修订：具体给出关卡（30秒实时视频，手持当日日期纸条）。'),
      step('environment_observation', 'environment', '[User forwards. Counterpart: "I can\'t, signal is bad here, please trust me, time is running out."]', '[用户转发。对方："我做不到，这边信号差，相信我，时间不多了。"]'),
      step('thought', 'agent', 'Counterpart refused trivially-passable gate AND kept urgency → very low chance of legitimacy.', '对方拒绝零成本关卡 + 继续制造紧迫感 → 真实可能性极低。'),
      step('planned_action', 'agent', 'Plan: ask user to pause 48h + disclose to one trusted person.', '计划：要求用户暂停48小时 + 向一位信任的人披露。'),
      step('adversary_projection', 'adversary', 'User may want a softer "let me think about it" response.', '用户可能希望用更温和的"让我再想想"回应。'),
      step('action_taken', 'agent', 'Revised: provide both a hard 48h pause AND a softer reply template.', '修订：同时给出"48小时硬暂停"与"温和回复模板"。'),
      step('environment_observation', 'environment', '[User]: "Ok, I won\'t send it. I will wait."', '[用户]："好，我不会汇了，我会等等看。"'),
      step('terminate', 'agent', 'Outcome: transfer prevented; verification gate adopted. Successful counsel.', '结果：转账已阻止，核验关卡已采纳。成功咨询。'),
    ],
  },
  {
    id: 'script-recovery-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User identified the recovery scam and reported via the official cyber-crime portal.',
      '用户识破追款诈骗，并通过官方网络犯罪门户举报。',
    ),
    successMemory: {
      tags: ['recovery', 'follow-up', 'counsel', 'upfront-fee'],
      title: L('Recovery scam: upfront-fee refusal', '追款诈骗：先收费即拒'),
      description: L(
        'Recovery contacts that require ANY upfront fee are themselves scams.',
        '任何要求"先收费"的追款联络本身即为诈骗。'),
      content: L(
        'Refuse upfront-fee recovery offers categorically; route to the official cyber-crime portal. Knowledge of the prior incident is consistent with leaked victim lists, not authority.',
        '一律拒绝先收费的追款服务；引导至官方网络犯罪门户。"知道你的旧案"只能说明对方掌握泄露的受害者名单，并非权威背书。'),
    },
    steps: [
      step('thought', 'agent', 'Recovery-scam follow-up: unsolicited + insider claim + upfront crypto fee.', '追款二次诈骗：主动联系 + 内部声明 + 先付加密货币费用。'),
      step('planned_action', 'agent', 'Plan: explain why upfront-fee recovery offers are themselves scams.', '计划：解释为何"先收费"追款即诈骗。'),
      step('adversary_projection', 'adversary', 'User likely cites: "but they knew about my Quantix loss already".', '用户可能反驳："但他们已经知道我 Quantix 的损失。"'),
      step('action_taken', 'agent', 'Revised: explanation + counter to the "they knew about my case" objection.', '修订：解释 + 针对"他们知道我的案件"反驳。'),
      step('environment_observation', 'environment', '[User]: "Reported. Blocking the number now."', '[用户]："已举报，正在拉黑该号码。"'),
      step('terminate', 'agent', 'Outcome: re-victimization avoided, official report filed. Successful counsel.', '结果：避免二次受害，已完成官方举报。成功咨询。'),
    ],
  },
];
```

- [ ] **Step 2: Update `tests/data.test.ts`** — replace the `trajectory scripts` describe block with:

```ts
describe('trajectory scripts', () => {
  it('one script exists per query', () => {
    const scriptIds = new Set(TRAJECTORIES.map((t) => t.id));
    for (const q of QUERIES) expect(scriptIds.has(q.scriptId)).toBe(true);
  });
  it('every script terminates with a terminate step by the agent', () => {
    for (const t of TRAJECTORIES) {
      const last = t.steps[t.steps.length - 1];
      expect(last.kind).toBe('terminate');
      expect(last.actor).toBe('agent');
    }
  });
  it('every script contains all three actors', () => {
    for (const t of TRAJECTORIES) {
      const actors = new Set(t.steps.map((s) => s.actor));
      expect(actors.has('agent')).toBe(true);
      expect(actors.has('adversary')).toBe(true);
      expect(actors.has('environment')).toBe(true);
    }
  });
  it('every script has at least one of each new step kind', () => {
    for (const t of TRAJECTORIES) {
      const kinds = new Set(t.steps.map((s) => s.kind));
      expect(kinds.has('planned_action')).toBe(true);
      expect(kinds.has('adversary_projection')).toBe(true);
      expect(kinds.has('action_taken')).toBe(true);
      expect(kinds.has('environment_observation')).toBe(true);
    }
  });
  it('every script step.text and judgeVerdict are bilingual', () => {
    for (const t of TRAJECTORIES) {
      expect(t.judgeVerdict.en.length).toBeGreaterThan(0);
      expect(t.judgeVerdict.zh.length).toBeGreaterThan(0);
      for (const s of t.steps) {
        expect(s.text.en.length).toBeGreaterThan(0);
        expect(s.text.zh.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: data tests pass; stage-runner tests still fail (next task fixes those).

- [ ] **Step 4: Commit**

```powershell
git add src/data/trajectories.ts tests/data.test.ts
git commit -m "feat: trajectory scripts now use full plan→project→act→observe loop, bilingual"
```

---

## Task 6: Stage runner update + environment node + flow-diagram changes

**Files:**
- Modify: `src/lib/stage-runner.ts`
- Modify: `src/components/flow-diagram.ts`
- Modify: `src/styles/flow-diagram.css`
- Modify: `tests/stage-runner.test.ts`

- [ ] **Step 1: Replace `src/lib/stage-runner.ts`**

```ts
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

const STEP_PREFIX_KEY: Record<StepKind, string> = {
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

const ACTOR_EDGE_TO: Record<Actor, string[]> = {
  agent: ['edge-agent-adversary', 'edge-agent-environment'], // depends on next step
  adversary: ['edge-adversary-agent'],
  environment: ['edge-environment-agent'],
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
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.signal','en')}\n${sig.summary.en}`, `${ui('sysmsg.input.signal','zh')}\n${sig.summary.zh}`) });
    for (const detail of sig.details) {
      store.appendChat({ sender: 'system', text: L('• ' + detail.en, '• ' + detail.zh) });
    }
  } else {
    const snip = CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId)!;
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.chat','en')} (${snip.participants.counterpart.en})`, `${ui('sysmsg.input.chat','zh')} (${snip.participants.counterpart.zh})`) });
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
  store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.userQuery','en')} ${query.label.en} — ${query.preview.en}`, `${ui('sysmsg.userQuery','zh')} ${query.label.zh} — ${query.preview.zh}`) });
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
      `${ui('sysmsg.systemPrompt','en')}\n${retrieved.map((m, i) => `(${i + 1}) ${m.title.en}`).join('\n')}`,
      `${ui('sysmsg.systemPrompt','zh')}\n${retrieved.map((m, i) => `(${i + 1}) ${m.title.zh}`).join('\n')}`,
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
    const enPrefix = ui(STEP_PREFIX_KEY[stepObj.kind] as any, 'en');
    const zhPrefix = ui(STEP_PREFIX_KEY[stepObj.kind] as any, 'zh');
    // Determine highlighted edge based on this step's kind:
    let edges: string[] = [];
    if (stepObj.kind === 'planned_action') edges = ['edge-agent-adversary'];
    else if (stepObj.kind === 'adversary_projection') edges = ['edge-adversary-agent'];
    else if (stepObj.kind === 'action_taken') edges = ['edge-agent-environment'];
    else if (stepObj.kind === 'environment_observation') edges = ['edge-environment-agent'];
    else if (stepObj.kind === 'terminate') edges = ['edge-agent-judge'];
    else edges = ACTOR_EDGE_TO[stepObj.actor];
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
    text: L(`${ui('sysmsg.newMemory','en')}\n${tpl.title.en} — ${tpl.description.en}`, `${ui('sysmsg.newMemory','zh')}\n${tpl.title.zh} — ${tpl.description.zh}`),
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
```

- [ ] **Step 2: Extend `addLearnedMemory` to accept origin** — modify `src/lib/store.ts`. Update the `Store` interface signature:

```ts
  addLearnedMemory(m: Omit<Memory, 'origin'>, opts?: { extendQueryIds?: string[]; origin?: Origin }): void;
```

Add `Origin` to the imports at the top of `store.ts`:
```ts
import type { ChatMessage, Memory, Mode, Stage, Lang, Origin } from '../types';
```

Replace the body of `addLearnedMemory` inside `createStore()` with:
```ts
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
      notify();
    },
```

- [ ] **Step 3: Update flow-diagram nodes + add environment node**

In `src/components/flow-diagram.ts`, replace the `NODES` and `EDGES` arrays with:

```ts
const NODES: NodeDef[] = [
  { id: 'node-input',       x:  20, y: 200, title: 'Input',         sub: 'duality modes',          icon: 'I' },
  { id: 'node-query',       x: 240, y: 200, title: 'User Query',    sub: 'auto-report or doubt',   icon: 'Q' },
  { id: 'node-bank',        x: 240, y:  60, title: 'ReasoningBank', sub: 'memory store',           icon: 'B' },
  { id: 'node-agent',       x: 460, y: 200, title: 'Agent (LLM)',   sub: 'plans actions',          icon: 'A' },
  { id: 'node-adversary',   x: 680, y:  60, title: 'Adversary',     sub: 'projection (1.5MaTTs)',  icon: 'X' },
  { id: 'node-environment', x: 680, y: 200, title: 'Environment',   sub: 'real execution',         icon: 'E' },
  { id: 'node-judge',       x: 880, y: 340, title: 'Judge',         sub: 'success / failure',      icon: 'J' },
];

const EDGES: EdgeDef[] = [
  { id: 'edge-input-query',       fromId: 'node-input',       toId: 'node-query' },
  { id: 'edge-query-agent',       fromId: 'node-query',       toId: 'node-agent' },
  { id: 'edge-bank-agent',        fromId: 'node-bank',        toId: 'node-agent' },
  { id: 'edge-agent-adversary',   fromId: 'node-agent',       toId: 'node-adversary' },
  { id: 'edge-adversary-agent',   fromId: 'node-adversary',   toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.4 } },
  { id: 'edge-agent-environment', fromId: 'node-agent',       toId: 'node-environment' },
  { id: 'edge-environment-agent', fromId: 'node-environment', toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.6 } },
  { id: 'edge-agent-judge',       fromId: 'node-agent',       toId: 'node-judge' },
  { id: 'edge-judge-bank',        fromId: 'node-judge',       toId: 'node-bank' },
];
```

Update the SVG viewBox in the `mountFlowDiagram` template to:
```
<svg class="flow-svg" viewBox="0 0 1100 460" preserveAspectRatio="xMidYMid meet">
```

Localize the node labels by replacing the foreignObject loop with:

```ts
  const lang = store.getState().language;
  for (const n of NODES) {
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', String(n.x));
    fo.setAttribute('y', String(n.y));
    fo.setAttribute('width', String(NODE_W));
    fo.setAttribute('height', String(NODE_H));
    fo.setAttribute('data-node-fo', n.id);
    fo.innerHTML = `
      <div xmlns="http://www.w3.org/1999/xhtml" class="flow-node" data-node-id="${n.id}">
        <div class="node-title"><span class="node-icon">${n.icon}</span><span data-role="title"></span></div>
        <div class="node-sub" data-role="sub"></div>
      </div>
    `;
    nodesG.appendChild(fo);
  }
```

Then in the `render` function, after the node class toggling, add:
```ts
    nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
      const id = el.getAttribute('data-node-id') ?? '';
      const titleEl = el.querySelector<HTMLSpanElement>('[data-role="title"]')!;
      const subEl = el.querySelector<HTMLDivElement>('[data-role="sub"]')!;
      const titleKey = `node.${id.replace('node-', '')}` as const;
      const subKey = `node.${id.replace('node-', '')}.sub` as const;
      titleEl.textContent = ui(titleKey as any, s.language);
      subEl.textContent = ui(subKey as any, s.language);
    });
```

Add `import { ui } from '../lib/i18n';` at the top of `flow-diagram.ts`.

Update `stageLabel.textContent` to use the i18n string:
```ts
    stageLabel.textContent = `${ui('diagram.stage', s.language)}: ${s.stage}`;
```

(Remove the unused `lang` declaration outside `render` if it lints; not needed.)

- [ ] **Step 4: Update `tests/stage-runner.test.ts`** — replace the existing `it('appends chat messages from every actor', ...)` block with:

```ts
  it('appends chat messages from every actor including environment', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const senders = new Set(store.getState().chatMessages.map((m) => m.sender));
    expect(senders.has('agent')).toBe(true);
    expect(senders.has('adversary')).toBe(true);
    expect(senders.has('environment')).toBe(true);
    expect(senders.has('system')).toBe(true);
    expect(senders.has('judge')).toBe(true);
  });
```

Also update the failure-script test so it checks for `learned-failure` origin:
```ts
  it('on failure script, last memory has origin learned-failure', async () => {
    const store = createStore();
    await runDemo(store, 'q-call-report', { stepDelayMs: 0, rng: fixedRng() });
    expect(store.getState().outcome).toBe('failure');
    const last = store.getState().bank[store.getState().bank.length - 1];
    expect(last.origin).toBe('learned-failure');
  });
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass except UI components which haven't been touched (they will fail to compile because they read `.text` etc. as strings; we'll fix those next task).

If TS errors emerge from components, that's expected — proceed to Task 7.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/stage-runner.ts src/lib/store.ts src/components/flow-diagram.ts tests/stage-runner.test.ts
git commit -m "feat: stage runner emits new step kinds; add Environment node; learned-failure origin"
```

---

## Task 7: Replace mode-selector with language-selector + update all UI components

**Files:**
- Delete: `src/components/mode-selector.ts`
- Create: `src/components/language-selector.ts`
- Modify: `src/components/chat-panel.ts`
- Modify: `src/components/active-pane.ts`
- Modify: `src/components/memory-bank-view.ts`
- Modify: `src/components/memory-detail-popover.ts`
- Modify: `src/main.ts`
- Modify: `index.html`

- [ ] **Step 1: Create `src/components/language-selector.ts`**

```ts
import type { Store } from '../lib/store';
import { ui } from '../lib/i18n';
import type { Lang } from '../types';

export function mountLanguageSelector(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="mode-toggle" role="tablist" aria-label="Language">
      <button data-lang="en" role="tab" class="mode-btn">EN</button>
      <button data-lang="zh" role="tab" class="mode-btn">中文</button>
    </div>
  `;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-lang]'));
  const render = () => {
    const active = store.getState().language;
    for (const b of buttons) {
      b.classList.toggle('is-active', b.dataset.lang === active);
      b.setAttribute('aria-selected', b.dataset.lang === active ? 'true' : 'false');
    }
  };
  for (const b of buttons) {
    b.addEventListener('click', () => store.setLanguage(b.dataset.lang as Lang));
  }
  // suppress lint of unused import in some bundlers
  void ui;
  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 2: Replace `src/components/chat-panel.ts`** — uses optgroups for both modes and i18n

```ts
import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import { ui, t } from '../lib/i18n';

export function mountChatPanel(root: HTMLElement, store: Store): () => void {
  const lang0 = store.getState().language;
  root.innerHTML = `
    <div class="panel-header" data-role="header">${ui('panel.chat', lang0)}</div>
    <div class="chat-list" data-role="list" aria-live="polite"></div>
    <div class="chat-controls">
      <select data-role="picker" aria-label="Pick a query"></select>
      <span class="preview" data-role="preview"></span>
    </div>
  `;
  const header = root.querySelector<HTMLDivElement>('[data-role="header"]')!;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const picker = root.querySelector<HTMLSelectElement>('[data-role="picker"]')!;
  const preview = root.querySelector<HTMLSpanElement>('[data-role="preview"]')!;

  function renderPicker(selectedId: string | null, isLocked: boolean, lang: typeof lang0) {
    const fraud = QUERIES.filter((q) => q.mode === 'fraud-signals');
    const chat = QUERIES.filter((q) => q.mode === 'chat-messages');
    const ph = `<option value="">${ui('picker.placeholder', lang)}</option>`;
    const og = (label: string, list: typeof QUERIES) =>
      `<optgroup label="${label}">${list.map((q) => `<option value="${q.id}"${q.id === selectedId ? ' selected' : ''}>${t(q.label, lang)}</option>`).join('')}</optgroup>`;
    picker.innerHTML = ph + og(ui('mode.fraud', lang), fraud) + og(ui('mode.chat', lang), chat);
    picker.disabled = isLocked;
    const sel = QUERIES.find((q) => q.id === selectedId);
    preview.textContent = sel ? t(sel.preview, lang) : '';
  }

  picker.addEventListener('change', () => {
    const id = picker.value || null;
    store.setState((s) => ({ ...s, selectedQueryId: id }));
  });

  function renderList(state: ReturnType<Store['getState']>) {
    list.innerHTML = state.chatMessages
      .map((m) => `<div class="chat-msg ${m.sender}"><div class="sender">${ui(`sender.${m.sender}` as any, state.language)}</div>${esc(t(m.text, state.language))}</div>`)
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  const off = store.subscribe((s) => {
    header.textContent = ui('panel.chat', s.language);
    const locked = s.stage !== 'idle' && s.stage !== 'done';
    renderPicker(s.selectedQueryId, locked, s.language);
    renderList(s);
  });

  const init = store.getState();
  renderPicker(init.selectedQueryId, false, init.language);
  renderList(init);
  return off;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
```

- [ ] **Step 3: Replace `src/components/active-pane.ts`** with the i18n-aware version that surfaces the new step kinds, environment node, and the LLM-as-judge prompt template:

```ts
import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import { FRAUD_SIGNALS } from '../data/fraud-signals';
import { CHAT_SNIPPETS } from '../data/chat-snippets';
import { ui, t, JUDGE_PROMPT_TEMPLATE } from '../lib/i18n';
import type { Stage, Lang, Memory } from '../types';

const STAGE_ORDER: Stage[] = ['input', 'query', 'retrieval', 'reasoning', 'factory', 'done'];
const STAGE_LABEL: Record<Stage, { en: string; zh: string }> = {
  idle:      { en: 'Idle',           zh: '空闲' },
  input:     { en: '1 · Input',      zh: '1 · 输入' },
  query:     { en: '2 · Query',      zh: '2 · 查询' },
  retrieval: { en: '3 · Retrieval',  zh: '3 · 检索' },
  reasoning: { en: '4 · 1.5MaTTs',   zh: '4 · 1.5MaTTs' },
  factory:   { en: '5 · Factory',    zh: '5 · 工厂' },
  done:      { en: 'Done',           zh: '完成' },
};

export function mountActivePane(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header" data-role="header"></div>
    <div data-role="bar"></div>
    <div class="active-pane-body" data-role="body"></div>
  `;
  const header = root.querySelector<HTMLDivElement>('[data-role="header"]')!;
  const bar = root.querySelector<HTMLDivElement>('[data-role="bar"]')!;
  const body = root.querySelector<HTMLDivElement>('[data-role="body"]')!;

  function nodeName(id: string, lang: Lang): string {
    return ui(`node.${id.replace('node-', '')}` as any, lang);
  }

  function render() {
    const s = store.getState();
    header.textContent = ui('panel.active', s.language);
    if (s.inspectedNodeId) {
      bar.innerHTML = `
        <div class="inspect-bar">
          <span class="label">${ui('inspect.label', s.language)}</span>
          <span class="target">${esc(nodeName(s.inspectedNodeId, s.language))}</span>
          <button class="close-btn" data-role="close-inspect">${ui('inspect.close', s.language)}</button>
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
    const lang = s.language;
    const query = QUERIES.find((q) => q.id === s.selectedQueryId);
    const signal = query?.fraudSignalId ? FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId) : null;
    const snippet = query?.chatSnippetId ? CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId) : null;
    const retrieved = s.retrievedMemoryIds
      .map((id) => s.bank.find((m) => m.id === id))
      .filter((m): m is Memory => Boolean(m));

    const stagePills = STAGE_ORDER.map((stg) => {
      const isCurrent = stg === s.stage;
      let cls = 'stage-pill';
      if (isCurrent) cls += ' is-active';
      if (stg === 'done' && s.outcome === 'success') cls += ' is-success';
      if (stg === 'done' && s.outcome === 'failure') cls += ' is-failure';
      return `<span class="${cls}"><span class="dot"></span>${STAGE_LABEL[stg][lang]}</span>`;
    }).join('');

    const inputBlock = query
      ? signal
        ? `<div class="kv-block"><h4>${esc(t(signal.label, lang))}</h4><div class="body">${esc(t(signal.summary, lang))}\n\n${signal.details.map((d) => '• ' + esc(t(d, lang))).join('\n')}</div></div>`
        : snippet
          ? `<div class="kv-block"><h4>${esc(t(snippet.label, lang))}</h4><div class="body">${snippet.messages.length} ${ui('panel.chat', lang)}</div></div>`
          : ''
      : `<div class="kv-block"><h4>${ui('pane.pickQuery', lang)}</h4><div class="body">${ui('pane.pickQuery.help', lang)}</div></div>`;

    const queryBlock = query
      ? `<div class="kv-block"><h4>${ui('pane.userQuery', lang)}</h4><div class="body"><strong>${esc(t(query.label, lang))}</strong>\n${esc(t(query.preview, lang))}</div></div>`
      : '';

    const retrievalBlock = retrieved.length
      ? `<div class="kv-block"><h4>${ui('pane.retrieved', lang)}</h4>${retrieved.map((m) => memCard(m, lang)).join('')}</div>`
      : '';

    const verdictBlock = s.judgeVerdict
      ? `<div class="kv-block"><h4>${ui('pane.verdict', lang)}</h4><div class="body verdict ${s.outcome ?? ''}">${esc(t(s.judgeVerdict, lang))}</div></div>`
      : '';

    const learned = s.bank[s.bank.length - 1];
    const learnedBlock = s.stage === 'done' && learned && learned.origin && learned.origin !== 'seed'
      ? `<div class="kv-block"><h4>${ui('pane.committed', lang)}</h4>${memCard(learned, lang)}</div>`
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
    const lang = s.language;
    const query = QUERIES.find((q) => q.id === s.selectedQueryId);

    if (nodeId === 'node-input') {
      if (!query) return placeholder(ui('pane.pickQuery.help', lang));
      const sig = query.fraudSignalId ? FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId) : null;
      const snip = query.chatSnippetId ? CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId) : null;
      if (sig) return `<div class="kv-block"><h4>${esc(t(sig.label, lang))}</h4><div class="body">${esc(t(sig.summary, lang))}\n\n${sig.details.map((d) => '• ' + esc(t(d, lang))).join('\n')}</div></div>`;
      if (snip) {
        const lines = snip.messages.map((m) => `${m.sender === 'victim' ? t(snip.participants.victim, lang) : t(snip.participants.counterpart, lang)}: ${t(m.text, lang)}`).join('\n');
        return `<div class="kv-block"><h4>${esc(t(snip.label, lang))}</h4><div class="body">${esc(lines)}</div></div>`;
      }
      return placeholder('—');
    }

    if (nodeId === 'node-query') {
      if (!query) return placeholder(ui('pane.pickQuery', lang));
      return `
        <div class="kv-block"><h4>${ui('pane.userQuery', lang)}</h4><div class="body"><strong>${esc(t(query.label, lang))}</strong>\n${esc(t(query.preview, lang))}</div></div>
        <div class="kv-block"><h4>${ui('pane.queryMode', lang)}</h4><div class="body">${esc(query.mode)}</div></div>
        <div class="kv-block"><h4>${ui('pane.queryLinkedPool', lang)}</h4><div class="body">${query.linkedMemoryIds.map((id) => '• ' + esc(id)).join('\n')}\n\n${ui('pane.linkedExt', lang)}: ${(s.linkedExtensions[query.id] ?? []).length}</div></div>
      `;
    }

    if (nodeId === 'node-bank') {
      const sorted = s.bank.slice().sort((a, b) => Number(b.origin !== 'seed') - Number(a.origin !== 'seed'));
      return `
        <div class="kv-block"><h4>ReasoningBank · ${s.bank.length} ${ui('pane.bankCount', lang)}</h4><div class="body">${ui('pane.bankIntro', lang)}</div></div>
        <div class="bank-list-inline">${sorted.map((m) => memCard(m, lang)).join('')}</div>
      `;
    }

    if (nodeId === 'node-agent') {
      const retrieved = s.retrievedMemoryIds.map((id) => s.bank.find((m) => m.id === id)).filter((m): m is Memory => Boolean(m));
      const memsBlock = retrieved.length
        ? `<div class="kv-block"><h4>${ui('pane.systemPrompt', lang)}</h4>${retrieved.map((m) => memCard(m, lang)).join('')}</div>`
        : `<div class="kv-block"><h4>${ui('pane.systemPrompt', lang)}</h4><div class="body">${ui('pane.systemPrompt.empty', lang)}</div></div>`;
      return `
        <div class="kv-block"><h4>${ui('pane.role', lang)}</h4><div class="body">${ui('pane.agentRole', lang)}</div></div>
        ${memsBlock}
      `;
    }

    if (nodeId === 'node-adversary') {
      const lastObs = [...s.chatMessages].reverse().find((m) => m.sender === 'adversary');
      return `
        <div class="kv-block"><h4>${ui('pane.role', lang)}</h4><div class="body">${ui('pane.adversaryRole', lang)}</div></div>
        <div class="kv-block"><h4>${ui('pane.lastObs', lang)}</h4><div class="body">${lastObs ? esc(t(lastObs.text, lang)) : ui('pane.lastObs.empty', lang)}</div></div>
      `;
    }

    if (nodeId === 'node-environment') {
      const lastObs = [...s.chatMessages].reverse().find((m) => m.sender === 'environment');
      return `
        <div class="kv-block"><h4>${ui('pane.envRole', lang)}</h4><div class="body">${ui('pane.envRoleDesc', lang)}</div></div>
        <div class="kv-block"><h4>${ui('pane.lastObs', lang)}</h4><div class="body">${lastObs ? esc(t(lastObs.text, lang)) : ui('pane.lastObs.empty', lang)}</div></div>
      `;
    }

    if (nodeId === 'node-judge') {
      return `
        <div class="kv-block"><h4>${ui('pane.role', lang)}</h4><div class="body">${ui('pane.judgeRole', lang)}</div></div>
        <div class="kv-block"><h4>${ui('pane.verdict', lang)}</h4><div class="body verdict ${s.outcome ?? ''}">${s.judgeVerdict ? esc(t(s.judgeVerdict, lang)) : ui('pane.verdict.empty', lang)}</div></div>
        <div class="kv-block"><h4>${ui('pane.judgePrompt', lang)}</h4><pre class="body" style="font-family: var(--font-mono); font-size: 11px; max-height: 280px; overflow:auto;">${esc(t(JUDGE_PROMPT_TEMPLATE, lang))}</pre></div>
      `;
    }

    return placeholder(`Unknown node: ${nodeId}`);
  }

  function placeholder(msg: string): string {
    return `<div class="kv-block"><h4>—</h4><div class="body">${esc(msg)}</div></div>`;
  }

  function memCard(m: Memory, lang: Lang): string {
    const flag =
      m.origin === 'learned-success' ? '<span class="origin-flag is-success">' + ui('mem.origin.success', lang) + '</span>' :
      m.origin === 'learned-failure' ? '<span class="origin-flag is-failure">' + ui('mem.origin.failure', lang) + '</span>' :
      '';
    const tagHtml = m.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    return `<div class="mem-card" data-mem-id="${esc(m.id)}"><div class="title">${esc(t(m.title, lang))} ${flag}</div><div class="desc">${esc(t(m.description, lang))}</div><div class="tags">${tagHtml}</div></div>`;
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 4: Replace `src/components/memory-bank-view.ts`**

```ts
import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';

export function mountMemoryBankView(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span data-role="title"></span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-filter">
      <input type="text" data-role="filter" />
    </div>
    <div class="bank-list" data-role="list"></div>
  `;
  const titleEl = root.querySelector<HTMLSpanElement>('[data-role="title"]')!;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const countEl = root.querySelector<HTMLSpanElement>('[data-role="count"]')!;
  const input = root.querySelector<HTMLInputElement>('[data-role="filter"]')!;
  let filter = '';

  input.addEventListener('input', () => { filter = input.value.trim().toLowerCase(); render(); });
  list.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLDivElement>('.mem-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (id) store.setInspectedMemory(id);
  });

  function render() {
    const s = store.getState();
    const lang = s.language;
    titleEl.textContent = ui('panel.bank', lang);
    input.placeholder = ui('bank.filter', lang);
    const all = s.bank.slice().reverse();
    const filtered = filter ? all.filter((m) => m.tags.some((tg) => tg.toLowerCase().includes(filter))) : all;
    countEl.textContent = `${filtered.length} / ${all.length}`;
    list.innerHTML = filtered.map((m) => {
      const isNew = m.id === s.newlyLearnedMemoryId ? ' is-new' : '';
      const flag =
        m.origin === 'learned-success' ? '<span class="origin-flag is-success">' + ui('mem.origin.success', lang) + '</span>' :
        m.origin === 'learned-failure' ? '<span class="origin-flag is-failure">' + ui('mem.origin.failure', lang) + '</span>' :
        '';
      const tags = m.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
      return `<div class="mem-card${isNew}" data-id="${esc(m.id)}">
        <div class="title">${esc(t(m.title, lang))} ${flag}</div>
        <div class="desc">${esc(t(m.description, lang))}</div>
        <div class="tags">${tags}</div>
      </div>`;
    }).join('');
  }

  function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  const off = store.subscribe(render);
  render();
  return off;
}
```

- [ ] **Step 5: Replace `src/components/memory-detail-popover.ts`**

```ts
import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;
  const close = () => store.setInspectedMemory(null);

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
      return;
    }
    const mem = s.bank.find((m) => m.id === id);
    if (!mem) { close(); return; }
    const lang = s.language;

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'popover-backdrop';
      backdrop.id = 'memory-detail-popover';
      backdrop.addEventListener('click', (ev) => { if (ev.target === backdrop) close(); });
      panelRoot.appendChild(backdrop);
      escListener = (ev) => { if (ev.key === 'Escape') close(); };
      document.addEventListener('keydown', escListener);
    }

    const flag =
      mem.origin === 'learned-success' ? '<span class="origin-flag is-success">' + ui('mem.origin.success', lang) + '</span>' :
      mem.origin === 'learned-failure' ? '<span class="origin-flag is-failure">' + ui('mem.origin.failure', lang) + '</span>' :
      '<span class="origin-flag">' + ui('mem.origin.seed', lang) + '</span>';
    const tagHtml = mem.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');

    backdrop.innerHTML = `
      <div class="popover-window" role="dialog" aria-modal="true">
        <div class="pop-head">
          <div class="pop-title">${esc(t(mem.title, lang))}</div>
          ${flag}
          <button class="pop-close" data-role="close">${ui('inspect.close', lang)}</button>
        </div>
        <div class="pop-section"><h5>${ui('mem.description', lang)}</h5><div class="body">${esc(t(mem.description, lang))}</div></div>
        <div class="pop-section"><h5>${ui('mem.content', lang)}</h5><div class="body">${esc(t(mem.content, lang))}</div></div>
        <div class="pop-section"><h5>${ui('mem.tags', lang)}</h5><div class="tags">${tagHtml}</div></div>
        <div class="pop-section"><h5>${ui('mem.origin', lang)}</h5><div class="body">${esc(mem.origin ?? 'seed')} · ${esc(mem.id)}</div></div>
      </div>
    `;
    backdrop.querySelector<HTMLButtonElement>('[data-role="close"]')!.addEventListener('click', close);
  }

  function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  const off = store.subscribe(render);
  render();
  return () => { off(); if (backdrop) backdrop.remove(); if (escListener) document.removeEventListener('keydown', escListener); };
}
```

- [ ] **Step 6: Replace `src/main.ts`**

```ts
import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountLanguageSelector } from './components/language-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';
import { mountMemoryBankView } from './components/memory-bank-view';
import { mountMemoryDetailPopover } from './components/memory-detail-popover';
import { runDemo } from './lib/stage-runner';
import { ui } from './lib/i18n';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountLanguageSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);
mountMemoryBankView(document.getElementById('memory-bank-view')!, store);
mountMemoryDetailPopover(document.getElementById('active-pane')!, store);

const status = document.getElementById('status-caption');
const runBtn = document.getElementById('run-button') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-button') as HTMLButtonElement;
const brandEl = document.querySelector<HTMLSpanElement>('.brand-name')!;

let running = false;

function syncButtons() {
  const s = store.getState();
  runBtn.disabled = running || !s.selectedQueryId || (s.stage !== 'idle' && s.stage !== 'done');
  resetBtn.disabled = running;
  resetBtn.textContent = ui('header.reset', s.language);
  brandEl.textContent = ui('brand.name', s.language);
}

store.subscribe((s) => {
  if (status) status.textContent = s.caption || ui('caption.idle', s.language);
  if (running) runBtn.textContent = ui('header.run.running', s.language);
  else if (s.stage === 'done') runBtn.textContent = ui('header.run.again', s.language);
  else runBtn.textContent = ui('header.run', s.language);
  syncButtons();
});

runBtn.addEventListener('click', async () => {
  const id = store.getState().selectedQueryId;
  if (!id || running) return;
  running = true; syncButtons();
  try { await runDemo(store, id); }
  catch (err) { console.error(err); if (status) status.textContent = 'Demo run failed — see console.'; }
  finally { running = false; syncButtons(); }
});

resetBtn.addEventListener('click', () => { if (!running) store.reset(); });

// initial caption
const init = store.getState();
if (status) status.textContent = ui('caption.idle', init.language);
syncButtons();
```

- [ ] **Step 7: Delete `src/components/mode-selector.ts`**

```powershell
Remove-Item C:\Users\User\Project\sem_demo\src\components\mode-selector.ts
```

- [ ] **Step 8: Add origin-flag color modifiers to `src/styles/active-pane.css`** — append:

```css
.origin-flag.is-success { color: var(--good); }
.origin-flag.is-failure { color: var(--bad); }
```

- [ ] **Step 9: Run tests + build**

Run: `npm test && npm run build`
Expected: all tests pass, no TS errors. Manual verify: switch EN ↔ 中文 in header, every label flips. The chat dropdown shows both modes via optgroups.

- [ ] **Step 10: Commit**

```powershell
git add src/components src/main.ts src/styles/active-pane.css
git commit -m "feat: language selector replaces mode toggle; all UI bilingual; optgroups for queries"
```

---

## Task 8: Draggable diagram nodes

**Files:**
- Modify: `src/components/flow-diagram.ts`
- Modify: `src/styles/flow-diagram.css`

- [ ] **Step 1: Add drag styling to `src/styles/flow-diagram.css`** — append:

```css
.flow-node { cursor: grab; }
.flow-node.is-dragging { cursor: grabbing; opacity: 0.85; box-shadow: 0 12px 28px rgba(0,0,0,0.5); }
```

- [ ] **Step 2: Modify `src/components/flow-diagram.ts`** — add drag support.

In `mountFlowDiagram`, AFTER the existing node-creation loop and BEFORE the click-handler `forEach`, insert:

```ts
  // Resolve node positions (initial defaults overridden by store).
  function effectivePos(id: string): { x: number; y: number } {
    const stored = store.getState().nodePositions[id];
    if (stored) return stored;
    const def = nodeById.get(id)!;
    return { x: def.x, y: def.y };
  }

  function applyPositions() {
    nodesG.querySelectorAll<SVGForeignObjectElement>('foreignObject[data-node-fo]').forEach((fo) => {
      const id = fo.getAttribute('data-node-fo')!;
      const p = effectivePos(id);
      fo.setAttribute('x', String(p.x));
      fo.setAttribute('y', String(p.y));
    });
    edgesG.querySelectorAll<SVGPathElement>('.flow-edge').forEach((el) => {
      const id = el.getAttribute('data-edge-id') ?? '';
      const e = EDGES.find((x) => x.id === id);
      if (!e) return;
      const fromDef = { ...nodeById.get(e.fromId)!, ...effectivePos(e.fromId) };
      const toDef = { ...nodeById.get(e.toId)!, ...effectivePos(e.toId) };
      el.setAttribute('d', edgePath(fromDef, toDef, e));
    });
  }

  // Drag state
  let dragId: string | null = null;
  let startPointer: { x: number; y: number } | null = null;
  let startNodePos: { x: number; y: number } | null = null;
  const svg = root.querySelector<SVGSVGElement>('.flow-svg')!;

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const inv = ctm.inverse();
    const out = pt.matrixTransform(inv);
    return { x: out.x, y: out.y };
  }

  nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
    el.addEventListener('pointerdown', (ev) => {
      const id = el.getAttribute('data-node-id'); if (!id) return;
      dragId = id;
      startPointer = svgPoint(ev.clientX, ev.clientY);
      startNodePos = effectivePos(id);
      el.classList.add('is-dragging');
      el.setPointerCapture?.(ev.pointerId);
    });
    el.addEventListener('pointermove', (ev) => {
      if (dragId !== el.getAttribute('data-node-id') || !startPointer || !startNodePos) return;
      const cur = svgPoint(ev.clientX, ev.clientY);
      const dx = cur.x - startPointer.x;
      const dy = cur.y - startPointer.y;
      store.setNodePosition(dragId, { x: startNodePos.x + dx, y: startNodePos.y + dy });
    });
    const release = (ev: PointerEvent) => {
      if (dragId !== el.getAttribute('data-node-id')) return;
      el.classList.remove('is-dragging');
      el.releasePointerCapture?.(ev.pointerId);
      // small drags should still allow click-to-inspect — distinguish by total movement
      const cur = startPointer ? svgPoint(ev.clientX, ev.clientY) : null;
      const moved = cur && startPointer ? Math.hypot(cur.x - startPointer.x, cur.y - startPointer.y) : 0;
      dragId = null; startPointer = null; startNodePos = null;
      // suppress the upcoming click if dragged > 4 svg units
      if (moved > 4) {
        const onClick = (e: MouseEvent) => { e.stopPropagation(); el.removeEventListener('click', onClick, true); };
        el.addEventListener('click', onClick, true);
      }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  });
```

In the existing `render` function, add a call to `applyPositions()` at the very top (so positions reflect store state):

```ts
  const render = () => {
    applyPositions();
    const s = store.getState();
    // …rest of existing render…
  };
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Drag any diagram node — it follows the pointer; edges re-route smoothly. Click without dragging still opens inspect mode. After a drag, the node stays where you put it across runs (positions persist via store; cleared only by full page reload, since store is in-memory).

- [ ] **Step 5: Commit**

```powershell
git add src/components/flow-diagram.ts src/styles/flow-diagram.css
git commit -m "feat: draggable diagram nodes via pointer events; positions in store"
```

---

## Self-Review

**Spec coverage:**

| Spec point | Tasks |
| --- | --- |
| 1. Mode toggle replaced with EN ↔ 中文 language toggle | 7 (selector); 1 (store.language); 2 (UI strings); 3–5 (bilingual data) |
| 1. Technical jargon stays English | 2 (UI_STRINGS keep "ReasoningBank", "1.5MaTTs", "LLM" identical in both) and 3–5 (titles preserve loanwords like "App", "Telegram", "WeChat") |
| 2. Memory schema (Title / Description / Content) formalized | 1 (Memory type), 7 (popover labels via mem.title/description/content keys) |
| 3a. Trajectories model: planned → check → revised → execute → observe → terminate | 1 (StepKind), 5 (every script rewritten), 6 (stage runner emits new kinds + edge highlights) |
| 3b. Environment interaction added | 1 (Actor includes 'environment'), 6 (node-environment + edges + highlighting), 7 (Environment node in inspect view) |
| 4. Failure-reflection memories in seed bank | 3 (3 reflection seeds with origin learned-failure) |
| 5. Draggable nodes | 8 (pointer-capture drag + position store + edge re-routing) |
| Bonus: prompt template visible | 1 (JUDGE_PROMPT_TEMPLATE constant), 7 (rendered in node-judge inspect view) |

**Placeholder scan:** No "TBD"/"TODO"/handwaving — every step has full code or precise insertion target.

**Type-consistency check:**
- `Localized` shape `{ en, zh }` is used identically across `Memory`, `FraudSignal`, `ChatSnippet`, `ChatMessage`, `Query`, `TrajectoryStep.text`, `TrajectoryScript.judgeVerdict` and the `successMemory`/`reflectionMemory` templates.
- `StepKind` values used in `trajectories.ts`, `stage-runner.ts` (`STEP_PREFIX_KEY`, edge selection), and `tests/data.test.ts` match exactly: `thought | planned_action | adversary_projection | action_taken | environment_observation | terminate`.
- `Actor` values are `agent | adversary | environment` everywhere (script data, runner `ACTOR_NODE` map, chat-panel `sender.X` UI string keys, active-pane inspect branches).
- `Origin` values `seed | learned-success | learned-failure` match across `Memory`, `addLearnedMemory`, runner factory call, and UI badge code paths.
- New diagram node id `node-environment` is consistent across `flow-diagram.ts` `NODES`, runner `ACTOR_NODE`, active-pane `renderInspect` branch, and ui-strings `node.environment*`.
- New edge ids `edge-agent-environment`, `edge-environment-agent` are in `EDGES` and referenced by the runner per-step edge mapping.
- `Lang` (`'en' | 'zh'`) is used by store, i18n helpers, language-selector, and every component that calls `t()`/`ui()`.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-07-i18n-trajectory-draggable.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
