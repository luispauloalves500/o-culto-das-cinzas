// pt56u/pt57u: armários GLB (public/models/armario.glb) com abertura procedural.
// O GLB é monolítico (1 mesh, sem clipes/skins): o corpo é o modelo; duas portas de metal
// procedurais na face frontal giram na dobradiça (estilo armário médico/hospitalar).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const ARMARIO_URL = './models/armario.glb';
/** tamanho nativo do mesh otimizado (m) */
export const ARMARIO_NATIVE = { w: 0.5362, h: 1.9061, d: 0.5440 };

let _shared = null;
export function cabinetsEnabled() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !/[?&]cabinetglb=0\b/.test(window.location?.search || '');
}
export function loadCabinetModel() {
  if (_shared) return _shared;
  _shared = new Promise((res, rej) => new GLTFLoader().load(ARMARIO_URL, (g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.geometry.userData.shared = true; o.castShadow = true; o.receiveShadow = true; } });
    res(g);
  }, undefined, rej));
  _shared.catch(() => {});
  return _shared;
}
export function preloadCabinets() { if (cabinetsEnabled()) loadCabinetModel().catch(() => {}); }

const FACE_YAW = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };

/**
 * Armário: AABB do cenário + face das portas ('+x'|'-x'|'+z'|'-z').
 * Colisão = caixa fechada (sempre). Abrir/fechar: portas gêmeas ~110° na dobradiça.
 */
export class Cabinet {
  constructor(o, ctx) {
    Object.assign(this, { open: false, t: 0, label: 'armário', face: '+z', interactive: true }, o);
    this.ctx = ctx;
    const dx = o.maxX - o.minX, dy = o.maxY - o.minY, dz = o.maxZ - o.minZ;
    this.cx = (o.minX + o.maxX) / 2; this.cy = (o.minY + o.maxY) / 2; this.cz = (o.minZ + o.maxZ) / 2;
    const alongX = this.face === '+x' || this.face === '-x';
    this.frontW = alongX ? dz : dx;
    this.depth = alongX ? dx : dz;
    this.height = dy;

    this.root = new THREE.Group();
    this.root.position.set(this.cx, this.cy, this.cz);
    this.root.rotation.y = FACE_YAW[this.face] ?? 0;
    this.orient = new THREE.Group(); this.root.add(this.orient);

    // interior escuro (visível com as portas abertas)
    const inn = new THREE.Mesh(new THREE.BoxGeometry(this.frontW * 0.92, this.height * 0.92, this.depth * 0.85),
      new THREE.MeshLambertMaterial({ color: 0x0c0e10 }));
    inn.position.z = -this.depth * 0.02; inn.castShadow = false; this.orient.add(inn);
    for (const y of [-0.15, 0.2].map((f) => f * this.height)) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(this.frontW * 0.88, 0.025, this.depth * 0.7),
        new THREE.MeshLambertMaterial({ color: 0x1a1e22 }));
      sh.position.set(0, y, -this.depth * 0.05); this.orient.add(sh);
    }

    // portas gêmeas (procedurais) na face +Z local
    const doorMat = ctx.materials?.metal || ctx.materials?.steelDark || new THREE.MeshStandardMaterial({ color: 0x6a7278, metalness: 0.7, roughness: 0.4 });
    const dW = this.frontW * 0.495, dH = this.height * 0.96, dT = 0.028;
    const zFront = this.depth / 2 + 0.01;
    this.doors = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * this.frontW * 0.5, 0, zFront);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(dW, dH, dT), doorMat);
      panel.position.set(-side * dW / 2, 0, dT / 2); panel.castShadow = true;
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), ctx.materials?.steel || doorMat);
      knob.position.set(-side * 0.08, 0, dT + 0.02); panel.add(knob);
      pivot.add(panel); this.orient.add(pivot);
      return { pivot, side, base: 0 };
    });

    this.body = null; // preenchido quando o GLB carrega
    this.ready = cabinetsEnabled()
      ? loadCabinetModel().then((g) => this._attach(g)).catch((e) => { console.warn('[armário] GLB indisponível:', e?.message || e); return false; })
      : Promise.resolve(false);

    ctx.group.add(this.root);
    this.collider = ctx.col.addBox(o.minX, o.minY, o.minZ, o.maxX, o.maxY, o.maxZ, { tag: 'prop', ref: this, blocksSight: true });
    this.interactPos = {
      x: this.cx + (this.face === '+x' ? dx / 2 + 0.35 : this.face === '-x' ? -dx / 2 - 0.35 : 0),
      y: this.cy,
      z: this.cz + (this.face === '+z' ? dz / 2 + 0.35 : this.face === '-z' ? -dz / 2 - 0.35 : 0),
    };
  }

  _attach(g) {
    const model = g.scene.clone(true);
    const N = ARMARIO_NATIVE;
    model.scale.set(this.frontW / N.w, this.height / N.h, this.depth / N.d);
    // o mesh nativo tem o "frente" em +Z; portas procedurais cobrem essa face
    this.orient.add(model); this.body = model;
    // esconde a textura da porta do GLB sob as portas procedurais (já na frente); ok
    return true;
  }

  setOpen(open, instant = false) {
    if (this.open === open) return;
    this.open = open;
    if (instant) this.t = open ? 1 : 0;
    if (!instant) this.ctx.audio?.play('door', { x: this.cx, y: this.cy, z: this.cz });
  }
  toggle() { this.setOpen(!this.open); }

  update(dt) {
    const target = this.open ? 1 : 0;
    if (this.t !== target) {
      const sp = dt / 0.65;
      this.t = target > this.t ? Math.min(1, this.t + sp) : Math.max(0, this.t - sp);
    }
    const e = this.t * this.t * (3 - 2 * this.t);
    const ang = e * (110 * Math.PI / 180);
    for (const d of this.doors) d.pivot.rotation.y = -d.side * ang;
    // aberto: o foco E vai para a dobradiça (lado −), liberando a boca do armário para itens
    const alongX = this.face === '+x' || this.face === '-x';
    const front = (this.open ? 0.15 : 0.35);
    const side = this.open ? this.frontW * 0.55 : 0;
    const fx = this.face === '+x' ? 1 : this.face === '-x' ? -1 : 0;
    const fz = this.face === '+z' ? 1 : this.face === '-z' ? -1 : 0;
    const sx = alongX ? 0 : -1, sz = alongX ? -1 : 0;
    this.interactPos.x = this.cx + fx * ((alongX ? this.depth : this.frontW) / 2 + front) + sx * side;
    this.interactPos.z = this.cz + fz * ((alongX ? this.frontW : this.depth) / 2 + front) + sz * side;
    if (this._interact) this._interact.radius = this.open ? 0.75 : 1.35;
  }

  serialize() { return { open: this.open }; }
  restore(s) { if (!s) return; this.setOpen(!!s.open, true); this.update(0); }
}

