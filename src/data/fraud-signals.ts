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
