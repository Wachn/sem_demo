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