/** cria e registra um armário a partir do AABB do sbox antigo; devolve a instância */
export function placeCabinet(level, o) {
  if (!level.cabinets) level.cabinets = {};
  const ctx = { materials: level.M || level.game.materials, group: level.b.group, col: level.game.col, audio: level.game.audio };
  const c = new Cabinet(o, ctx);
  level.cabinets[o.id] = c;
  return c;
}

/** registra interação E em todos os armários do nível */
export function wireCabinetInteractions(game, level) {
  if (!level.cabinets) return;
  for (const id in level.cabinets) {
    const c = level.cabinets[id];
    if (c.interactive === false) continue;
    const it = {
      id: 'cabinet_' + id, pos: c.interactPos, radius: 1.35,
      // aberto: cede o foco E a um pickup próximo (ex.: munição dentro do armário)
      enabled: () => {
        if (!c.open) return true;
        const p = game.player?.pos; if (!p) return true;
        return !game.interact.list.some((o) => {
          if (o === it || !String(o.id).startsWith('pick_')) return false;
          const en = typeof o.enabled === 'function' ? o.enabled() : o.enabled;
          if (!en) return false;
          return Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 1.5;
        });
      },
      prompt: () => (c.open ? 'Fechar ' : 'Abrir ') + c.label,
      onInteract: () => {
        c.toggle();
        game.quest?.set('cabinet_' + id, c.open);
        game.perception?.noise?.({ x: c.cx, y: c.cy, z: c.cz }, 7, 'cabinet');
      },
    };
    c._interact = it;
    game.interact.add(it);
  }
}

export function updateCabinets(level, dt) {
  if (!level.cabinets) return;
  for (const id in level.cabinets) level.cabinets[id].update(dt);
}

export function restoreCabinets(level, flags) {
  if (!level.cabinets || !flags) return;
  for (const id in level.cabinets) {
    if (flags['cabinet_' + id]) level.cabinets[id].restore({ open: true });
  }
}
