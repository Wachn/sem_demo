import type { Store } from '../lib/store';
import type { Lang } from '../types';

export function mountLanguageSelector(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="mode-toggle" role="tablist" aria-label="Language">
      <button data-lang="en" role="tab" class="mode-btn">EN</button>
      <button data-lang="zh" role="tab" class="mode-btn">中文</button>
    </div>
  `;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-lang]'));
  const render = () => {
    const active = store.getState().language;
    for (const b of buttons) {
      b.classList.toggle('is-active', b.dataset.lang === active);
      b.setAttribute('aria-selected', b.dataset.lang === active ? 'true' : 'false');
    }
  };
  for (const b of buttons) {
    b.addEventListener('click', () => store.setLanguage(b.dataset.lang as Lang));
  }
  const off = store.subscribe(render);
  render();
  return off;
}
