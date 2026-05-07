import type { Store } from '../lib/store';

export function mountMemoryBankView(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span>ReasoningBank</span><span class="bank-count" data-role="count"></span></div>
    <div class="bank-filter">
      <input type="text" placeholder="filter by tag…" data-role="filter" />
    </div>
    <div class="bank-list" data-role="list"></div>
  `;
  const list = root.querySelector<HTMLDivElement>('[data-role="list"]')!;
  const countEl = root.querySelector<HTMLSpanElement>('[data-role="count"]')!;
  const input = root.querySelector<HTMLInputElement>('[data-role="filter"]')!;
  let filter = '';

  input.addEventListener('input', () => {
    filter = input.value.trim().toLowerCase();
    render();
  });

  list.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLDivElement>('.mem-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (id) store.setInspectedMemory(id);
  });

  function render() {
    const s = store.getState();
    const all = s.bank.slice().reverse();
    const filtered = filter ? all.filter((m) => m.tags.some((t) => t.toLowerCase().includes(filter))) : all;
    countEl.textContent = `${filtered.length} / ${all.length}`;
    list.innerHTML = filtered
      .map((m) => {
        const isNew = m.id === s.newlyLearnedMemoryId ? ' is-new' : '';
        const flag = m.origin === 'learned' ? '<span class="origin-flag">learned</span>' : '';
        const tags = m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');
        return `<div class="mem-card${isNew}" data-id="${esc(m.id)}">
          <div class="title">${esc(m.title)}${flag}</div>
          <div class="desc">${esc(m.description)}</div>
          <div class="tags">${tags}</div>
        </div>`;
      })
      .join('');
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const off = store.subscribe(render);
  render();
  return off;
}
