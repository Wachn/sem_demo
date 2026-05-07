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
