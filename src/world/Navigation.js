// Grafo navegável por salas/portas (A*). Arestas que passam por portas fechadas ficam bloqueadas.
export class Navigation {
  constructor() { this.nodes = new Map(); }
  addNode(id, x, y, z) { this.nodes.set(id, { id, x, y, z, edges: [] }); }
  link(a, b, door = null) {
    const A = this.nodes.get(a), B = this.nodes.get(b);
    if (!A || !B) throw new Error(`nó inexistente ${a}/${b}`);
    A.edges.push({ to: b, door }); B.edges.push({ to: a, door });
  }
  /** nó mais próximo no mesmo nível com linha livre (se col fornecido) */
  nearest(p, col, maxDy = 1.5) {
    let best = null, bd = Infinity;
    for (const n of this.nodes.values()) {
      if (Math.abs(n.y - p.y) > maxDy) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d >= bd) continue;
      if (col && !col.segmentClear({ x: p.x, y: p.y + 1, z: p.z }, { x: n.x, y: n.y + 1, z: n.z }, (b) => b.tag !== 'prop')) continue;
      bd = d; best = n;
    }
    return best;
  }
  findPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const open = new Set([fromId]);
    const came = new Map();
    const g = new Map([[fromId, 0]]);
    const h = (id) => { const a = this.nodes.get(id), b = this.nodes.get(toId); return Math.hypot(a.x - b.x, a.z - b.z); };
    const f = new Map([[fromId, h(fromId)]]);
    while (open.size) {
      let cur = null, cf = Infinity;
      for (const id of open) { const v = f.get(id); if (v < cf) { cf = v; cur = id; } }
      if (cur === toId) {
        const path = [cur];
        while (came.has(cur)) { cur = came.get(cur); path.unshift(cur); }
        return path;
      }
      open.delete(cur);
      const cn = this.nodes.get(cur);
      for (const e of cn.edges) {
        if (e.door && !e.door.open) continue;
        const nn = this.nodes.get(e.to);
        const ng = g.get(cur) + Math.hypot(nn.x - cn.x, nn.z - cn.z);
        if (ng < (g.get(e.to) ?? Infinity)) {
          came.set(e.to, cur); g.set(e.to, ng); f.set(e.to, ng + h(e.to)); open.add(e.to);
        }
      }
    }
    return null;
  }
}
