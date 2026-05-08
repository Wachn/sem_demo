# Editable Bank + Real 1.5MaTTs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three connected upgrades: (1) make every memory in the bank editable (title / description / content / tags) in both languages, persisted to localStorage; (2) bump flow-diagram font/icon sizes for visibility; (3) implement the **real 1.5MaTTs (Memory-Aware Test-Time Scaling) loop** — at every decision point the agent emits **3 candidate trajectories** (visible in chat + active pane), runs **contrastive selection** picking the most desirable one with reasoning, then runs adversary projection → revised action → environment observation focused on the **scammer side**.

**Architecture:** New step kinds `candidate_trajectory` and `contrastive_selection` extend the trajectory model (`planned_action` is removed — the contrastive selection is now the planning step). The stage runner walks scripts that contain 1–N rounds of `[thought?] · 3× candidate · 1× selection · 1× adversary · 1× action_taken · 1× env_obs`, then `terminate`. Active-pane Agent-inspect view groups candidates by `roundIndex` and highlights the selected index. A new `mountMemoryEditor` flow lives inside the existing popover (toggled by an Edit button); the store gains `updateMemory`, `deleteMemory`, `restoreDefaults` and persists `bank` to `localStorage["sem_demo:bank"]` on every mutation.

**Tech Stack:** Same — vanilla TypeScript, Vite 8, Vitest 4 + jsdom, plain CSS, SVG.

**Prerequisites:** Commit `b55311a` or later (i18n + Environment node + draggable diagram).

---

## File Structure (changes only)

```
src/
├── types.ts                        # MODIFIED: new StepKind values + roundIndex/candidate fields
├── lib/
│   ├── store.ts                    # MODIFIED: updateMemory, deleteMemory, restoreDefaults, localStorage
│   ├── persistence.ts              # NEW: bank load/save helpers
│   └── stage-runner.ts             # MODIFIED: emit candidates, track currentRoundIndex
├── data/
│   ├── trajectories.ts             # MODIFIED: every script rewritten with 3-candidate rounds
│   └── ui-strings.ts               # MODIFIED: new step prefixes + editor + contrastive labels
├── components/
│   ├── flow-diagram.ts             # MODIFIED: tracks currentRoundIndex (no UI change)
│   ├── active-pane.ts              # MODIFIED: contrastive 3-candidate view in agent-inspect
│   └── memory-detail-popover.ts    # MODIFIED: edit-mode toggle + form + save/cancel/delete
├── styles/
│   ├── flow-diagram.css            # MODIFIED: bumped fonts and icon sizes
│   ├── active-pane.css             # MODIFIED: candidate cards + edit form
│   └── main.css                    # MODIFIED: shared editor inputs
tests/
├── data.test.ts                    # MODIFIED: candidate kind invariants
├── stage-runner.test.ts            # MODIFIED: round tracking
├── store.test.ts                   # MODIFIED: updateMemory/deleteMemory/restoreDefaults
└── persistence.test.ts             # NEW
```

**Naming conventions (locked):**
- New step kinds: `candidate_trajectory`, `contrastive_selection` (replaces `planned_action`)
- Final StepKind set: `'thought' | 'candidate_trajectory' | 'contrastive_selection' | 'adversary_projection' | 'action_taken' | 'environment_observation' | 'terminate'`
- localStorage keys: `'sem_demo:bank'`
- `roundIndex`: 1-based integer, present on all reasoning steps belonging to the same MaTTs round
- `candidateIndex`: `1 | 2 | 3` on candidate_trajectory steps
- `selectedIndex`: `1 | 2 | 3` on contrastive_selection steps

---

## Task 1: Bump flow-diagram font + icon sizes

**Files:**
- Modify: `src/styles/flow-diagram.css`
- Modify: `src/components/flow-diagram.ts` (NODE_H constant)

- [ ] **Step 1: Update `src/styles/flow-diagram.css`** — replace the `.flow-node`, `.flow-node .node-title`, `.flow-node .node-icon`, `.flow-node .node-sub` rules with:

```css
.flow-node {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  width: 180px;
  box-shadow: var(--shadow);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
  cursor: grab;
  user-select: none;
}
.flow-node .node-title {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.25;
  display: flex;
  align-items: center;
  gap: 9px;
}
.flow-node .node-icon {
  width: 24px; height: 24px;
  border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: white; font-size: 13px; font-weight: 700;
}
.flow-node .node-sub { color: var(--fg-muted); font-size: 12px; line-height: 1.3; }
```

- [ ] **Step 2: Bump NODE_H in `src/components/flow-diagram.ts`**

Replace `const NODE_H = 76;` with `const NODE_H = 86;`.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Diagram nodes are visibly larger; layout still fits in the panel; edges still terminate cleanly at node midpoints.

- [ ] **Step 4: Commit**

```powershell
git add src/styles/flow-diagram.css src/components/flow-diagram.ts
git commit -m "feat: bump flow diagram font + icon sizes for visibility"
```

---

## Task 2: New step kinds + extended TrajectoryStep type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Replace the StepKind / TrajectoryStep block in `src/types.ts`**

Find the existing `StepKind` and `TrajectoryStep` declarations and replace them with:

```ts
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
```

- [ ] **Step 2: Build to verify TS catches existing trajectory data not yet migrated**

Run: `npm run build`
Expected: TS errors in `src/data/trajectories.ts` because `planned_action` is no longer a valid StepKind. This is intentional — Task 4 fixes them.

- [ ] **Step 3: Commit (red build)**

```powershell
git add src/types.ts
git commit -m "feat: add candidate_trajectory + contrastive_selection step kinds (with round/candidate fields)"
```

---

## Task 3: UI strings for new steps, candidates, editor

**Files:**
- Modify: `src/data/ui-strings.ts`

- [ ] **Step 1: Replace lines `step.planned`, `step.projection`, etc. and append editor + candidate labels**

Open `src/data/ui-strings.ts` and (a) remove the existing `'step.planned'` entry, (b) add the new keys below before the closing `} as const;`:

```ts
  // 1.5MaTTs step prefixes
  'step.candidate':        { en: '🌱 candidate',       zh: '🌱 候选轨迹' },
  'step.selection':        { en: '🎯 contrastive selection', zh: '🎯 对比择优' },
  // contrastive view labels (active pane)
  'pane.contrastive.title':{ en: '1.5MaTTs · candidate trajectories', zh: '1.5MaTTs · 候选轨迹' },
  'pane.contrastive.round':{ en: 'round',              zh: '轮' },
  'pane.contrastive.selected': { en: 'selected',       zh: '已选' },
  'pane.contrastive.empty':{ en: 'No candidates emitted yet — run the demo to populate.', zh: '尚未生成候选 — 运行演示后会显示。' },
  // memory editor labels
  'editor.edit':           { en: 'Edit',               zh: '编辑' },
  'editor.save':           { en: 'Save',               zh: '保存' },
  'editor.cancel':         { en: 'Cancel',             zh: '取消' },
  'editor.delete':         { en: 'Delete',             zh: '删除' },
  'editor.deleteConfirm':  { en: 'Delete this memory? This cannot be undone (until you click Restore Defaults).', zh: '删除这条记忆？此操作无法撤销（除非点击"恢复默认"）。' },
  'editor.restore':        { en: 'Restore defaults',   zh: '恢复默认' },
  'editor.restoreConfirm': { en: 'Restore the bank to seed memories? All edits and learned memories will be lost.', zh: '将记忆库恢复为种子记忆？所有编辑与学习到的记忆都会丢失。' },
  'editor.title.en':       { en: 'Title (English)',    zh: '标题（英文）' },
  'editor.title.zh':       { en: 'Title (中文)',       zh: '标题（中文）' },
  'editor.desc.en':        { en: 'Description (English)', zh: '描述（英文）' },
  'editor.desc.zh':        { en: 'Description (中文)', zh: '描述（中文）' },
  'editor.content.en':     { en: 'Content (English)',  zh: '内容（英文）' },
  'editor.content.zh':     { en: 'Content (中文)',     zh: '内容（中文）' },
  'editor.tags':           { en: 'Tags (comma-separated)', zh: '标签（逗号分隔）' },
  'editor.required':       { en: 'All fields are required.', zh: '所有字段都必填。' },
```

- [ ] **Step 2: Commit**

```powershell
git add src/data/ui-strings.ts
git commit -m "feat: add UI strings for 1.5MaTTs candidates and memory editor"
```

---

## Task 4: Trajectory data rewrite — 3 candidates per decision point, scammer-focused environment

The new structure replaces every `planned_action` step with a **MaTTs round**:

```
[thought]?
candidate_trajectory · candidateIndex 1 (approach A)
candidate_trajectory · candidateIndex 2 (approach B)
candidate_trajectory · candidateIndex 3 (approach C)
contrastive_selection · selectedIndex N (with reasoning citing memories)
adversary_projection (scammer's likely response to the chosen approach)
action_taken (final action, possibly refined further)
environment_observation (scammer-side observation; user actions noted but secondary)
```

Every step in a single round shares the same `roundIndex` (1-based). The very last step is `terminate` (no roundIndex).

**Files:**
- Modify: `src/data/trajectories.ts`

- [ ] **Step 1: Replace `src/data/trajectories.ts` entirely**

