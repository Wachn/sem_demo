import type { Store } from '../lib/store';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;

  function close() {
    store.setInspectedMemory(null);
  }

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
      if (escListener) {
        document.removeEventListener('keydown', escListener);
        escListener = null;
      }
      return;
    }
    const mem = s.bank.find((m) => m.id === id);
    if (!mem) {
      close();
      return;
    }

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'popover-backdrop';
      backdrop.id = 'memory-detail-popover';
      backdrop.addEventListener('click', (ev) => {
        if (ev.target === backdrop) close();
      });
      panelRoot.appendChild(backdrop);

      escListener = (ev) => {
        if (ev.key === 'Escape') close();
      };
      document.addEventListener('keydown', escListener);
    }

    const flag = mem.origin === 'learned' ? '<span class="origin-flag">learned</span>' : '';
    const tagHtml = mem.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');

    backdrop.innerHTML = `
      <div class="popover-window" role="dialog" aria-modal="true">
        <div class="pop-head">
          <div class="pop-title">${esc(mem.title)}</div>
          ${flag}
          <button class="pop-close" data-role="close">close ✕</button>
        </div>
        <div class="pop-section">
          <h5>Description</h5>
          <div class="body">${esc(mem.description)}</div>
        </div>
        <div class="pop-section">
          <h5>Content</h5>
          <div class="body">${esc(mem.content)}</div>
        </div>
        <div class="pop-section">
          <h5>Tags</h5>
          <div class="tags">${tagHtml}</div>
        </div>
        <div class="pop-section">
          <h5>Origin · ID</h5>
          <div class="body">${esc(mem.origin ?? 'seed')} · ${esc(mem.id)}</div>
        </div>
      </div>
    `;
    backdrop.querySelector<HTMLButtonElement>('[data-role="close"]')!.addEventListener('click', close);
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return () => {
    off();
    if (backdrop) backdrop.remove();
    if (escListener) document.removeEventListener('keydown', escListener);
  };
}
