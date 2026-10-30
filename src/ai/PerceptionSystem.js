// Percepção: visão (distância + ângulo + oclusão por raycast) e audição (eventos de ruído atenuados por paredes).
export class PerceptionSystem {
  constructor(col) { this.col = col; this.events = []; }

  noise(pos, radius, kind = 'generic') {
    this.events.push({ x: pos.x, y: pos.y, z: pos.z, radius, kind });
  }

  /** visão: enemy precisa de pos, yaw, def.sight, def.fov, height */
  canSee(enemy, target) {
    if (!target.alive) return false;
    const eye = { x: enemy.pos.x, y: enemy.pos.y + enemy.def.height * 0.9, z: enemy.pos.z };
    const tc = target.chest();
    const dx = tc.x - eye.x, dz = tc.z - eye.z, dy = tc.y - eye.y;
    const d = Math.hypot(dx, dz);
    if (Math.abs(dy) > 3) return false;
    // percebe muito de perto mesmo de costas
    if (d > enemy.def.sight) return false;
    if (d > 1.8) {
      const fx = Math.sin(enemy.yaw), fz = Math.cos(enemy.yaw);
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1)))) * 180 / Math.PI;
      if (ang > enemy.def.fov) return false;
    }
    return this.col.segmentClear(eye, tc, (b) => b.blocksSight && b.tag !== 'prop-low');
  }

  /** ruído mais relevante ouvido por enemy neste passo (ou null) */
  hear(enemy) {
    let best = null, bs = 0;
    const ear = { x: enemy.pos.x, y: enemy.pos.y + 1.5, z: enemy.pos.z };
    for (const e of this.events) {
      if (Math.abs(e.y - enemy.pos.y) > 2.5) continue;
      const d = Math.hypot(e.x - ear.x, e.z - ear.z);
      let r = e.radius * enemy.def.hearing;
      if (d > r) continue;
      if (!this.col.segmentClear(ear, { x: e.x, y: e.y + 1.2, z: e.z }, (b) => b.tag === 'wall' || b.tag === 'door')) r *= 0.5;
      if (d > r) continue;
      const s = 1 - d / r;
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }

  endStep() { this.events.length = 0; }
}