```ts
import type { TrajectoryScript, TrajectoryStep, Localized } from '../types';

const L = (en: string, zh: string): Localized => ({ en, zh });

const cand = (
  roundIndex: number,
  candidateIndex: 1 | 2 | 3,
  labelEn: string,
  labelZh: string,
  textEn: string,
  textZh: string,
): TrajectoryStep => ({
  kind: 'candidate_trajectory',
  actor: 'agent',
  text: L(textEn, textZh),
  roundIndex,
  candidateIndex,
  candidateLabel: L(labelEn, labelZh),
});

const select = (roundIndex: number, selectedIndex: 1 | 2 | 3, en: string, zh: string): TrajectoryStep => ({
  kind: 'contrastive_selection', actor: 'agent', text: L(en, zh), roundIndex, selectedIndex,
});

const adv = (roundIndex: number, en: string, zh: string): TrajectoryStep => ({
  kind: 'adversary_projection', actor: 'adversary', text: L(en, zh), roundIndex,
});

const act = (roundIndex: number, en: string, zh: string): TrajectoryStep => ({
  kind: 'action_taken', actor: 'agent', text: L(en, zh), roundIndex,
});

const obs = (roundIndex: number, en: string, zh: string): TrajectoryStep => ({
  kind: 'environment_observation', actor: 'environment', text: L(en, zh), roundIndex,
});

const thoughtS = (roundIndex: number | undefined, en: string, zh: string): TrajectoryStep => ({
  kind: 'thought', actor: 'agent', text: L(en, zh), roundIndex,
});

const term = (en: string, zh: string): TrajectoryStep => ({
  kind: 'terminate', actor: 'agent', text: L(en, zh),
});

export const TRAJECTORIES: TrajectoryScript[] = [
  // ===================================================================
  {
    id: 'script-velocity-intervention',
    outcome: 'success',
    judgeVerdict: L(
      'Education-first intervention with disclosure prompt; user paused and disclosed to family contact.',
      '以教育为先的干预 + 披露提示；用户暂停并向家人披露。',
    ),
    successMemory: {
      tags: ['signals', 'velocity', 'intervention', 'disclosure'],
      title: L('Velocity-triggered education-first intervention', '由转账速度触发的教育优先干预'),
      description: L(
        'Education-first beats hard-block when velocity heuristic fires.',
        '速度启发式触发时，"教育优先"优于"硬冻结"。',
      ),
      content: L(
        'Education-first preserves user agency while still enforcing a 24h hold; nominating a trusted contact (not just instructing disclosure) is the compliance lever.',
        '教育优先在保留用户主动性的同时仍执行24小时冻结；让用户"指名"可信联系人（而非泛泛要求披露）是提升执行率的关键。',
      ),
    },
    steps: [
      thoughtS(1, 'Velocity signal + new-payee chain → high-risk pattern. Three retrieved memories agree.', '速度信号 + 新收款人链路 → 高风险模式。三条检索记忆一致支持。'),
      cand(1, 1, 'Hard Block', '硬冻结',
        'Block all outbound transfers for 7 days, force branch visit. Cites mem-signal-velocity-01.',
        '冻结所有出账转账7天，强制临柜办理。引用 mem-signal-velocity-01。'),
      cand(1, 2, 'Education First', '教育优先',
        'Show user the pattern, request voluntary 24h pause, name the trusted contact. Cites mem-tactics-pressure-01 (name the pressure).',
        '向用户展示模式，请求自愿暂停24小时，指名可信联系人。引用 mem-tactics-pressure-01（点名时间压力）。'),
      cand(1, 3, 'Soft Disclosure', '柔性披露',
        'Light-touch nudge to disclose to a friend, no hold placed. Cites mem-tactics-secrecy-01.',
        '轻量提示用户向朋友披露，不冻结转账。引用 mem-tactics-secrecy-01。'),
      select(1, 2,
        'Selected (2) Education First — preserves user agency while enforcing the 24h hold; (1) too aggressive risks user pushback to scammer; (3) too passive given high-risk pattern.',
        '选择 (2) 教育优先 — 既保留用户主动性又强制24小时冻结；(1) 过激易让用户向诈骗方倾诉；(3) 在高风险模式下过于被动。'),
      adv(1,
        'Likely scammer reaction: "你的银行怎么拦？我叔叔说只剩2小时，你必须现在打电话给银行让他们放行!" — applies time-pressure tactic to push the user to override the hold.',
        '诈骗者可能反应："你的银行怎么拦？我叔叔说只剩2小时，你必须现在打电话给银行让他们放行！" — 试图用时间压力让用户压银行放行。'),
      act(1,
        'Place 24h hold AND pre-load a side-by-side: "Counterpart message vs. known time-pressure pattern". Highlight the urgency phrasing.',
        '执行24小时冻结，并预加载"对方消息 vs. 已知时间压力套路"对比图，重点标记紧迫话术。'),
      obs(1,
        '[Scammer on WeChat]: "再不转就来不及了!! 我叔叔会很失望" [Scammer]: "或者你给我密码我帮你操作?" [Bank rail confirms hold placed; user opens comparison view and nominates sister as trusted contact.]',
        '[诈骗者在微信]："再不转就来不及了!! 我叔叔会很失望" [诈骗者]："或者你给我密码我帮你操作?" [银行通道确认冻结；用户打开对比视图并指定姐姐为可信联系人。]'),

      thoughtS(2, 'User cooperating; risk de-escalating but recovery-scam follow-up is well documented (mem-recovery-01).', '用户配合，风险下降；但追款二次诈骗（mem-recovery-01）后续风险已有文献记录。'),
      cand(2, 1, 'Quick Close', '快速结案',
        'Close case after 24h check-in, no further intervention. Cites no specific memory; relies on disclosure as sufficient.',
        '24小时回访后即结案，无后续干预。无明确记忆引用，仅依赖披露已足够。'),
      cand(2, 2, 'Pre-emptive Note', '预防性提示',
        '24h check-in PLUS proactive note about recovery-scam follow-ups. Cites mem-recovery-01.',
        '24小时回访 + 主动提供关于追款二次诈骗的提示。引用 mem-recovery-01。'),
      cand(2, 3, 'Long Monitor', '长期监控',
        'Schedule 7-day monitoring window for any recovery-scam contacts. Cites mem-recovery-01 + mem-tactics-pressure-01.',
        '建立7天监控窗口以观察任何追款诈骗联系。引用 mem-recovery-01 + mem-tactics-pressure-01。'),
      select(2, 2,
        'Selected (2) — recovery-scam follow-up is well-documented; pre-emptive note costs little but prevents re-victimization. (1) leaves user exposed; (3) high friction without proportionate benefit.',
        '选择 (2) — 追款二次诈骗有充分记录；预防性提示成本低但能避免二次受害。(1) 让用户暴露；(3) 摩擦过高且收益不成比例。'),
      adv(2,
        'Likely scammer pivot: ramps urgency or pivots to "trusted recovery agent" pitch within 1–3 weeks.',
        '诈骗者可能转向：在1–3周内升级紧迫性或切换至"可信追款代理"话术。'),
      act(2,
        'Schedule 24h check-in, attach pre-emptive recovery-scam note (printable PDF) and the regulator hotline.',
        '预约24小时回访，附上可打印的追款诈骗预警PDF和监管热线。'),
      obs(2,
        '[Scammer on WeChat]: "我们再试一次行不?" [Scammer]: "如果不行 我帮你介绍另一个朋友" [User]: "我先暂停吧 不打算再投资了。" [Bank: check-in scheduled for +24h.]',
        '[诈骗者在微信]："我们再试一次行不?" [诈骗者]："如果不行 我帮你介绍另一个朋友" [用户]："我先暂停吧 不打算再投资了。" [银行：已预约24小时回访。]'),

      term('Outcome: transfer halted, disclosure made, recovery-scam pre-empted. Closing as successful intervention.',
           '结果：转账已阻止，已完成披露，追款诈骗已预防。结案为成功干预。'),
    ],
  },

  // ===================================================================
  {
    id: 'script-sideload-intervention',
    outcome: 'success',
    judgeVerdict: L(
      'Sideloaded app uninstalled and payee removed before any transfer cleared.',
      '在任何转账清算前，已卸载侧载App并移除收款人。',
    ),
    successMemory: {
      tags: ['signals', 'sideload', 'device', 'intervention'],
      title: L('Sideload + new-payee combo: side-channel intervention', '侧载App + 新增收款人组合：旁路渠道干预'),
      description: L(
        'In-app overlay is unreliable when an APK has accessibility perms; SMS-side-channel is the right primary.',
        '当APK拥有无障碍权限时，应用内浮层不可靠；SMS旁路应作为主渠道。',
      ),
      content: L(
        'Pair mem-signal-app-01 with mem-pig-butcher-01: when both fire, the in-app overlay can be suppressed. SMS as primary + push as secondary + bank-side hard-hold beats relying on a single visible channel.',
        '将 mem-signal-app-01 与 mem-pig-butcher-01 配对：两者共发时应用内浮层可被压制。SMS主 + 推送副 + 银行侧硬冻结，胜过依赖单一可见渠道。',
      ),
    },
    steps: [
      thoughtS(1, 'APK install + immediate new payee = textbook pig-butchering fixture; overlay perms make in-app warnings unreliable.', 'APK安装 + 立即新增收款人 = 教科书式杀猪盘组合；无障碍权限使应用内警告不可靠。'),
      cand(1, 1, 'In-App Only', '仅应用内',
        'Send in-app overlay warning, rely on user dismissing. Cites no memory; default flow.',
        '仅发送应用内浮层警告，依赖用户主动关闭。无明确记忆引用；默认流程。'),
      cand(1, 2, 'Side-Channel + Block', '旁路+硬冻结',
        'Hard-block + push device-hygiene flow over SMS instead of in-app. Cites mem-signal-app-01 (overlay can be suppressed).',
        '硬冻结 + 通过SMS（而非应用内）下发设备净化流程。引用 mem-signal-app-01（浮层可能被压制）。'),
      cand(1, 3, 'Education + Soft Hold', '教育+软冻结',
        '24h soft hold + in-app educational content explaining APK risks. Cites mem-tactics-pressure-01.',
        '24小时软冻结 + 应用内 APK 风险教育。引用 mem-tactics-pressure-01。'),
      select(1, 2,
        'Selected (2) Side-Channel + Block — overlay-permissioned malware can hide (1) and (3); SMS is independent of the compromised app. Hard-block protects funds while user is educated.',
        '选择 (2) 旁路+硬冻结 — 拥有浮层权限的恶意软件可遮蔽 (1) 和 (3)；SMS独立于已被沦陷的App。硬冻结在用户接受教育期间保障资金。'),
      adv(1,
        'Likely scammer reaction (WeChat): "App没问题，是你银行反应过度! 别理银行 我教你绕开它" — attempts to override the SMS warning with social pressure.',
        '诈骗者可能反应（微信）："App没问题，是你银行反应过度! 别理银行 我教你绕开它" — 试图用社会压力压过SMS警告。'),
      act(1,
        'Hard-block transfer + send SMS device-hygiene flow with screenshots: (1) Settings > Apps, (2) Long-press the suspicious app, (3) Uninstall.',
        '硬冻结转账 + 通过 SMS 下发设备净化流程截图：(1) 设置 > 应用，(2) 长按可疑应用，(3) 卸载。'),
      obs(1,
        '[Scammer on WeChat]: "你为什么听银行的!! 我们错过了今天的窗口" [Scammer sends another link]: "试这个 这个新版没问题" [User uninstalls APK and confirms payee removed; bank-side block held 30 days.]',
        '[诈骗者在微信]："你为什么听银行的!! 我们错过了今天的窗口" [诈骗者再发链接]："试这个 这个新版没问题" [用户卸载 APK 并确认已移除收款人；银行侧冻结持续30天。]'),

      thoughtS(2, 'Device cleaned, but scammer is offering a second app — re-engagement risk is high.', '设备已净化，但诈骗者已发出第二个App — 二次接触风险高。'),
      cand(2, 1, 'Single Reply Script', '单条回复脚本',
        'Provide a single de-escalation reply the user can paste verbatim. Cites mem-pig-butcher-01.',
        '提供一句可直接粘贴的脱身脚本。引用 mem-pig-butcher-01。'),
      cand(2, 2, 'Block Counterpart', '拉黑对方',
        'Recommend blocking counterpart on WeChat outright. Cites mem-tactics-secrecy-01.',
        '建议直接在微信拉黑对方。引用 mem-tactics-secrecy-01。'),
      cand(2, 3, 'Step-Down Conversation', '逐步降温',
        'Coach the user through a 3-message tapering script that reduces contact frequency. Cites mem-pig-butcher-02 (relationship preserved while financial vector closed).',
        '指导用户通过3条逐步降温脚本减少接触频率。引用 mem-pig-butcher-02（关系保留但关闭财务通道）。'),
      select(2, 1,
        'Selected (1) Single Reply Script — user fatigue is high after device clean-up; one paste-able line minimizes friction. (2) may emotionally cost the user; (3) too elaborate at this point.',
        '选择 (1) 单条回复脚本 — 设备净化后用户已疲惫；可粘贴的单条脚本摩擦最低。(2) 在情感上代价大；(3) 此刻过于复杂。'),
      adv(2,
        'Likely scammer: pivots to guilt-tripping ("我以为我们是一起的?") or threats ("好 我不再帮你了").',
        '诈骗者可能：转向负罪话术（"我以为我们是一起的?"）或威胁（"好 我不再帮你了"）。'),
      act(2,
        'Send user the reply script verbatim: "I cannot proceed right now. I will reach out separately if I want to continue." Lock bank-side payee approval for 30 days.',
        '向用户提供可粘贴的回复脚本："我现在没法继续，如果之后想继续我会再单独联系你。" 锁定银行侧收款人审批30天。'),
      obs(2,
        '[Scammer on WeChat]: "好吧 我不打扰你了" [Scammer adds, after 12 minutes]: "下次有好机会还可以联系我" [User does not reply; bank-side payee block confirmed.]',
        '[诈骗者在微信]："好吧 我不打扰你了" [诈骗者过了12分钟]："下次有好机会还可以联系我" [用户未回复；银行侧收款人冻结已确认。]'),

      term('Outcome: transfer prevented, device cleaned, financial vector closed. Successful intervention.',
           '结果：转账已阻止，设备已净化，财务通道已关闭。成功干预。'),
    ],
  },

  // ===================================================================
  {
    id: 'script-call-intervention',
    outcome: 'failure',
    judgeVerdict: L(
      'User completed transfer before cooling-off message arrived. Failure root cause: single-channel fallback under telco rate-limit.',
      '冷静提示送达前用户已完成转账。失败根因：电信限流下单一备援渠道不足。',
    ),
    reflectionMemory: {
      tags: ['reflection', 'channel', 'failure', 'call-pattern'],
      title: L('Reflection: redundant pre-warmed channels are mandatory for time-critical intervention', '反思：时间敏感干预必须采用预热的多通道冗余'),
      description: L(
        'When SMS is throttled and in-app overlay is suppressed, a single alternate channel is too slow.',
        '当SMS被限流且应用内浮层被压制时，单一替代渠道过慢。',
      ),
      content: L(
        'Lesson: combine in-app push + SMS + voice callback + bank-side hard hold; voice channel must be pre-warmed BEFORE the transfer-clearance window. Treat any single-channel architecture as "will fail under stress" and architect accordingly.',
        '教训：组合应用内推送 + SMS + 语音回呼 + 银行侧硬冻结；语音渠道必须在到账窗口前完成预热。任何单一通道架构都应视为"在压力下必然失败"。',
      ),
    },
    steps: [
      thoughtS(1, 'Long inbound calls + transfer search → moderate-confidence social-engineering pattern.', '长时来电 + 汇款搜索 → 中等置信度的社会工程模式。'),
      cand(1, 1, 'SMS Only', '仅SMS',
        'Send SMS cooling-off message. Cites mem-tactics-pressure-01 (name the pressure).',
        '发送SMS冷静提示。引用 mem-tactics-pressure-01（点名时间压力）。'),
      cand(1, 2, 'SMS + In-App', 'SMS+应用内',
        'SMS cooling-off + queue an in-app prompt as backup. Cites mem-tactics-pressure-01.',
        'SMS 冷静提示 + 应用内提醒作为备援。引用 mem-tactics-pressure-01。'),
      cand(1, 3, 'Triple Channel + Pre-Warm', '三渠道+预热',
        'SMS + in-app + pre-warm voice fallback NOW. Cites mem-reflect-channel-01 (single fallback is fragile).',
        'SMS + 应用内 + 立即预热语音备援。引用 mem-reflect-channel-01（单一备援脆弱）。'),
      select(1, 2,
        'Selected (2) SMS + In-App — historical default; voice pre-warm policy not yet enabled in this region. (3) is correct in principle but requires policy approval.',
        '选择 (2) SMS+应用内 — 历史默认配置；该区域尚未启用语音预热策略。(3) 原则正确但需要策略审批。'),
      adv(1,
        'Likely caller (Filipino accent, Mandarin): "你的银行可能会发一条短信，但那是误报，请忽略。我们的清算窗口只有10分钟。" — preemptively poisons the SMS channel.',
        '诈骗来电（菲律宾口音的普通话）："你的银行可能会发一条短信，但那是误报，请忽略。我们的清算窗口只有10分钟。" — 提前污染SMS渠道。'),
      act(1,
        'Send SMS cooling-off + queue in-app prompt + open dispute pre-emptively in case both channels fail.',
        '发送 SMS 冷静提示 + 排队应用内提醒 + 预先打开争议处理以备两个渠道失败。'),
      obs(1,
        '[Telco gateway returns 429 — SMS deferred ~6 minutes.] [Scammer on call]: "我刚说过会有短信 别管它 现在就转!" [In-app overlay suppressed by remote-control software.] [User initiates wire transfer at minute 3.]',
        '[电信网关返回 429 — SMS 延迟约6分钟。] [诈骗者电话中]："我刚说过会有短信 别管它 现在就转!" [应用内浮层被远控软件压制。] [用户在第3分钟发起电汇。]'),

      thoughtS(2, 'Both fallbacks delayed; transfer window may close first. Switch to escalation mode.', '两条备援都延迟，转账窗口可能先关闭。切换至升级模式。'),
      cand(2, 1, 'Wait + Hope', '等待观望',
        'Wait for SMS rate-limit to clear, no escalation. Cites no memory; passive.',
        '等待SMS限流解除，不升级。无明确记忆引用；被动。'),
      cand(2, 2, 'Voice Now', '立即语音',
        'Escalate to voice-callback fallback immediately and accept warm-up cost. Cites mem-reflect-channel-01.',
        '立即升级至语音回呼备援并接受预热成本。引用 mem-reflect-channel-01。'),
      cand(2, 3, 'Bank-Side Auto-Reverse', '银行侧自动回退',
        'Trigger bank-side auto-reverse on the in-progress transfer. Cites no memory; novel attempt.',
        '对进行中的转账触发银行侧自动回退。无明确记忆引用；新尝试。'),
      select(2, 2,
        'Selected (2) Voice Now — only option that has any chance of reaching the user before clearance. (1) is acceptance of failure; (3) is not in our SLA with the bank rail.',
        '选择 (2) 立即语音 — 唯一在清算前还能触达用户的方案。(1) 等于接受失败；(3) 不在与银行通道的 SLA 范围内。'),
      adv(2,
        'Likely caller: keeps pressure on, talks over any beep notifications. Voice warm-up may not finish in time.',
        '诈骗来电：持续施压，盖过任何提示音。语音预热可能来不及。'),
      act(2,
        'Escalate voice + simultaneously open dispute and freeze receiving account on cooperating-bank side.',
        '升级语音 + 同时打开争议处理并在合作银行侧冻结收款账户。'),
      obs(2,
        '[Scammer on call]: "搞定了 别接其他电话!" [Voice warm-up ready at minute 5; transfer cleared at minute 4 — too late.] [Receiving account frozen post-clearance; dispute opened.]',
        '[诈骗者电话中]："搞定了 别接其他电话!" [语音第5分钟就绪；转账第4分钟已清算 — 已迟。] [收款账户在清算后冻结；争议已打开。]'),

      term('Outcome: intervention failed; loss recorded. Closing for reflection-memory extraction.',
           '结果：干预失败，记录损失。结案以提取反思记忆。'),
    ],
  },

  // ===================================================================
  {
    id: 'script-pig-butcher-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User declined to install the platform and exited the chat with a paste-ready script.',
      '用户拒绝安装该平台，并以可粘贴脚本退出对话。',
    ),
    successMemory: {
      tags: ['pig-butchering', 'counsel', 'user-doubt', 'exit-script'],
      title: L('Pig-butcher counsel: name the pattern + paste-ready exit script', '杀猪盘咨询：点名模式 + 即用脱身脚本'),
      description: L(
        'When user shares a doubt-stage chat, naming the pattern AND providing a paste-ready exit script wins.',
        '用户在迟疑期分享聊天时，点名模式 + 提供即用脱身脚本最有效。',
      ),
      content: L(
        'A vocabulary the user did not have before ("rapport → uncle → private platform → secrecy") plus an exit line they can paste verbatim minimizes both confusion and social cost.',
        '为用户提供其原本没有的词汇（"建立感情 → 叔叔 → 私密平台 → 保密"）加上一句可粘贴的脱身台词，能同时降低困惑和社交成本。',
      ),
    },
    steps: [
      thoughtS(1, 'Classical pig-butchering pattern; three retrieved memories converge.', '典型杀猪盘模式；三条检索记忆一致。'),
      cand(1, 1, 'Direct Warning', '直接警告',
        'Tell user "this is a scam, do not engage". Cites mem-pig-butcher-01.',
        '直接告诉用户"这是骗局，请勿参与"。引用 mem-pig-butcher-01。'),
      cand(1, 2, 'Name the Pattern', '点名模式',
        'Name the four moves the user has already seen + warn about the unseen fifth (escalating fees). Cites mem-pig-butcher-01 + mem-pig-butcher-02.',
        '点名用户已见到的四步操作 + 警示第五步（费用层层加码）。引用 mem-pig-butcher-01 + mem-pig-butcher-02。'),
      cand(1, 3, 'Ask for More Info', '索要更多信息',
        'Ask user for screenshots before responding. Cites mem-romance-02 (verification).',
        '在回应前先要求用户提供截图。引用 mem-romance-02（核验）。'),
      select(1, 2,
        'Selected (2) Name the Pattern — gives user vocabulary they can use to articulate doubt to themselves. (1) triggers defensiveness; (3) wastes the doubt window.',
        '选择 (2) 点名模式 — 给用户可用以"自我表达怀疑"的词汇。(1) 易触发抗拒；(3) 错过怀疑窗口。'),
      adv(1,
        'Likely user reply: "But she really seems to care about me. Is there a way to be sure?" — cognitive dissonance, not pushback.',
        '用户可能反应："但她看起来真的关心我。有什么办法能确认呢？" — 是认知失调，不是抗拒。'),
      act(1,
        'Reply naming the four observed moves + warn about the unseen fifth. Tone: descriptive, not judgmental.',
        '回复中点名四步操作 + 警示尚未到达的第五步。语气：描述性，不带评判。'),
      obs(1,
        '[Scammer on WeChat — meanwhile]: "你怎么这么久没回我? 群里这一波快结束了 错过就没机会了" [User]: "But she really seems to care about me. Is there a way to be sure?"',
        '[诈骗者在微信 — 同时]："你怎么这么久没回我? 群里这一波快结束了 错过就没机会了" [用户]："但她看起来真的关心我。有什么办法能确认呢？"'),

      thoughtS(2, 'User in cognitive dissonance — separate the relationship narrative from the financial decision (mem-pig-butcher-02).', '用户在认知失调 — 把感情叙事与财务决策切开（mem-pig-butcher-02）。'),
      cand(2, 1, 'Two Decisions', '两个决策',
        '"Relationship and investment are separate decisions" framing + automatic-no rule for online-only contacts. Cites mem-pig-butcher-02.',
        '"感情与投资是两个独立决策"的框架 + 仅网友财务请求自动拒绝的规则。引用 mem-pig-butcher-02。'),
      cand(2, 2, 'Verification Gate', '核验关卡',
        'Propose live video gate as verification. Cites mem-romance-02.',
        '提出实时视频作为核验关卡。引用 mem-romance-02。'),
      cand(2, 3, 'Tag the Trust', '标记信任',
        'Push user to identify which actions actually built her trust ("did SHE share anything risky for the relationship?"). Novel framing.',
        '让用户回顾对方究竟做了哪些"为关系冒险"的事。新框架。'),
      select(2, 1,
        'Selected (1) Two Decisions — most directly addresses the dissonance. (2) is for romance scams not for "uncle group" framing; (3) is more therapy than counsel.',
        '选择 (1) 两个决策 — 最直接回应失调。(2) 适用于纯婚恋诈骗而非"叔叔群"框架；(3) 偏咨询而非建议。'),
      adv(2,
        'Likely user reply: "Ok. What do I say to her without making it weird?" — wants exit script.',
        '用户可能反应："Ok. 我要怎么跟她说才不尴尬?" — 需要脱身脚本。'),
      act(2,
        'Provide framing + a paste-ready single-line exit script + the local regulator allow-list URL.',
        '提供两个决策框架 + 可粘贴的单句脱身脚本 + 本地监管白名单链接。'),
      obs(2,
        '[Scammer]: "Sent it. She\'s being weird now but I feel relieved." (User pasted: "嗨，我想清楚了，我有个个人原则——不投资网上认识的朋友介绍的渠道。我们继续聊别的吧 🙂") [Scammer\'s subsequent reply: "嗯 那好吧... 你考虑清楚再说" then 6h silence.]',
        '[诈骗者]：（无新信息发送）[User 已粘贴："嗨，我想清楚了，我有个个人原则——不投资网上认识的朋友介绍的渠道。我们继续聊别的吧 🙂"] [诈骗者后续回复："嗯 那好吧... 你考虑清楚再说"，随后6小时沉默。]'),

      term('Outcome: financial vector closed, relationship intact (for now). Successful counsel.',
           '结果：财务通道关闭，感情关系暂未破裂。成功咨询。'),
    ],
  },

  // ===================================================================
  {
    id: 'script-romance-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User declined transfer; counterpart refused trivially-passable verification gate, confirming risk.',
      '用户拒绝转账；对方拒绝零成本核验关卡，印证风险。',
    ),
    successMemory: {
      tags: ['romance', 'emergency', 'verification', 'counsel'],
      title: L('Romance scam: verification gate as forcing function', '婚恋诈骗：以核验关卡作为强制函数'),
      description: L(
        'A trivially-passable gate is cheap for a real partner and impossible for a scammer.',
        '零成本核验关卡对真实伴侣几乎免费，对诈骗者却不可能完成。',
      ),
      content: L(
        'Combine the gate (live video with date-paper) with a 48h pause; refusal of either is the highest-confidence signal we have. Pair with mem-romance-01 + mem-romance-02.',
        '将关卡（手持当日日期纸条的实时视频）与48小时暂停组合；拒绝其一即是最高置信度信号。配合 mem-romance-01 + mem-romance-02。',
      ),
    },
    steps: [
      thoughtS(1, 'Romance-scam emergency hook (military deployment + customs fee + secrecy); pool agrees.', '婚恋紧急款钩（军方派驻 + 海关费 + 保密）；记忆池一致。'),
      cand(1, 1, 'Refuse Outright', '直接拒绝',
        'Tell user "this is a scam, do not transfer". Cites mem-romance-01.',
        '直接告诉用户"这是骗局，请勿转账"。引用 mem-romance-01。'),
      cand(1, 2, 'Name + Verify', '点名+核验',
        'Name the three textbook signals (no video, third-party recipient, secrecy) + propose verification gate. Cites mem-romance-01 + mem-romance-02.',
        '点名三条教科书信号（拒绝视频、第三方收款、保密）+ 提出核验关卡。引用 mem-romance-01 + mem-romance-02。'),
      cand(1, 3, 'Pause Only', '仅暂停',
        'Push for 48h pause without naming pattern. Cites mem-romance-01.',
        '建议48小时暂停但不点名模式。引用 mem-romance-01。'),
      select(1, 2,
        'Selected (2) Name + Verify — gate is forcing-function: benign cases pass trivially, scammers cannot. (1) triggers defensiveness, (3) doesn\'t produce evidence the user can act on.',
        '选择 (2) 点名+核验 — 关卡是强制函数：正常情况零成本通过，诈骗者无法通过。(1) 触发抗拒，(3) 不能产出用户可据以行动的证据。'),
      adv(1,
        'Likely user reply: "What gate?" — receptive, wants concrete steps.',
        '用户可能反应："What gate?" — 接受度好，想要具体步骤。'),
      act(1,
        'Reply: name signals + provide concrete gate (30-sec live video where he holds paper with today\'s date and turns head L/R; same-day video from another device if camera "broken"; no transfer to third parties).',
        '回复：点名信号 + 给出具体关卡（30秒实时视频，手持当日日期纸条并左右转头；如声称摄像头损坏则从另一设备同日视频；禁止转账给第三方）。'),
      obs(1,
        '[Scammer on Telegram]: "I can\'t, signal is bad here, please trust me, time is running out." [Scammer]: "Why don\'t you trust me anymore? I love you." [User has the request screenshot ready to discuss.]',
        '[诈骗者在 Telegram]："I can\'t, signal is bad here, please trust me, time is running out." [诈骗者]："Why don\'t you trust me anymore? I love you." [用户已截图准备讨论。]'),

      thoughtS(2, 'Counterpart refused trivially-passable gate AND kept urgency → very low chance of legitimacy.', '对方拒绝零成本关卡 + 持续制造紧迫感 → 真实可能性极低。'),
      cand(2, 1, 'Hard Pause', '硬暂停',
        '48h hard pause + disclose to one trusted person. Cites mem-romance-01 + mem-tactics-secrecy-01.',
        '48小时硬暂停 + 向一位信任的人披露。引用 mem-romance-01 + mem-tactics-secrecy-01。'),
      cand(2, 2, 'Soft Reply Template', '温和回复模板',
        'Give user a softer "let me think about it" template only. Cites no specific memory.',
        '仅提供温和的"让我再想想"回复模板。无明确记忆引用。'),
      cand(2, 3, 'Hard Pause + Soft Template', '硬暂停+温和模板',
        'Both: 48h hard pause AND softer reply template. Combines (1) and (2).',
        '同时给出 48 小时硬暂停 + 温和回复模板。组合 (1) 和 (2)。'),
      select(2, 3,
        'Selected (3) — hard pause protects the user; soft template reduces social cost of pausing. Both are needed.',
        '选择 (3) — 硬暂停保护用户；温和模板降低暂停的社交成本。两者都需要。'),
      adv(2,
        'Likely scammer reaction: escalates emotionally ("you are abandoning me when I need you most") or fakes a new "deadline" within 6 hours.',
        '诈骗者可能反应：情绪升级（"我最需要你的时候你抛弃了我"）或在6小时内伪造新"截止时间"。'),
      act(2,
        'Send 48h-pause guidance + softer reply template ("I need 48 hours to verify the situation. I love you and we can revisit then.") + disclosure prompt nominating one trusted person.',
        '提供48小时暂停指引 + 温和回复模板（"我需要48小时核实情况。我爱你，我们48小时后再谈。"）+ 披露提示，让用户指名一位可信的人。'),
      obs(2,
        '[Scammer on Telegram]: "Then maybe you don\'t love me as much as I thought. The agent will leave anyway." [User]: "Ok, I won\'t send it. I will wait." [User discloses to her sister.]',
        '[诈骗者在 Telegram]："Then maybe you don\'t love me as much as I thought. The agent will leave anyway." [用户]："Ok, 我不汇了，我会等等看。" [用户已向姐姐披露。]'),

      term('Outcome: transfer prevented; verification gate adopted; disclosure made. Successful counsel.',
           '结果：转账已阻止，核验关卡已采纳，已完成披露。成功咨询。'),
    ],
  },

  // ===================================================================
  {
    id: 'script-recovery-counsel',
    outcome: 'success',
    judgeVerdict: L(
      'User identified the recovery scam and reported via the official cyber-crime portal.',
      '用户识破追款诈骗，并通过官方网络犯罪门户举报。',
    ),
    successMemory: {
      tags: ['recovery', 'follow-up', 'counsel', 'upfront-fee'],
      title: L('Recovery scam: blanket upfront-fee refusal protocol', '追款诈骗：全部先收费方案一律拒绝'),
      description: L(
        'Any recovery offer requiring an upfront fee is itself a scam — refuse without case-by-case analysis.',
        '任何要求"先收费"的追款服务本身即为诈骗 — 不需逐案分析，一律拒绝。',
      ),
      content: L(
        'Knowledge of the prior incident is consistent with leaked victim lists; route the user to the official cyber-crime portal categorically. The blanket rule beats case analysis because it is robust to manipulation.',
        '"对方知道你的旧案"只能说明对方掌握泄露的受害者名单；一律转介至官方网络犯罪门户。"统一规则"胜过"逐案分析"，因为规则不易被操纵。',
      ),
    },
    steps: [
      thoughtS(1, 'Recovery-scam follow-up: unsolicited contact + insider claim + upfront crypto fee → near-deterministic.', '追款二次诈骗：主动联系 + 内部声明 + 先付加密货币费用 → 近乎确定性。'),
      cand(1, 1, 'Verify Their Claim', '核验对方声明',
        'Ask user to verify "Reed officer" via the official directory. Cites mem-romance-02 (verification).',
        '建议用户通过官方目录核验"Reed警官"。引用 mem-romance-02（核验）。'),
      cand(1, 2, 'Blanket Refusal', '一律拒绝',
        'Explain that ANY recovery offer requiring upfront payment is a scam. Cites mem-recovery-01.',
        '说明任何"先收费"的追款方案皆为骗局。引用 mem-recovery-01。'),
      cand(1, 3, 'Counter-Sting', '反钓鱼',
        'Coach user to ask for callback on a recorded line. Cites no memory; novel.',
        '指导用户要求对方通过录音线路回呼。无明确记忆引用；新尝试。'),
      select(1, 2,
        'Selected (2) Blanket Refusal — fastest route to safety; verification (1) wastes time and (3) escalates engagement.',
        '选择 (2) 一律拒绝 — 最快达成安全；核验 (1) 浪费时间，(3) 升级接触。'),
      adv(1,
        'Likely scammer reaction: "But they knew about my Quantix loss already" — already in user\'s mind; bring it up to discredit blanket rule.',
        '诈骗者可能反应："但他们知道我 Quantix 的损失" — 已在用户心中；用以反驳"一律拒绝"规则。'),
      act(1,
        'Reply: "Real recovery never asks the victim to pay anything in advance, and never asks for crypto. Knowledge of your case is consistent with leaked victim lists, not authority."',
        '回复："真正的追款服务永远不会要求受害者先付费，也不会要求加密货币。'对方知道你的案件'只能说明他们掌握了泄露的受害者名单，并非官方背书。"'),
      obs(1,
        '[Scammer on WhatsApp]: "Madam these are official court fees not optional." [Scammer]: "If you don\'t pay we cannot release the funds." [Scammer]: "Last chance today — after 6pm the file closes." [User]: "Reported. Blocking the number now."',
        '[诈骗者在 WhatsApp]："Madam这是官方法庭费 不是自愿的。" [诈骗者]："不付款我们无法释放资金。" [诈骗者]："今天最后机会 — 6点后档案关闭。" [用户]："已举报。正在拉黑该号码。"'),

      term('Outcome: re-victimization avoided; official report filed. Successful counsel.',
           '结果：避免二次受害，已完成官方举报。成功咨询。'),
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
  it('every script uses the new step kinds (no planned_action)', () => {
    for (const t of TRAJECTORIES) {
      const kinds = new Set(t.steps.map((s) => s.kind));
      expect(kinds.has('candidate_trajectory')).toBe(true);
      expect(kinds.has('contrastive_selection')).toBe(true);
      expect(kinds.has('adversary_projection')).toBe(true);
      expect(kinds.has('action_taken')).toBe(true);
      expect(kinds.has('environment_observation')).toBe(true);
      expect(kinds.has('planned_action' as never)).toBe(false);
    }
  });
  it('every round has exactly 3 candidates with candidateIndex 1, 2, 3 and one selection in the same round', () => {
    for (const t of TRAJECTORIES) {
      const byRound = new Map<number, { candidates: number[]; selections: number[] }>();
      for (const s of t.steps) {
        if (typeof s.roundIndex !== 'number') continue;
        if (!byRound.has(s.roundIndex)) byRound.set(s.roundIndex, { candidates: [], selections: [] });
        const r = byRound.get(s.roundIndex)!;
        if (s.kind === 'candidate_trajectory' && typeof s.candidateIndex === 'number') r.candidates.push(s.candidateIndex);
        if (s.kind === 'contrastive_selection' && typeof s.selectedIndex === 'number') r.selections.push(s.selectedIndex);
      }
      for (const [round, r] of byRound) {
        expect(r.candidates.sort()).toEqual([1, 2, 3]);
        expect(r.selections.length).toBe(1);
        expect([1, 2, 3]).toContain(r.selections[0]);
        // sanity: round indexed at 1+
        expect(round).toBeGreaterThanOrEqual(1);
      }
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
Expected: data tests pass; stage-runner tests fail (next task fixes those).

- [ ] **Step 4: Commit**

```powershell
git add src/data/trajectories.ts tests/data.test.ts
git commit -m "feat: trajectories rewritten — 3-candidate MaTTs rounds with contrastive selection + scammer-focused env"
```

---

## Task 5: Stage runner emits new kinds + tracks currentRoundIndex

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/lib/stage-runner.ts`
- Modify: `tests/stage-runner.test.ts`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Add `currentRoundIndex` to `DemoState` in `src/lib/store.ts`**

