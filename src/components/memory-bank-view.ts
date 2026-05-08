import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';

export function mountMemoryBankView(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span data-role="title"></span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-filter">
      <input type="text" data-role="filter" />
      <button class="btn-ghost" data-role="restore" style="margin-top:6px;width:100%"></button>
    </div>
    <div class="bank-list" data-role="list"></div>
  `;
  const titleEl = root.querySelector<HTMLSpanElement>('[data-role="title"]')!;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const countEl = root.querySelector<HTMLSpanElement>('[data-role="count"]')!;
  const input = root.querySelector<HTMLInputElement>('[data-role="filter"]')!;
  const restoreBtn = root.querySelector<HTMLButtonElement>('[data-role="restore"]')!;
  let filter = '';

  input.addEventListener('input', () => { filter = input.value.trim().toLowerCase(); render(); });
  list.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLDivElement>('.mem-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (id) store.setInspectedMemory(id);
  });
  restoreBtn.addEventListener('click', () => {
    const lang = store.getState().language;
    if (window.confirm(ui('editor.restoreConfirm', lang))) store.restoreDefaults();
  });

  function render() {
    const s = store.getState();
    const lang = s.language;
    titleEl.textContent = ui('panel.bank', lang);
    input.placeholder = ui('bank.filter', lang);
    restoreBtn.textContent = ui('editor.restore', lang);
    const all = s.bank.slice().reverse();
    const filtered = filter ? all.filter((m) => m.tags.some((tg) => tg.toLowerCase().includes(filter))) : all;
    countEl.textContent = `${filtered.length} / ${all.length}`;
    list.innerHTML = filtered.map((m) => {
      const isNew = m.id === s.newlyLearnedMemoryId ? ' is-new' : '';
      const flag =
        m.origin === 'learned-success' ? '<span class="origin-flag is-success">' + ui('mem.origin.success', lang) + '</span>' :
        m.origin === 'learned-failure' ? '<span class="origin-flag is-failure">' + ui('mem.origin.failure', lang) + '</span>' :
        '';
      const tags = m.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
      return `<div class="mem-card${isNew}" data-id="${esc(m.id)}">
        <div class="title">${esc(t(m.title, lang))} ${flag}</div>
        <div class="desc">${esc(t(m.description, lang))}</div>
        <div class="tags">${tags}</div>
      </div>`;
    }).join('');
  }

  function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  const off = store.subscribe(render);
  render();
  return off;
}
