// Portas reais: giram na dobradiça, colisor acompanha o estado, podem estar trancadas e persistem no save.
import * as THREE from 'three';

export class Door {
  /**
   * @param {object} o id, axis ('x' = porta numa parede ao longo de X), x, z, y, width, height,
   *   locked, lockMsg, canUnlock(player) → bool, kind ('hinged' | 'sliding'), swing (+1/−1), mat
   */
  constructor(o, ctx) {
    Object.assign(this, { width: 1.4, height: 2.3, kind: 'hinged', swing: 1, locked: false, lockMsg: 'Trancada.', label: 'porta' }, o);
    this.ctx = ctx;
    this.open = false;
    this.t = 0; // 0 fechada … 1 aberta
    this.pivot = new THREE.Group();
    this.pivot.position.set(o.x, o.y, o.z);
    const th = 0.09;
    const geo = new THREE.BoxGeometry(this.width - 0.04, this.height - 0.04, th);
    this.panel = new THREE.Mesh(geo, o.mat);
    this.panel.castShadow = true;
    if (this.axis === 'x') this.panel.position.set(this.width / 2, this.height / 2, 0);
    else { this.panel.rotation.y = Math.PI / 2; this.panel.position.set(0, this.height / 2, this.width / 2); }
    // a dobradiça fica na extremidade negativa do vão
    if (this.axis === 'x') this.pivot.position.x -= this.width / 2;
    else this.pivot.position.z -= this.width / 2;
    if (this.kind === 'sliding') this.pivot.position.copy(new THREE.Vector3(o.x, o.y, o.z)), this.panel.position.set(0, this.height / 2, 0);
    // janelinha / maçaneta
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), ctx.materials.metal);
    knob.position.set(this.axis === 'x' ? this.width - 0.18 : 0, 1.0, this.axis === 'x' ? 0 : this.width - 0.18);
    if (this.kind !== 'sliding') this.pivot.add(knob);
    this.pivot.add(this.panel);
    ctx.group.add(this.pivot);
    this.collider = ctx.col.addBox(0, 0, 0, 0, 0, 0, { tag: 'door', ref: this });
    this._applyCollider();
  }

  _applyCollider() {
    const { x, y, z, width: w, height: h } = this;
    const t = 0.1;
    if (!this.open) {
      if (this.axis === 'x') this.ctx.col.setBox(this.collider, x - w / 2, y, z - t, x + w / 2, y + h, z + t);
      else this.ctx.col.setBox(this.collider, x - t, y, z - w / 2, x + t, y + h, z + w / 2);
      this.collider.enabled = true;
    } else if (this.kind === 'sliding') {
      this.collider.enabled = false;
    } else {
      // painel aberto fica perpendicular à parede, junto à dobradiça
      const s = this.swing;
      if (this.axis === 'x') this.ctx.col.setBox(this.collider, x - w / 2 - t, y, z, x - w / 2 + t, y + h, z + s * w);
      else this.ctx.col.setBox(this.collider, x, y, z - w / 2 - t, x + s * w, y + h, z - w / 2 + t);
      this.collider.enabled = true;
    }
  }

  setOpen(open, instant = false) {
    if (this.open === open) return;
    this.open = open;
    if (instant) this.t = open ? 1 : 0;
    this._applyCollider();
    if (!instant) this.ctx.audio?.play('door', { x: this.x, y: this.y, z: this.z });
    this.ctx.bus?.emit(open ? 'DoorOpened' : 'DoorClosed', this);
  }

  update(dt) {
    const target = this.open ? 1 : 0;
    if (this.t !== target) {
      const sp = dt / 0.55;
      this.t = target > this.t ? Math.min(1, this.t + sp) : Math.max(0, this.t - sp);
    }
    const e = this.t * this.t * (3 - 2 * this.t);
    if (this.kind === 'sliding') {
      const off = e * (this.width - 0.1);
      if (this.axis === 'x') this.panel.position.x = off; else this.panel.position.z = off;
      this.panel.visible = e < 0.98;
    } else {
      // swing +1: abre para +z (eixo x) ou +x (eixo z)
      const ang = e * Math.PI / 2;
      this.pivot.rotation.y = this.axis === 'x' ? -ang * this.swing : ang * this.swing;
    }
  }

  serialize() { return { open: this.open, locked: this.locked }; }
  restore(s) { if (!s) return; this.locked = !!s.locked; this.setOpen(!!s.open, true); this.update(0); }
}
