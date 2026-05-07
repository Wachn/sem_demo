import type { Store } from '../lib/store';

interface NodeDef {
  id: string;
  x: number;
  y: number;
  title: string;
  sub: string;
  icon: string;
}
interface EdgeDef {
  id: string;
  fromId: string;
  toId: string;
  fromAnchor?: { x: number; y: number };
  toAnchor?: { x: number; y: number };
}

const NODE_W = 180;
const NODE_H = 76;

const NODES: NodeDef[] = [
  { id: 'node-input',     x:  20, y: 200, title: 'Input',           sub: 'duality modes',           icon: 'I' },
  { id: 'node-query',     x: 240, y: 200, title: 'User Query',      sub: 'auto-report or doubt',    icon: 'Q' },
  { id: 'node-bank',      x: 240, y:  60, title: 'ReasoningBank',   sub: 'memory store',            icon: 'B' },
  { id: 'node-agent',     x: 460, y: 200, title: 'Agent (LLM)',     sub: 'plans actions',           icon: 'A' },
  { id: 'node-adversary', x: 680, y:  60, title: 'Adversary',       sub: 'pseudo-environment',      icon: 'X' },
  { id: 'node-judge',     x: 680, y: 340, title: 'Judge',           sub: 'success / failure',       icon: 'J' },
];

const EDGES: EdgeDef[] = [
  { id: 'edge-input-query',     fromId: 'node-input',     toId: 'node-query' },
  { id: 'edge-query-agent',     fromId: 'node-query',     toId: 'node-agent' },
  { id: 'edge-bank-agent',      fromId: 'node-bank',      toId: 'node-agent' },
  { id: 'edge-agent-adversary', fromId: 'node-agent',     toId: 'node-adversary' },
  { id: 'edge-adversary-agent', fromId: 'node-adversary', toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.4 } },
  { id: 'edge-agent-judge',     fromId: 'node-agent',     toId: 'node-judge' },
  { id: 'edge-judge-bank',      fromId: 'node-judge',     toId: 'node-bank' },
];

function nodeAnchor(n: NodeDef, anchor: { x: number; y: number }) {
  return { x: n.x + anchor.x * NODE_W, y: n.y + anchor.y * NODE_H };
}

function edgePath(from: NodeDef, to: NodeDef, e: EdgeDef): string {
  const a = nodeAnchor(from, e.fromAnchor ?? { x: 1.0, y: 0.5 });
  const b = nodeAnchor(to, e.toAnchor ?? { x: 0.0, y: 0.5 });
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

export function mountFlowDiagram(root: HTMLElement, store: Store): () => void {
  root.innerHTML = `
    <div class="panel-header"><span>Flow Diagram</span><span class="diagram-stage" data-role="stage">stage: idle</span></div>
    <div class="flow-svg-wrap">
      <svg class="flow-svg" viewBox="0 0 900 460" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrow" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrow is-active" />
          </marker>
        </defs>
        <g data-role="edges"></g>
        <g data-role="nodes"></g>
      </svg>
    </div>
  `;

  const edgesG = root.querySelector<SVGGElement>('[data-role="edges"]')!;
  const nodesG = root.querySelector<SVGGElement>('[data-role="nodes"]')!;
  const stageLabel = root.querySelector<HTMLElement>('[data-role="stage"]')!;
  const nodeById = new Map(NODES.map((n) => [n.id, n]));

  for (const e of EDGES) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edgePath(nodeById.get(e.fromId)!, nodeById.get(e.toId)!, e));
    path.setAttribute('class', 'flow-edge');
    path.setAttribute('marker-end', 'url(#arrow)');
    path.setAttribute('data-edge-id', e.id);
    edgesG.appendChild(path);
  }

  for (const n of NODES) {
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', String(n.x));
    fo.setAttribute('y', String(n.y));
    fo.setAttribute('width', String(NODE_W));
    fo.setAttribute('height', String(NODE_H));
    fo.innerHTML = `
      <div xmlns="http://www.w3.org/1999/xhtml" class="flow-node" data-node-id="${n.id}">
        <div class="node-title"><span class="node-icon">${n.icon}</span>${n.title}</div>
        <div class="node-sub">${n.sub}</div>
      </div>
    `;
    nodesG.appendChild(fo);
  }

  nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      const current = store.getState().inspectedNodeId;
      store.setInspectedNode(current === id ? null : id);
      if (current !== id) store.setInspectedMemory(null);
    });
  });

  const render = () => {
    const s = store.getState();
    stageLabel.textContent = `stage: ${s.stage}`;
    nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      el.classList.toggle('is-active', id === s.highlightedNodeId);
      el.classList.toggle('is-inspected', id === s.inspectedNodeId);
    });
    const activeEdgeIds = new Set(s.highlightedEdgeIds);
    edgesG.querySelectorAll<SVGPathElement>('.flow-edge').forEach((el) => {
      const id = el.getAttribute('data-edge-id') ?? '';
      const active = activeEdgeIds.has(id);
      el.classList.toggle('is-active', active);
      el.classList.toggle('is-pulsing', active);
      el.setAttribute('marker-end', active ? 'url(#arrow-active)' : 'url(#arrow)');
    });
  };

  const off = store.subscribe(render);
  render();
  return off;
}
