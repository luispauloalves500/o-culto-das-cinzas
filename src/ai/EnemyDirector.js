// Coordenação: limita quantos inimigos atacam ao mesmo tempo (evita enxame injusto).
export class EnemyDirector {
  constructor(maxAttackers = 2) { this.max = maxAttackers; this.holders = new Set(); }
  request(e) {
    if (this.holders.has(e)) return true;
    if (this.holders.size >= this.max) return false;
    this.holders.add(e); return true;
  }
  release(e) { this.holders.delete(e); }
  clear() { this.holders.clear(); }
}
