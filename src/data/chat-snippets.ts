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
