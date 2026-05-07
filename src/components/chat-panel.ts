import type { Store } from '../lib/store';
import { QUERIES } from '../data/queries';
import type { Mode } from '../types';

export function mountChatPanel(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header">Chat / Query Console</div>
    <div class="chat-list" data-role="list" aria-live="polite"></div>
    <div class="chat-controls">
      <select data-role="picker" aria-label="Pick a query"></select>
      <span class="preview" data-role="preview"></span>
    </div>
  `;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const picker = root.querySelector<HTMLSelectElement>('[data-role="picker"]')!;
  const preview = root.querySelector<HTMLSpanElement>('[data-role="preview"]')!;

  function renderPicker(mode: Mode, selectedId: string | null, isLocked: boolean) {
    const opts = ['<option value="">— select a query —</option>']
      .concat(
        QUERIES.filter((q) => q.mode === mode).map(
          (q) => `<option value="${q.id}"${q.id === selectedId ? ' selected' : ''}>${q.label}</option>`,
        ),
      )
      .join('');
    picker.innerHTML = opts;
    picker.disabled = isLocked;
    const sel = QUERIES.find((q) => q.id === selectedId);
    preview.textContent = sel ? sel.preview : '';
  }

  picker.addEventListener('change', () => {
    const id = picker.value || null;
    store.setState((s) => ({ ...s, selectedQueryId: id }));
  });

  function renderList(state: ReturnType<Store['getState']>) {
    list.innerHTML = state.chatMessages
      .map((m) => `<div class="chat-msg ${m.sender}"><div class="sender">${m.sender}</div>${escapeHtml(m.text)}</div>`)
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  const off = store.subscribe((s) => {
    const locked = s.stage !== 'idle' && s.stage !== 'done';
    renderPicker(s.mode, s.selectedQueryId, locked);
    renderList(s);
  });

  const initial = store.getState();
  renderPicker(initial.mode, initial.selectedQueryId, false);
  renderList(initial);
  return off;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
