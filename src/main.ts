import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountLanguageSelector } from './components/language-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';
import { mountMemoryBankView } from './components/memory-bank-view';
import { mountMemoryDetailPopover } from './components/memory-detail-popover';
import { runDemo } from './lib/stage-runner';
import { ui } from './lib/i18n';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountLanguageSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);
mountMemoryBankView(document.getElementById('memory-bank-view')!, store);
mountMemoryDetailPopover(document.getElementById('active-pane')!, store);

const status = document.getElementById('status-caption');
const runBtn = document.getElementById('run-button') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-button') as HTMLButtonElement;
const brandEl = document.querySelector<HTMLSpanElement>('.brand-name')!;

let running = false;

function syncButtons() {
  const s = store.getState();
  runBtn.disabled = running || !s.selectedQueryId || (s.stage !== 'idle' && s.stage !== 'done');
  resetBtn.disabled = running;
  resetBtn.textContent = ui('header.reset', s.language);
  brandEl.textContent = ui('brand.name', s.language);
}

store.subscribe((s) => {
  if (status) status.textContent = s.caption || ui('caption.idle', s.language);
  if (running) runBtn.textContent = ui('header.run.running', s.language);
  else if (s.stage === 'done') runBtn.textContent = ui('header.run.again', s.language);
  else runBtn.textContent = ui('header.run', s.language);
  syncButtons();
});

runBtn.addEventListener('click', async () => {
  const id = store.getState().selectedQueryId;
  if (!id || running) return;
  running = true; syncButtons();
  try { await runDemo(store, id); }
  catch (err) { console.error(err); if (status) status.textContent = 'Demo run failed — see console.'; }
  finally { running = false; syncButtons(); }
});

resetBtn.addEventListener('click', () => { if (!running) store.reset(); });

const init = store.getState();
if (status) status.textContent = ui('caption.idle', init.language);
syncButtons();
