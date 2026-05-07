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
