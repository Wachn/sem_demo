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
