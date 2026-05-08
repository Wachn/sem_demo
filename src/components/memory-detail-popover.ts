import type { Store } from '../lib/store';
import { ui, t } from '../lib/i18n';

export function mountMemoryDetailPopover(panelRoot: HTMLElement, store: Store): () => void {
  let backdrop: HTMLDivElement | null = null;
  let escListener: ((ev: KeyboardEvent) => void) | null = null;
  let editingId: string | null = null;
  let editError: string | null = null;
  const close = () => { editingId = null; editError = null; store.setInspectedMemory(null); };

  function render() {
    const s = store.getState();
    const id = s.inspectedMemoryId;
    if (!id) {
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
      editingId = null;
      editError = null;
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
      mem.origin === 'learned-success' ? `<span class="origin-flag is-success">${ui('mem.origin.success', lang)}</span>` :
      mem.origin === 'learned-failure' ? `<span class="origin-flag is-failure">${ui('mem.origin.failure', lang)}</span>` :
      `<span class="origin-flag">${ui('mem.origin.seed', lang)}</span>`;

    if (editingId === mem.id) {
      backdrop.innerHTML = `
        <div class="popover-window" role="dialog" aria-modal="true">
          <div class="pop-head">
            <div class="pop-title">${esc(t(mem.title, lang))}</div>
            ${flag}
            <button class="pop-close" data-role="cancel">${ui('inspect.close', lang)}</button>
          </div>
          <form class="editor-form" data-role="form">
            <div class="editor-row"><label>${ui('editor.title.en', lang)}</label><input name="titleEn" value="${esc(mem.title.en)}" /></div>
            <div class="editor-row"><label>${ui('editor.title.zh', lang)}</label><input name="titleZh" value="${esc(mem.title.zh)}" /></div>
            <div class="editor-row"><label>${ui('editor.desc.en', lang)}</label><textarea name="descEn">${esc(mem.description.en)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.desc.zh', lang)}</label><textarea name="descZh">${esc(mem.description.zh)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.content.en', lang)}</label><textarea name="contentEn" rows="5">${esc(mem.content.en)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.content.zh', lang)}</label><textarea name="contentZh" rows="5">${esc(mem.content.zh)}</textarea></div>
            <div class="editor-row"><label>${ui('editor.tags', lang)}</label><input name="tags" value="${esc(mem.tags.join(', '))}" /></div>
          </form>
          ${editError ? `<div class="editor-error">${esc(editError)}</div>` : ''}
          <div class="editor-actions">
            <button class="btn-danger" data-role="delete">${ui('editor.delete', lang)}</button>
            <button class="btn-ghost" data-role="cancel">${ui('editor.cancel', lang)}</button>
            <button class="btn-primary" data-role="save">${ui('editor.save', lang)}</button>
          </div>
        </div>
      `;
      const form = backdrop.querySelector<HTMLFormElement>('[data-role="form"]')!;
      backdrop.querySelector<HTMLButtonElement>('button[data-role="save"]')!.addEventListener('click', () => {
        const fd = new FormData(form);
        const get = (k: string) => String(fd.get(k) ?? '').trim();
        const titleEn = get('titleEn'), titleZh = get('titleZh');
        const descEn = get('descEn'), descZh = get('descZh');
        const contentEn = get('contentEn'), contentZh = get('contentZh');
        const tagsRaw = get('tags');
        if (!titleEn || !titleZh || !descEn || !descZh || !contentEn || !contentZh || !tagsRaw) {
          editError = ui('editor.required', lang);
          render();
          return;
        }
        const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
        store.updateMemory(mem.id, {
          title: { en: titleEn, zh: titleZh },
          description: { en: descEn, zh: descZh },
          content: { en: contentEn, zh: contentZh },
          tags,
        });
        editingId = null;
        editError = null;
        render();
      });
      backdrop.querySelector<HTMLButtonElement>('button[data-role="delete"]')!.addEventListener('click', () => {
        if (window.confirm(ui('editor.deleteConfirm', lang))) {
          store.deleteMemory(mem.id);
          close();
        }
      });
      backdrop.querySelectorAll<HTMLButtonElement>('button[data-role="cancel"]').forEach((b) => {
        b.addEventListener('click', () => { editingId = null; editError = null; render(); });
      });
    } else {
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
          <div class="editor-actions">
            <button class="btn-primary" data-role="edit">${ui('editor.edit', lang)}</button>
          </div>
        </div>
      `;
      backdrop.querySelector<HTMLButtonElement>('button[data-role="close"]')!.addEventListener('click', close);
      backdrop.querySelector<HTMLButtonElement>('button[data-role="edit"]')!.addEventListener('click', () => {
        editingId = mem.id;
        editError = null;
        render();
      });
    }
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const off = store.subscribe(render);
  render();
  return () => { off(); if (backdrop) backdrop.remove(); if (escListener) document.removeEventListener('keydown', escListener); };
}
