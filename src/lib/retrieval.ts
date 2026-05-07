import type { Memory } from '../types';

export function retrieveTopMemories(
  bank: Memory[],
  linkedIds: string[],
  rng: () => number = Math.random,
  count = 3,
): Memory[] {
  const byId = new Map(bank.map((m) => [m.id, m]));
  const pool: Memory[] = [];
  for (const id of linkedIds) {
    const mem = byId.get(id);
    if (mem) pool.push(mem);
  }
  if (pool.length < count) {
    throw new Error(`retrieveTopMemories: pool has ${pool.length} memories, need at least ${count}`);
  }
  const remaining = pool.slice();
  const out: Memory[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * remaining.length);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}
