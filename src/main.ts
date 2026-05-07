import './styles/main.css';
import './styles/layout.css';
import './styles/flow-diagram.css';
import './styles/chat-panel.css';
import './styles/active-pane.css';
import { createStore } from './lib/store';
import { mountModeSelector } from './components/mode-selector';
import { mountFlowDiagram } from './components/flow-diagram';
import { mountChatPanel } from './components/chat-panel';
import { mountActivePane } from './components/active-pane';
import { mountMemoryBankView } from './components/memory-bank-view';
import { mountMemoryDetailPopover } from './components/memory-detail-popover';
import { runDemo } from './lib/stage-runner';

const app = document.getElementById('app');
if (!app) throw new Error('main.ts: #app root not found');

const store = createStore();
mountModeSelector(document.getElementById('mode-selector')!, store);
mountFlowDiagram(document.getElementById('flow-diagram')!, store);
mountChatPanel(document.getElementById('chat-panel')!, store);
mountActivePane(document.getElementById('active-pane')!, store);
mountMemoryBankView(document.getElementById('memory-bank-view')!, store);
mountMemoryDetailPopover(document.getElementById('active-pane')!, store);

const status = document.getElementById('status-caption');
const runBtn = document.getElementById('run-button') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-button') as HTMLButtonElement;

let running = false;

function syncButtons() {
  const s = store.getState();
  runBtn.disabled = running || !s.selectedQueryId || (s.stage !== 'idle' && s.stage !== 'done');
  resetBtn.disabled = running;
}

store.subscribe((s) => {
  if (status) status.textContent = s.caption;
  if (running) runBtn.textContent = 'Running…';
  else if (s.stage === 'done') runBtn.textContent = 'Run again';
  else runBtn.textContent = 'Run demo';
  syncButtons();
});

runBtn.addEventListener('click', async () => {
  const id = store.getState().selectedQueryId;
  if (!id || running) return;
  running = true;
  runBtn.textContent = 'Running…';
  syncButtons();
  try {
    await runDemo(store, id);
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Demo run failed — see console.';
  } finally {
    running = false;
    syncButtons();
  }
});

resetBtn.addEventListener('click', () => {
  if (running) return;
  store.reset();
});

syncButtons();
