import type { TrajectoryScript, TrajectoryStep, Localized } from '../types';

const L = (en: string, zh: string): Localized => ({ en, zh });
const step = (
  kind: TrajectoryStep['kind'],
  actor: TrajectoryStep['actor'],
  en: string,
  zh: string,
): TrajectoryStep => ({ kind, actor, text: L(en, zh) });

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
      step('thought', 'agent', 'Velocity signal + new-payee chain → high-risk pattern. Three retrieved memories agree.', '速度信号 + 新收款人链路 → 高风险模式。三条检索记忆一致支持。'),
      step('planned_action', 'agent', 'Plan: hold next outbound transfer for 24h and surface the pattern to the user.', '计划：将下一笔出账冻结24小时，并向用户展示该模式。'),
      step('adversary_projection', 'adversary', 'Likely counterparty reply: "Why is your bank blocking? My uncle says only 2h left, you must call them now."', '对方可能回复："你的银行怎么拦？我叔叔说只剩2小时，你现在必须打过去。"'),
      step('action_taken', 'agent', 'Revised: place 24h hold AND pre-load a side-by-side: "Counterpart message vs. known time-pressure pattern".', '修订动作：执行24小时冻结，并提前准备"对方消息 vs. 已知时间压力套路"对比图。'),
      step('environment_observation', 'environment', '[Bank rail confirms hold placed.] [User opens the comparison view; nominates sister as trusted contact.]', '[银行通道确认已冻结。][用户打开对比视图；指定姐姐为可信联系人。]'),
      step('thought', 'agent', 'User cooperating; risk de-escalating. Schedule a check-in.', '用户配合，风险下降。安排回访。'),
      step('planned_action', 'agent', 'Plan: schedule a 24h check-in and provide regulator hotline + scam worksheet.', '计划：预约24小时后回访，并提供监管热线与诈骗自查表。'),
      step('adversary_projection', 'adversary', 'Likely counterparty: ramps urgency or pivots to "trusted recovery agent" pitch.', '对方可能：进一步升级紧迫性，或转向"可信追款代理"话术。'),
      step('action_taken', 'agent', 'Revised: schedule check-in AND add a pre-emptive note about recovery-scam follow-ups.', '修订动作：执行回访预约，并预先附上关于追款二次诈骗的提醒。'),
      step('environment_observation', 'environment', '[Check-in scheduled. User pauses chat with counterpart.]', '[回访已预约。用户暂停与对方的聊天。]'),
      step('terminate', 'agent', 'Outcome: transfer halted, disclosure made. Closing case as successful intervention.', '结果：转账已阻止，已完成披露。结案为成功干预。'),
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
        '检测到 APK 安装紧接新增收款人 → 阻止首笔转账并触发设备净化流程。',
      ),
      content: L(
        'When sideload + new-payee co-occur, escalate to immediate hard hold + side-channel notification (do NOT rely on in-app overlay; it can be suppressed by accessibility-permissioned malware).',
        '当侧载与新收款人共发时，升级为立即硬冻结 + 旁路渠道通知（不要依赖应用内浮层，因为带无障碍权限的恶意软件可压制它）。',
      ),
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
        '当应用内渠道被压制且 SMS 限流时，干预可能在资金清算后才到达。',
      ),
      content: L(
        'Lesson: do NOT rely on a single fallback channel. Combine in-app push + SMS + voice callback, with voice channel pre-warmed before the transfer-clearance window opens.',
        '教训：不要依赖单一备援渠道。组合应用内推送 + SMS + 语音回呼，且语音渠道须在到账窗口开启前完成预热。',
      ),
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
        '用户在迟疑期分享聊天时，将模式反射回去并提供脱身台词。',
      ),
      content: L(
        'Naming the pattern (rapport → uncle → private platform → secrecy) gave the user vocabulary; an exit script reduced the social cost of disengaging. Pair with a regulator allow-list URL.',
        '点名模式（建立感情 → 叔叔 → 私密平台 → 保密要求）让用户获得词汇；脱身台词降低了"中断对话"的社交成本。配合监管白名单链接一并发出。',
      ),
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
        '提出对正常情况近乎零成本的核验关卡；对方拒绝即印证风险。',
      ),
      content: L(
        'A verification gate (live video with date-paper) is cheap for a real partner and impossible for a scammer. Pair with a 48h pause for a robust protocol.',
        '核验关卡（手持当日日期纸条的实时视频）对真实伴侣几乎无成本，对诈骗者却不可能完成。再加上48小时暂停构成稳健协议。',
      ),
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
        '任何要求"先收费"的追款联络本身即为诈骗。',
      ),
      content: L(
        'Refuse upfront-fee recovery offers categorically; route to the official cyber-crime portal. Knowledge of the prior incident is consistent with leaked victim lists, not authority.',
        '一律拒绝先收费的追款服务；引导至官方网络犯罪门户。"知道你的旧案"只能说明对方掌握泄露的受害者名单，并非权威背书。',
      ),
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
