// Mapa (tecla M): desenha em canvas 2D os cômodos conhecidos do andar escolhido, portas anotadas, marcos e o jogador.
import { MAP_MARKS, knownRooms, floorOf, doorFloor, roomAt, chapterFloors, mapChapter, FLOORS } from '../data/map.js';
import { lockedNotes } from './notes.js';

// limites do desenho por capítulo (o Bairro Operário se estende para o norte até a casa das fornalhas)
const BOUNDS = { 1: [-1, 47, -4, 39.5], 2: [-1, 58, -4, 97], 3: [-1, 37, -1, 59], 5: [-1, 47, -2, 69], 6: [-1, 47, -1, 85], 7: [2, 52, -1, 57], 8: [-23, 31, -1, 77] };

export class MapView {
  constructor(canvas) { this.canvas = canvas; this.floor = 'up'; }
  open(game) { this.floor = floorOf(game.player.pos.y); if (!chapterFloors().some((f) => f.id === this.floor)) this.floor = chapterFloors()[0].id; }
  cycle(dir) { const F = chapterFloors(), i = F.findIndex((f) => f.id === this.floor); this.floor = F[(i + dir + F.length) % F.length].id; }
  setFloor(i) { const F = chapterFloors(), f = FLOORS[i]; if (F.length > 1 && f && F.some((x) => x.id === f.id)) this.floor = f.id; }

  /** dados do mapa (testáveis sem DOM) */
  static model(game, floor) {
    const flags = game.quest.flags;
    const rooms = knownRooms(flags, floor);
    const near = (x, z) => rooms.some((r) => x >= r.rect[0] - 0.6 && x <= r.rect[2] + 0.6 && z >= r.rect[1] - 0.6 && z <= r.rect[3] + 0.6);
    const noted = new Set(lockedNotes(game).map((n) => n.id));
    const doors = [];
    for (const id in game.level?.doors || {}) {
      const d = game.level.doors[id];
      if (doorFloor(d.y) !== floor || !near(d.x, d.z)) continue;
      if (id === 'coldRoom' && !flags.seen_coldRoom) continue;
      doors.push({ id, x: d.x, z: d.z, axis: d.axis, w: d.width || 1.4, open: d.open, locked: d.locked, noted: noted.has(id), label: d.label });
    }
    const ids = new Set(rooms.map((r) => r.id));
    const marks = MAP_MARKS.filter((m) => (m.ch || 1) === mapChapter() && m.floor === floor && ids.has(m.room));
    return { rooms, doors, marks };
  }

  draw(game) {
    const c = this.canvas, ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const [X0, X1, Z0, Z1] = BOUNDS[mapChapter()] || BOUNDS[1];
    const s = Math.min((W - 20) / (X1 - X0), (H - 20) / (Z1 - Z0));
    const ox = (W - s * (X1 - X0)) / 2 - X0 * s, oz = (H - s * (Z1 - Z0)) / 2 - Z0 * s;
    const P = (x, z) => [ox + x * s, oz + z * s];
    ctx.fillStyle = '#0d0f0c'; ctx.fillRect(0, 0, W, H);
    // grade de papel
    ctx.strokeStyle = 'rgba(160,170,140,0.06)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(X0 / 2) * 2; x <= X1; x += 2) { const [a] = P(x, 0); ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(a, H); ctx.stroke(); }
    for (let z = Math.ceil(Z0 / 2) * 2; z <= Z1; z += 2) { const [, b] = P(0, z); ctx.beginPath(); ctx.moveTo(0, b); ctx.lineTo(W, b); ctx.stroke(); }
    const { rooms, doors, marks } = MapView.model(game, this.floor);
    const here = roomAt(game.player.pos);
    ctx.font = `${Math.max(9, Math.round(s * 0.7))}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of rooms) {
      const [a, b] = P(r.rect[0], r.rect[1]), [a2, b2] = P(r.rect[2], r.rect[3]);
      if (r.visited) {
        ctx.fillStyle = here && here.id === r.id ? 'rgba(150,140,90,0.45)' : 'rgba(95,110,85,0.38)'; ctx.fillRect(a, b, a2 - a, b2 - b);
        ctx.setLineDash([]); ctx.strokeStyle = '#a8b39a';
      } else { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(130,150,190,0.7)'; }
      ctx.lineWidth = 1.5; ctx.strokeRect(a, b, a2 - a, b2 - b);
      ctx.fillStyle = r.visited ? '#d8d2b8' : 'rgba(150,170,210,0.8)';
      if (a2 - a > 26) ctx.fillText(r.name, (a + a2) / 2, (b + b2) / 2, a2 - a - 4);
    }
    ctx.setLineDash([]);
    for (const d of doors) {
      const half = d.w / 2;
      const [a, b] = d.axis === 'x' ? P(d.x - half, d.z) : P(d.x, d.z - half);
      const [a2, b2] = d.axis === 'x' ? P(d.x + half, d.z) : P(d.x, d.z + half);
      ctx.lineWidth = 4;
      ctx.strokeStyle = d.locked ? (d.noted ? '#b0281c' : '#6a5a40') : d.open ? '#4a6040' : '#c9b98a';
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a2, b2); ctx.stroke();
      if (d.locked && d.noted) {
        const [cx, cz] = P(d.x, d.z), k = 5;
        ctx.lineWidth = 2; ctx.strokeStyle = '#ff4a3a';
        ctx.beginPath(); ctx.moveTo(cx - k, cz - k); ctx.lineTo(cx + k, cz + k); ctx.moveTo(cx + k, cz - k); ctx.lineTo(cx - k, cz + k); ctx.stroke();
      }
    }
    for (const m of marks) {
      const [x, z] = P(m.x, m.z);
      if (m.kind === 'save') { ctx.fillStyle = '#e0b060'; ctx.fillRect(x - 4, z - 4, 8, 8); }
      else if (m.kind === 'stairs') { ctx.strokeStyle = '#d8d2b8'; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 6, z + i * 3); ctx.lineTo(x + 6, z + i * 3); ctx.stroke(); } }
      else if (m.kind === 'fire') { ctx.fillStyle = (game.level?.furnace?.lit || game.level?.fireLit) ? '#ff6a20' : '#5a4a40'; ctx.beginPath(); ctx.moveTo(x, z - 7); ctx.lineTo(x + 6, z + 5); ctx.lineTo(x - 6, z + 5); ctx.fill(); }
    }
    // jogador
    const pl = game.player;
    if (floorOf(pl.pos.y) === this.floor) {
      const [x, z] = P(pl.pos.x, pl.pos.z), fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
      ctx.fillStyle = '#f0e8c8';
      ctx.beginPath(); ctx.moveTo(x + fx * 10, z + fz * 10); ctx.lineTo(x - fx * 5 + fz * 6, z - fz * 5 - fx * 6); ctx.lineTo(x - fx * 5 - fz * 6, z - fz * 5 + fx * 6); ctx.closePath(); ctx.fill();
    }
    return { rooms: rooms.length, doors: doors.length, noted: doors.filter((d) => d.noted).length };
  }
}
