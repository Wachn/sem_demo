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
