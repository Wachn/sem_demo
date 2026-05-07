import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import { ui, t } from '../lib/i18n';
import type { Lang } from '../types';

export function mountChatPanel(root: HTMLElement, store: Store): () => void {
  const lang0 = store.getState().language;
  root.innerHTML = `
    <div class="panel-header" data-role="header">${ui('panel.chat', lang0)}</div>
    <div class="chat-list" data-role="list" aria-live="polite"></div>
    <div class="chat-controls">
      <select data-role="picker" aria-label="Pick a query"></select>
      <span class="preview" data-role="preview"></span>
    </div>
  `;
  const header = root.querySelector<HTMLDivElement>('[data-role="header"]')!;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const picker = root.querySelector<HTMLSelectElement>('[data-role="picker"]')!;
  const preview = root.querySelector<HTMLSpanElement>('[data-role="preview"]')!;

  function renderPicker(selectedId: string | null, isLocked: boolean, lang: Lang) {
    const fraud = QUERIES.filter((q) => q.mode === 'fraud-signals');
    const chat = QUERIES.filter((q) => q.mode === 'chat-messages');
    const ph = `<option value="">${ui('picker.placeholder', lang)}</option>`;
    const og = (label: string, list: typeof QUERIES) =>
      `<optgroup label="${esc(label)}">${list.map((q) => `<option value="${q.id}"${q.id === selectedId ? ' selected' : ''}>${esc(t(q.label, lang))}</option>`).join('')}</optgroup>`;
    picker.innerHTML = ph + og(ui('mode.fraud', lang), fraud) + og(ui('mode.chat', lang), chat);
    picker.disabled = isLocked;
    const sel = QUERIES.find((q) => q.id === selectedId);
    preview.textContent = sel ? t(sel.preview, lang) : '';
  }

  picker.addEventListener('change', () => {
    const id = picker.value || null;
    store.setState((s) => ({ ...s, selectedQueryId: id }));
  });

  function renderList(state: ReturnType<Store['getState']>) {
    list.innerHTML = state.chatMessages
      .map((m) => `<div class="chat-msg ${m.sender}"><div class="sender">${ui(`sender.${m.sender}` as any, state.language)}</div>${esc(t(m.text, state.language))}</div>`)
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  const off = store.subscribe((s) => {
    header.textContent = ui('panel.chat', s.language);
    const locked = s.stage !== 'idle' && s.stage !== 'done';
    renderPicker(s.selectedQueryId, locked, s.language);
    renderList(s);
  });

  const init = store.getState();
  renderPicker(init.selectedQueryId, false, init.language);
  renderList(init);
  return off;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