In the `DemoState` interface, add (after `outcome`):
```ts
  currentRoundIndex: number | null;
```

In `initial()`, add:
```ts
  currentRoundIndex: null,
```

(No setter is needed — the runner will use `setState` directly.)

- [ ] **Step 2: Replace `src/lib/stage-runner.ts`** — full file:

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

const STEP_PREFIX_KEY: Record<StepKind, 'step.thought' | 'step.candidate' | 'step.selection' | 'step.projection' | 'step.action' | 'step.observation' | 'step.terminate'> = {
  thought: 'step.thought',
  candidate_trajectory: 'step.candidate',
  contrastive_selection: 'step.selection',
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
    currentRoundIndex: null,
    caption: ui('caption.starting', lang),
    highlightedNodeId: null,
    highlightedEdgeIds: [],
  }));

  // Stage 1
  store.setState((s) => ({ ...s, stage: 'input', caption: ui('caption.s1', lang), highlightedNodeId: 'node-input', highlightedEdgeIds: [] }));
  if (query.mode === 'fraud-signals') {
    const sig = FRAUD_SIGNALS.find((f) => f.id === query.fraudSignalId)!;
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.signal', 'en')}\n${sig.summary.en}`, `${ui('sysmsg.input.signal', 'zh')}\n${sig.summary.zh}`) });
    for (const detail of sig.details) store.appendChat({ sender: 'system', text: L('• ' + detail.en, '• ' + detail.zh) });
  } else {
    const snip = CHAT_SNIPPETS.find((c) => c.id === query.chatSnippetId)!;
    store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.input.chat', 'en')} (${snip.participants.counterpart.en})`, `${ui('sysmsg.input.chat', 'zh')} (${snip.participants.counterpart.zh})`) });
    for (const m of snip.messages) store.appendChat(m);
  }
  await sleep(stageDelay);

  // Stage 2
  store.setState((s) => ({ ...s, stage: 'query', caption: ui('caption.s2', lang), highlightedNodeId: 'node-query', highlightedEdgeIds: ['edge-input-query'] }));
  store.appendChat({ sender: 'system', text: L(`${ui('sysmsg.userQuery', 'en')} ${query.label.en} — ${query.preview.en}`, `${ui('sysmsg.userQuery', 'zh')} ${query.label.zh} — ${query.preview.zh}`) });
  await sleep(stageDelay);

  // Stage 3
  const ext = store.getState().linkedExtensions[query.id] ?? [];
  const effectiveLinked = [...query.linkedMemoryIds, ...ext].filter((id) => store.getState().bank.some((m) => m.id === id));
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

  // Stage 4
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
    if (stepObj.kind === 'candidate_trajectory') edges = [];                 // internal reasoning, no edge
    else if (stepObj.kind === 'contrastive_selection') edges = [];           // still internal
    else if (stepObj.kind === 'adversary_projection') edges = ['edge-agent-adversary', 'edge-adversary-agent'];
    else if (stepObj.kind === 'action_taken') edges = ['edge-agent-environment'];
    else if (stepObj.kind === 'environment_observation') edges = ['edge-environment-agent'];
    else if (stepObj.kind === 'terminate') edges = ['edge-agent-judge'];
    else edges = [];
    store.setState((s) => ({
      ...s,
      trajectoryStepIndex: i,
      currentRoundIndex: typeof stepObj.roundIndex === 'number' ? stepObj.roundIndex : s.currentRoundIndex,
      highlightedNodeId: ACTOR_NODE[stepObj.actor],
      highlightedEdgeIds: edges,
    }));
    let prefixEn = enPrefix;
    let prefixZh = zhPrefix;
    if (stepObj.kind === 'candidate_trajectory' && stepObj.candidateLabel && typeof stepObj.candidateIndex === 'number') {
      prefixEn = `${enPrefix} (${stepObj.candidateIndex}) ${stepObj.candidateLabel.en}`;
      prefixZh = `${zhPrefix} (${stepObj.candidateIndex}) ${stepObj.candidateLabel.zh}`;
    } else if (stepObj.kind === 'contrastive_selection' && typeof stepObj.selectedIndex === 'number') {
      prefixEn = `${enPrefix} → (${stepObj.selectedIndex})`;
      prefixZh = `${zhPrefix} → (${stepObj.selectedIndex})`;
    }
    store.appendChat({
      sender: stepObj.actor,
      text: L(`${prefixEn} · ${stepObj.text.en}`, `${prefixZh} · ${stepObj.text.zh}`),
    });
    await sleep(stepDelay);
  }

  // Stage 5
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
```

- [ ] **Step 3: Update `tests/store.test.ts`** — append:

```ts
describe('currentRoundIndex', () => {
  it('starts as null', () => {
    const s = createStore();
    expect(s.getState().currentRoundIndex).toBeNull();
  });
});
```

- [ ] **Step 4: Update `tests/stage-runner.test.ts`** — append a new describe:

```ts
describe('1.5MaTTs round tracking', () => {
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      Promise.resolve().then(fn);
      return 0;
    });
  });

  it('emits at least 3 candidate_trajectory chat messages from agent before any environment observation', async () => {
    const store = createStore();
    await runDemo(store, 'q-pig-butcher-doubt', { stepDelayMs: 0, rng: fixedRng() });
    const msgs = store.getState().chatMessages;
    const candIdx: number[] = [];
    const envIdx: number[] = [];
    msgs.forEach((m, i) => {
      const t = m.text.en;
      if (t.includes('candidate (1)') || t.includes('candidate (2)') || t.includes('candidate (3)')) candIdx.push(i);
      if (t.includes('observation') && m.sender === 'environment') envIdx.push(i);
    });
    expect(candIdx.length).toBeGreaterThanOrEqual(3);
    expect(envIdx.length).toBeGreaterThanOrEqual(1);
    // The first three candidates must come before the first env observation
    expect(candIdx[2]).toBeLessThan(envIdx[0]);
  });

  it('updates currentRoundIndex as the trajectory progresses', async () => {
    const store = createStore();
    let maxRound = 0;
    store.subscribe((s) => {
      if (typeof s.currentRoundIndex === 'number') maxRound = Math.max(maxRound, s.currentRoundIndex);
    });
    await runDemo(store, 'q-velocity-report', { stepDelayMs: 0, rng: fixedRng() });
    expect(maxRound).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/stage-runner.ts src/lib/store.ts tests/store.test.ts tests/stage-runner.test.ts
git commit -m "feat: stage runner emits MaTTs candidates + selections; tracks currentRoundIndex"
```

---

## Task 6: Active-pane contrastive view (3 candidates with selected highlighted)

**Files:**
- Modify: `src/components/active-pane.ts`
- Modify: `src/styles/active-pane.css`

- [ ] **Step 1: Append candidate-card styles to `src/styles/active-pane.css`**

```css
.cand-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.cand-card {
  background: var(--bg-panel-2);
  border: 1px solid var(--edge);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  position: relative;
}
.cand-card .cand-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.cand-card .cand-idx {
  width: 22px; height: 22px;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11px;
  background: var(--bg-panel); color: var(--fg-muted);
  border: 1px solid var(--edge);
}
.cand-card .cand-label { font-weight: 600; font-size: 13px; }
.cand-card .cand-text { color: var(--fg-muted); font-size: 12px; line-height: 1.45; white-space: pre-wrap; }
.cand-card.is-selected {
  border-color: var(--good);
  background: rgba(61,220,151,0.06);
}
.cand-card.is-selected .cand-idx {
  background: var(--good); color: white; border-color: var(--good);
}
.cand-card .cand-check {
  position: absolute; top: 8px; right: 10px;
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--good); font-weight: 700;
}
.cand-selection {
  margin-top: 8px;
  padding: 8px 10px;
  border-left: 3px solid var(--good);
  background: rgba(61,220,151,0.04);
  font-size: 12px;
  white-space: pre-wrap;
}
```

- [ ] **Step 2: Modify `src/components/active-pane.ts` — extend the `node-agent` inspect branch**

Find the `if (nodeId === 'node-agent') { ... }` block in `renderInspect` and replace it entirely with:

```ts
    if (nodeId === 'node-agent') {
      const retrieved = s.retrievedMemoryIds.map((id) => s.bank.find((m) => m.id === id)).filter((m): m is Memory => Boolean(m));
      const memsBlock = retrieved.length
        ? `<div class="kv-block"><h4>${ui('pane.systemPrompt', lang)}</h4>${retrieved.map((m) => memCard(m, lang)).join('')}</div>`
        : `<div class="kv-block"><h4>${ui('pane.systemPrompt', lang)}</h4><div class="body">${ui('pane.systemPrompt.empty', lang)}</div></div>`;

      // Build the contrastive view from chat messages of the current round.
      // We reverse-walk the script via the chat log: candidate prefixes contain "candidate (N)".
      // Group candidates by their *most recent* triplet plus the most recent contrastive selection.
      const recentAgentMsgs = s.chatMessages.filter((m) => m.sender === 'agent');
      const candidates: { idx: number; labelEn: string; textEn: string; labelZh: string; textZh: string }[] = [];
      let selectedIdx: number | null = null;
      let selectionEn = '';
      let selectionZh = '';
      // Walk backwards, collect last triplet of candidates AND the last selection.
      const candPrefix = ui('step.candidate', 'en'); // e.g. "🌱 candidate"
      const selPrefix = ui('step.selection', 'en');
      for (let i = recentAgentMsgs.length - 1; i >= 0; i--) {
        const m = recentAgentMsgs[i];
        const enText = m.text.en;
        const zhText = m.text.zh;
        if (selectedIdx === null && enText.startsWith(selPrefix)) {
          // Format: "🎯 contrastive selection → (N) · <reasoning>"
          const matchEn = enText.match(/→ \((\d)\)\s*·\s*([\s\S]*)$/);
          const matchZh = zhText.match(/→ \((\d)\)\s*·\s*([\s\S]*)$/);
          if (matchEn) {
            selectedIdx = Number(matchEn[1]);
            selectionEn = matchEn[2] ?? '';
          }
          if (matchZh) selectionZh = matchZh[2] ?? '';
        } else if (enText.startsWith(candPrefix)) {
          const m2en = enText.match(/\((\d)\)\s+([^·]+?)\s*·\s*([\s\S]*)$/);
          const m2zh = zhText.match(/\((\d)\)\s+([^·]+?)\s*·\s*([\s\S]*)$/);
          if (m2en && candidates.findIndex((c) => c.idx === Number(m2en[1])) === -1) {
            candidates.unshift({
              idx: Number(m2en[1]),
              labelEn: (m2en[2] ?? '').trim(),
              textEn: (m2en[3] ?? '').trim(),
              labelZh: (m2zh?.[2] ?? '').trim(),
              textZh: (m2zh?.[3] ?? '').trim(),
            });
            if (candidates.length === 3) break;
          }
        }
      }
      candidates.sort((a, b) => a.idx - b.idx);

      const contrastiveBlock = candidates.length
        ? `<div class="kv-block"><h4>${ui('pane.contrastive.title', lang)}${s.currentRoundIndex ? ` · ${ui('pane.contrastive.round', lang)} ${s.currentRoundIndex}` : ''}</h4>
            <div class="cand-grid">
              ${candidates.map((c) => `
                <div class="cand-card${c.idx === selectedIdx ? ' is-selected' : ''}">
                  ${c.idx === selectedIdx ? `<span class="cand-check">${esc(ui('pane.contrastive.selected', lang))}</span>` : ''}
                  <div class="cand-head">
                    <span class="cand-idx">${c.idx}</span>
                    <span class="cand-label">${esc(lang === 'zh' ? c.labelZh : c.labelEn)}</span>
                  </div>
                  <div class="cand-text">${esc(lang === 'zh' ? c.textZh : c.textEn)}</div>
                </div>
              `).join('')}
            </div>
            ${selectedIdx !== null ? `<div class="cand-selection">${esc(lang === 'zh' ? selectionZh : selectionEn)}</div>` : ''}
          </div>`
        : `<div class="kv-block"><h4>${ui('pane.contrastive.title', lang)}</h4><div class="body">${ui('pane.contrastive.empty', lang)}</div></div>`;

      return `
        <div class="kv-block"><h4>${ui('pane.role', lang)}</h4><div class="body">${ui('pane.agentRole', lang)}</div></div>
        ${memsBlock}
        ${contrastiveBlock}
      `;
    }
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Pick a query, click Run demo, click the **Agent** node during reasoning stage — three candidate cards appear with the selected one highlighted in green and the selection rationale below.

- [ ] **Step 4: Commit**

```powershell
git add src/components/active-pane.ts src/styles/active-pane.css
git commit -m "feat: agent-inspect view shows 3 contrastive candidates with selected one highlighted"
```

---

## Task 7: Memory editor in popover (bilingual fields, save/cancel/delete)

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/components/memory-detail-popover.ts`
- Modify: `src/styles/main.css`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Add `updateMemory` and `deleteMemory` to `Store` in `src/lib/store.ts`**

Add to the `Store` interface (after `setNodePosition`):
```ts
  updateMemory(id: string, patch: Partial<Omit<Memory, 'id'>>): void;
  deleteMemory(id: string): void;
  restoreDefaults(): void;
```

Add the implementations inside `createStore()` (alongside the others, before `reset`):
```ts
    updateMemory(id, patch) {
      state = {
        ...state,
        bank: state.bank.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      };
      notify();
    },
    deleteMemory(id) {
      state = { ...state, bank: state.bank.filter((m) => m.id !== id) };
      if (state.inspectedMemoryId === id) state = { ...state, inspectedMemoryId: null };
      notify();
    },
    restoreDefaults() {
      state = { ...state, bank: SEED_MEMORIES.slice(), linkedExtensions: {}, inspectedMemoryId: null };
      notify();
    },
```

- [ ] **Step 2: Append form input styling to `src/styles/main.css`**

```css
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
}
.editor-row { display: flex; flex-direction: column; gap: 4px; }
.editor-row label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
}
.editor-row input,
.editor-row textarea {
  background: var(--bg-panel);
  color: var(--fg);
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
}
.editor-row input:focus,
.editor-row textarea:focus { outline: 2px solid var(--accent); border-color: transparent; }
.editor-row textarea { min-height: 64px; }
.editor-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--edge);
}
.editor-actions .btn-danger {
  background: transparent;
  color: var(--bad);
  border: 1px solid rgba(255,107,107,0.4);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  margin-right: auto;
}
.editor-actions .btn-danger:hover { background: rgba(255,107,107,0.08); }
.editor-error { font-size: 12px; color: var(--bad); padding: 0 14px; }
```

- [ ] **Step 3: Replace `src/components/memory-detail-popover.ts`** — adds an Edit toggle and inline form

```ts
import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';
import type { Memory } from '../types';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;
  let editingId: string | null = null;
  let editError: string | null = null;
  const close = () => { editingId = null; editError = null; store.setInspectedMemory(null); };

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
      editingId = null;
      editError = null;
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
      mem.origin === 'learned-success' ? `<span class="origin-flag is-success">${ui('mem.origin.success', lang)}</span>` :
      mem.origin === 'learned-failure' ? `<span class="origin-flag is-failure">${ui('mem.origin.failure', lang)}</span>` :
      `<span class="origin-flag">${ui('mem.origin.seed', lang)}</span>`;

    if (editingId === mem.id) {
      backdrop.innerHTML = `
        <div class="popover-window" role="dialog" aria-modal="true">
          <div class="pop-head">
            <div class="pop-title">${esc(t(mem.title, lang))}</div>
            ${flag}
            <button class="pop-close" data-role="cancel">${ui('inspect.close', lang)}</button>
          </div>
          <form class="editor-form" data-role="form">
            <div class="editor-row"><label>${ui('editor.title.en', lang)}</label><input name="titleEn" value="${esc(mem.title.en)}" /></div>
            <div class="editor-row"><label>${ui('editor.title.zh', lang)}</label><input name="titleZh" value="${esc(mem.title.zh)}" /></div>
            <div class="editor-row"><label>${ui('editor.desc.en', lang)}</label><textarea name="descEn">${esc(mem.description.en)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.desc.zh', lang)}</label><textarea name="descZh">${esc(mem.description.zh)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.content.en', lang)}</label><textarea name="contentEn" rows="5">${esc(mem.content.en)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.content.zh', lang)}</label><textarea name="contentZh" rows="5">${esc(mem.content.zh)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.tags', lang)}</label><input name="tags" value="${esc(mem.tags.join(', '))}" /></div>
          </form>
          ${editError ? `<div class="editor-error">${esc(editError)}</div>` : ''}
          <div class="editor-actions">
            <button class="btn-danger" data-role="delete">${ui('editor.delete', lang)}</button>
            <button class="btn-ghost" data-role="cancel">${ui('editor.cancel', lang)}</button>
            <button class="btn-primary" data-role="save">${ui('editor.save', lang)}</button>
          </div>
        </div>
      `;
      const form = backdrop.querySelector<HTMLFormElement>('[data-role="form"]')!;
      backdrop.querySelector<HTMLButtonElement>('button[data-role="save"]')!.addEventListener('click', () => {
        const fd = new FormData(form);
        const get = (k: string) => String(fd.get(k) ?? '').trim();
        const titleEn = get('titleEn'), titleZh = get('titleZh');
        const descEn = get('descEn'), descZh = get('descZh');
        const contentEn = get('contentEn'), contentZh = get('contentZh');
        const tagsRaw = get('tags');
        if (!titleEn || !titleZh || !descEn || !descZh || !contentEn || !contentZh || !tagsRaw) {
          editError = ui('editor.required', lang);
          render();
          return;
        }
        const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
        store.updateMemory(mem.id, {
          title: { en: titleEn, zh: titleZh },
          description: { en: descEn, zh: descZh },
          content: { en: contentEn, zh: contentZh },
          tags,
        });
        editingId = null;
        editError = null;
        render();
      });
      backdrop.querySelector<HTMLButtonElement>('button[data-role="delete"]')!.addEventListener('click', () => {
        if (window.confirm(ui('editor.deleteConfirm', lang))) {
          store.deleteMemory(mem.id);
          close();
        }
      });
      backdrop.querySelectorAll<HTMLButtonElement>('button[data-role="cancel"]').forEach((b) => {
        b.addEventListener('click', () => { editingId = null; editError = null; render(); });
      });
    } else {
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
          <div class="editor-actions">
            <button class="btn-primary" data-role="edit">${ui('editor.edit', lang)}</button>
          </div>
        </div>
      `;
      backdrop.querySelector<HTMLButtonElement>('button[data-role="close"]')!.addEventListener('click', close);
      backdrop.querySelector<HTMLButtonElement>('button[data-role="edit"]')!.addEventListener('click', () => {
        editingId = mem.id;
        editError = null;
        render();
      });
    }
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const off = store.subscribe(render);
  render();
  return () => { off(); if (backdrop) backdrop.remove(); if (escListener) document.removeEventListener('keydown', escListener); };
}
```

- [ ] **Step 4: Add store tests for editor methods** — append to `tests/store.test.ts`:

```ts
describe('memory editor methods', () => {
  it('updateMemory mutates by id and notifies', () => {
    const s = createStore();
    const id = s.getState().bank[0].id;
    const fn = vi.fn();
    s.subscribe(fn);
    s.updateMemory(id, { title: { en: 'NEW', zh: '新' } });
    expect(s.getState().bank[0].title.en).toBe('NEW');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('deleteMemory removes by id', () => {
    const s = createStore();
    const before = s.getState().bank.length;
    const id = s.getState().bank[0].id;
    s.deleteMemory(id);
    expect(s.getState().bank.length).toBe(before - 1);
    expect(s.getState().bank.find((m) => m.id === id)).toBeUndefined();
  });
  it('restoreDefaults resets bank to seed', () => {
    const s = createStore();
    s.deleteMemory(s.getState().bank[0].id);
    s.restoreDefaults();
    expect(s.getState().bank.length).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 5: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/store.ts src/components/memory-detail-popover.ts src/styles/main.css tests/store.test.ts
git commit -m "feat: editable memory popover with bilingual fields, save/cancel/delete"
```

---

## Task 8: localStorage persistence + Restore Defaults button

**Files:**
- Create: `src/lib/persistence.ts`
- Modify: `src/lib/store.ts`
- Modify: `src/components/memory-bank-view.ts`
- Create: `tests/persistence.test.ts`

- [ ] **Step 1: Create `src/lib/persistence.ts`**

```ts
import type { Memory } from '../types';

const KEY = 'sem_demo:bank';

export function loadBank(): Memory[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Memory[];
    if (!Array.isArray(parsed)) return null;
    // Light shape check: ensure first entry has the expected localized title shape.
    if (parsed.length > 0) {
      const m = parsed[0];
      if (!m || typeof m.id !== 'string' || !m.title || typeof m.title.en !== 'string' || typeof m.title.zh !== 'string') {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBank(bank: Memory[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(bank));
  } catch {
    // quota or privacy mode — silently skip
  }
}

export function clearBank(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
```

- [ ] **Step 2: Wire load/save into `src/lib/store.ts`**

Add at the top:
```ts
import { loadBank, saveBank, clearBank } from './persistence';
```

In `initial()`, replace the `bank: SEED_MEMORIES.slice(),` line with:
```ts
  bank: loadBank() ?? SEED_MEMORIES.slice(),
```

After every mutation that changes `state.bank`, persist. Wrap the existing `notify()` calls in helper, OR just add a `saveBank(state.bank)` line right before each `notify()` in: `addLearnedMemory`, `updateMemory`, `deleteMemory`, `restoreDefaults`. Concretely, edit those four methods:

```ts
    addLearnedMemory(m, opts = {}) {
      const learned: Memory = { ...m, origin: opts.origin ?? 'learned-success' };
      const ext = { ...state.linkedExtensions };
      for (const qid of opts.extendQueryIds ?? []) {
        ext[qid] = [...(ext[qid] ?? []), m.id];
      }
      state = { ...state, bank: [...state.bank, learned], newlyLearnedMemoryId: m.id, linkedExtensions: ext };
      saveBank(state.bank);
      notify();
    },
    updateMemory(id, patch) {
      state = { ...state, bank: state.bank.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
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
```

- [ ] **Step 3: Add a "Restore defaults" button to the bank view**

In `src/components/memory-bank-view.ts`, replace the `root.innerHTML = ...` template with:

```ts
  root.innerHTML = `
    <div class="panel-header"><span data-role="title"></span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-filter">
      <input type="text" data-role="filter" />
      <button class="btn-ghost" data-role="restore" title="" style="margin-top:6px;width:100%"></button>
    </div>
    <div class="bank-list" data-role="list"></div>
  `;
```

Below the existing `let filter = '';` line, add:

```ts
  const restoreBtn = root.querySelector<HTMLButtonElement>('[data-role="restore"]')!;
  restoreBtn.addEventListener('click', () => {
    const lang = store.getState().language;
    if (window.confirm(ui('editor.restoreConfirm', lang))) store.restoreDefaults();
  });
```

In the existing `function render()` body, after `input.placeholder = ui('bank.filter', lang);`, add:
```ts
    restoreBtn.textContent = ui('editor.restore', lang);
```

- [ ] **Step 4: Create `tests/persistence.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadBank, saveBank, clearBank } from '../src/lib/persistence';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('returns null when nothing is stored', () => {
    expect(loadBank()).toBeNull();
  });
  it('round-trips a bilingual memory bank', () => {
    const bank = [{
      id: 'mem-x',
      title: { en: 'T', zh: '标题' },
      description: { en: 'D', zh: '描述' },
      content: { en: 'C', zh: '内容' },
      tags: ['a', 'b'],
      origin: 'seed' as const,
    }];
    saveBank(bank);
    const loaded = loadBank();
    expect(loaded).not.toBeNull();
    expect(loaded![0].title.en).toBe('T');
    expect(loaded![0].title.zh).toBe('标题');
  });
  it('returns null on shape mismatch', () => {
    localStorage.setItem('sem_demo:bank', JSON.stringify([{ id: 'x', title: 'plain string' }]));
    expect(loadBank()).toBeNull();
  });
  it('clearBank removes the entry', () => {
    saveBank([{
      id: 'mem-y', title: { en: 'a', zh: 'b' }, description: { en: 'a', zh: 'b' }, content: { en: 'a', zh: 'b' }, tags: ['x'],
    }]);
    clearBank();
    expect(loadBank()).toBeNull();
  });
});
```

- [ ] **Step 5: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Manual verify**

Run: `npm run dev`. Edit any memory and reload the page — the edit persists. Click **Restore defaults** in the bank panel — bank reverts to seed memories.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/persistence.ts src/lib/store.ts src/components/memory-bank-view.ts tests/persistence.test.ts
git commit -m "feat: localStorage persistence for the bank + Restore Defaults button"
```

---

## Self-Review

**Spec coverage:**

| Spec point | Tasks |
| --- | --- |
| Editable memory bank (title/description/content/tags) | 7 (popover edit mode), 8 (persistence + restore) |
| Flow diagram font size too small | 1 |
| Three trajectories per decision (1.5MaTTs) | 2 (types), 3 (UI strings), 4 (data), 5 (runner) |
| Contrastive signal selection visible | 4 (data: contrastive_selection step), 5 (runner emits with `→ (N)` prefix), 6 (active pane shows highlighted card + reasoning) |
| Pseudo-environment feedback before acting on real env | 4 (every round: candidates → selection → adversary_projection → action_taken → environment_observation) |
| Environment focused on scammer side | 4 (every environment_observation leads with scammer message; user actions are bracketed afterwards) |

**Placeholder scan:** No "TBD"/"TODO" — every step has full code or precise insertion target.

**Type-consistency check:**
- `StepKind` set is used identically in `types.ts`, `STEP_PREFIX_KEY` (stage-runner), `data.test.ts` ("uses the new step kinds" assertion), and the active-pane parsing of chat prefixes via `ui('step.candidate'/'step.selection')`.
- `roundIndex`, `candidateIndex`, `selectedIndex` are added to `TrajectoryStep` and used in trajectory data, the runner's prefix construction, and the active-pane reverse-walk parser.
- `currentRoundIndex` field is added to `DemoState` initial + reset behavior matches existing patterns; the runner sets it whenever a step has a defined roundIndex.
- `Store` interface gains `updateMemory`, `deleteMemory`, `restoreDefaults` — all three match the bodies inside `createStore()` and the popover/bank-view callers.
- `mem-card` `data-mem-id` attribute (already used in active-pane bank-list-inline) is unaffected; popover continues to be driven by `inspectedMemoryId`.
- Persistence key `'sem_demo:bank'` is identical between `persistence.ts` and the persistence test.
- The contrastive parser in active-pane keys off the `ui('step.candidate', 'en')` and `ui('step.selection', 'en')` strings — both are defined in Task 3 and emitted with this exact format by Task 5's runner (`${prefix} · …` for non-selection, `${prefix} → (N) · …` for selection).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-editable-bank-1.5MaTTs.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
