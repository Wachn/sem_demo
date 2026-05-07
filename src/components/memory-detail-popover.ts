import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;
  const close = () => store.setInspectedMemory(null);

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
      return;
    }
    const mem = s.bank.find((m) => m.id === id);
    if (!mem) { close(); return; }
    const lang = s.language;

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'popover-backdrop';
      backdrop.id = 'memory-detail-popover';
      backdrop.addEventListener('click', (ev) => { if (ev.target === backdrop) close(); });
      panelRoot.appendChild(backdrop);
      escListener = (ev) => { if (ev.key === 'Escape') close(); };
      document.addEventListener('keydown', escListener);
    }

    const flag =
      mem.origin === 'learned-success' ? '<span class="origin-flag is-success">' + ui('mem.origin.success', lang) + '</span>' :
      mem.origin === 'learned-failure' ? '<span class="origin-flag is-failure">' + ui('mem.origin.failure', lang) + '</span>' :
      '<span class="origin-flag">' + ui('mem.origin.seed', lang) + '</span>';
    const tagHtml = mem.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');

    backdrop.innerHTML = `
      <div class="popover-window" role="dialog" aria-modal="true">
        <div class="pop-head">
          <div class="pop-title">${esc(t(mem.title, lang))}</div>
          ${flag}
          <button class="pop-close" data-role="close">${ui('inspect.close', lang)}</button>
        </div>
        <div class="pop-section"><h5>${ui('mem.description', lang)}</h5><div class="body">${esc(t(mem.description, lang))}</div></div>
        <div class="pop-section"><h5>${ui('mem.content', lang)}</h5><div class="body">${esc(t(mem.content, lang))}</div></div>
        <div class="pop-section"><h5>${ui('mem.tags', lang)}</h5><div class="tags">${tagHtml}</div></div>
        <div class="pop-section"><h5>${ui('mem.origin', lang)}</h5><div class="body">${esc(mem.origin ?? 'seed')} · ${esc(mem.id)}</div></div>
      </div>
    `;
    backdrop.querySelector<HTMLButtonElement>('[data-role="close"]')!.addEventListener('click', close);
  }

  function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  const off = store.subscribe(render);
  render();
  return () => { off(); if (backdrop) backdrop.remove(); if (escListener) document.removeEventListener('keydown', escListener); };
}
