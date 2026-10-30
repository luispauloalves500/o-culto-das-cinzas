// Registro de objetos interativos (E): portas, itens, painéis, documentos, livros de registro.
export class Interactables {
  constructor() { this.list = []; }
  add(o) {
    // o: { id, pos:{x,y,z}, radius, prompt: string|fn, onInteract(game), enabled: bool|fn }
    this.list.push({ radius: 1.6, enabled: true, ...o });
    return o;
  }
  remove(id) { this.list = this.list.filter((i) => i.id !== id); }
  /** mais próximo à frente do jogador e no mesmo andar */
  findBest(pos, fwd) {
    let best = null, bestScore = Infinity;
    for (const it of this.list) {
      const en = typeof it.enabled === 'function' ? it.enabled() : it.enabled;
      if (!en) continue;
      const dx = it.pos.x - pos.x, dz = it.pos.z - pos.z, dy = it.pos.y - pos.y;
      if (dy < -0.8 || dy > 2.4) continue;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      const dot = d > 0.2 ? (dx * fwd.x + dz * fwd.z) / d : 1;
      if (dot < -0.1) continue;
      const score = d - dot * 0.6;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }
}
