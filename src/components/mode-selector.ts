import type { Store } from '../lib/store';
import type { Mode } from '../types';

export function mountModeSelector(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="mode-toggle" role="tablist" aria-label="Input mode">
      <button data-mode="fraud-signals" role="tab" class="mode-btn">Fraud Signals</button>
      <button data-mode="chat-messages" role="tab" class="mode-btn">Chat Messages</button>
    </div>
  `;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-mode]'));

  const render = () => {
    const active = store.getState().mode;
    for (const b of buttons) {
      b.classList.toggle('is-active', b.dataset.mode === active);
      b.setAttribute('aria-selected', b.dataset.mode === active ? 'true' : 'false');
    }
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const next = b.dataset.mode as Mode;
      const stage = store.getState().stage;
      if (stage !== 'idle' && stage !== 'done') return;
      store.setState((s) => ({
        ...s,
        mode: next,
        selectedQueryId: null,
      }));
    });
  }

  const off = store.subscribe(render);
  render();
  return off;
}
