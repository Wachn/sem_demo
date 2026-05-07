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
