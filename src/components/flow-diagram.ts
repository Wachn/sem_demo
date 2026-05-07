import type { Store } from '../lib/store';
import { ui } from '../lib/i18n';

interface NodeDef {
  id: string;
  x: number;
  y: number;
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
  { id: 'node-input',       x:  20, y: 200, icon: 'I' },
  { id: 'node-query',       x: 240, y: 200, icon: 'Q' },
  { id: 'node-bank',        x: 240, y:  60, icon: 'B' },
  { id: 'node-agent',       x: 460, y: 200, icon: 'A' },
  { id: 'node-adversary',   x: 680, y:  60, icon: 'X' },
  { id: 'node-environment', x: 680, y: 200, icon: 'E' },
  { id: 'node-judge',       x: 880, y: 340, icon: 'J' },
];

const EDGES: EdgeDef[] = [
  { id: 'edge-input-query',       fromId: 'node-input',       toId: 'node-query' },
  { id: 'edge-query-agent',       fromId: 'node-query',       toId: 'node-agent' },
  { id: 'edge-bank-agent',        fromId: 'node-bank',        toId: 'node-agent' },
  { id: 'edge-agent-adversary',   fromId: 'node-agent',       toId: 'node-adversary' },
  { id: 'edge-adversary-agent',   fromId: 'node-adversary',   toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.4 } },
  { id: 'edge-agent-environment', fromId: 'node-agent',       toId: 'node-environment' },
  { id: 'edge-environment-agent', fromId: 'node-environment', toId: 'node-agent', fromAnchor: { x: 0.0, y: 0.6 }, toAnchor: { x: 1.0, y: 0.6 } },
  { id: 'edge-agent-judge',       fromId: 'node-agent',       toId: 'node-judge' },
  { id: 'edge-judge-bank',        fromId: 'node-judge',       toId: 'node-bank' },
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
    <div class="panel-header"><span data-role="title"></span><span class="diagram-stage" data-role="stage"></span></div>
    <div class="flow-svg-wrap">
      <svg class="flow-svg" viewBox="0 0 1100 460" preserveAspectRatio="xMidYMid meet">
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

  const titleEl = root.querySelector<HTMLSpanElement>('[data-role="title"]')!;
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
    fo.setAttribute('data-node-fo', n.id);
    fo.innerHTML = `
      <div xmlns="http://www.w3.org/1999/xhtml" class="flow-node" data-node-id="${n.id}">
        <div class="node-title"><span class="node-icon">${n.icon}</span><span data-role="title"></span></div>
        <div class="node-sub" data-role="sub"></div>
      </div>
    `;
    nodesG.appendChild(fo);
  }

  function effectivePos(id: string): { x: number; y: number } {
    const stored = store.getState().nodePositions[id];
    if (stored) return stored;
    const def = nodeById.get(id)!;
    return { x: def.x, y: def.y };
  }

  function applyPositions() {
    nodesG.querySelectorAll<SVGForeignObjectElement>('foreignObject[data-node-fo]').forEach((fo) => {
      const id = fo.getAttribute('data-node-fo')!;
      const p = effectivePos(id);
      fo.setAttribute('x', String(p.x));
      fo.setAttribute('y', String(p.y));
    });
    edgesG.querySelectorAll<SVGPathElement>('.flow-edge').forEach((el) => {
      const id = el.getAttribute('data-edge-id') ?? '';
      const e = EDGES.find((x) => x.id === id);
      if (!e) return;
      const fromDef = { ...nodeById.get(e.fromId)!, ...effectivePos(e.fromId) };
      const toDef = { ...nodeById.get(e.toId)!, ...effectivePos(e.toId) };
      el.setAttribute('d', edgePath(fromDef, toDef, e));
    });
  }

  // Drag state
  let dragId: string | null = null;
  let startPointer: { x: number; y: number } | null = null;
  let startNodePos: { x: number; y: number } | null = null;
  let dragMoved = 0;
  const svg = root.querySelector<SVGSVGElement>('.flow-svg')!;

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const inv = ctm.inverse();
    const out = pt.matrixTransform(inv);
    return { x: out.x, y: out.y };
  }

  nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
    el.addEventListener('pointerdown', (ev) => {
      const id = el.getAttribute('data-node-id'); if (!id) return;
      dragId = id;
      dragMoved = 0;
      startPointer = svgPoint(ev.clientX, ev.clientY);
      startNodePos = effectivePos(id);
      el.classList.add('is-dragging');
      el.setPointerCapture?.(ev.pointerId);
    });
    el.addEventListener('pointermove', (ev) => {
      if (!dragId || dragId !== el.getAttribute('data-node-id') || !startPointer || !startNodePos) return;
      const cur = svgPoint(ev.clientX, ev.clientY);
      const dx = cur.x - startPointer.x;
      const dy = cur.y - startPointer.y;
      dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
      store.setNodePosition(dragId, { x: startNodePos.x + dx, y: startNodePos.y + dy });
    });
    const release = (ev: PointerEvent) => {
      if (dragId !== el.getAttribute('data-node-id')) return;
      el.classList.remove('is-dragging');
      el.releasePointerCapture?.(ev.pointerId);
      const wasDrag = dragMoved > 4;
      dragId = null; startPointer = null; startNodePos = null;
      if (wasDrag) {
        const onClick = (e: MouseEvent) => { e.stopPropagation(); el.removeEventListener('click', onClick, true); };
        el.addEventListener('click', onClick, true);
      }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

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
    applyPositions();
    const s = store.getState();
    titleEl.textContent = ui('panel.flow', s.language);
    stageLabel.textContent = `${ui('diagram.stage', s.language)}: ${s.stage}`;
    nodesG.querySelectorAll<HTMLDivElement>('.flow-node').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      el.classList.toggle('is-active', id === s.highlightedNodeId);
      el.classList.toggle('is-inspected', id === s.inspectedNodeId);
      const titleSpan = el.querySelector<HTMLSpanElement>('[data-role="title"]')!;
      const subEl = el.querySelector<HTMLDivElement>('[data-role="sub"]')!;
      const key = (id ?? '').replace('node-', '');
      titleSpan.textContent = ui(`node.${key}` as any, s.language);
      subEl.textContent = ui(`node.${key}.sub` as any, s.language);
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
