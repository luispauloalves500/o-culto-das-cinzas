// Entrada: teclado, mouse (pointer lock) e Gamepad API mapeados em ações.
const KEYMAP = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'], light: ['Mouse0'], heavy: ['Mouse2'], block: ['KeyQ'], dodge: ['Space'],
  interact: ['KeyE'], inventory: ['Tab'], map: ['KeyM'], heal: ['KeyH'], swap: ['KeyR'], reload: ['KeyT'], repair: ['KeyG'], pause: ['Escape', 'KeyP'], debug: ['F3'],
};
// Botões padrão (layout "standard" da Gamepad API)
const PADMAP = { interact: 0, dodge: 1, inventory: 3, light: 5, block: 6, heavy: 7, pause: 9, run: 10, heal: 2, map: 8, swap: 4, reload: 12, repair: 13 }; // 12/13 = direcional cima/baixo

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.locked = false;
    this.padPrev = {};
    this.padDown = new Set(); this.padPressed = new Set();
    this.padMove = { x: 0, y: 0 }; this.padLook = { x: 0, y: 0 };
    this.enabled = true;

    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'F3', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    canvas.addEventListener('mousedown', (e) => {
      const c = 'Mouse' + e.button;
      if (!this.down.has(c)) this.pressed.add(c);
      this.down.add(c);
    });
    window.addEventListener('mouseup', (e) => this.down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    // Perda de foco: limpa entradas para o personagem não andar sozinho
    window.addEventListener('blur', () => this.clear());
    window.addEventListener('gamepaddisconnected', () => this.clear());
  }

  requestLock() {
    try { const p = this.canvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch (e) { /* ignorado */ }
  }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  clear() {
    this.down.clear(); this.pressed.clear(); this.padDown.clear(); this.padPressed.clear();
    this.mouseDX = this.mouseDY = 0; this.padMove = { x: 0, y: 0 }; this.padLook = { x: 0, y: 0 };
  }

  pollGamepad() {
    this.padPressed.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p && p.connected);
    if (!gp) { this.padDown.clear(); this.padMove = { x: 0, y: 0 }; this.padLook = { x: 0, y: 0 }; return; }
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    this.padMove = { x: dz(gp.axes[0] || 0), y: -dz(gp.axes[1] || 0) };
    this.padLook = { x: dz(gp.axes[2] || 0), y: dz(gp.axes[3] || 0) };
    for (const [action, idx] of Object.entries(PADMAP)) {
      const b = gp.buttons[idx];
      const isDown = !!(b && (b.pressed || b.value > 0.5));
      if (isDown && !this.padDown.has(action)) this.padPressed.add(action);
      if (isDown) this.padDown.add(action); else this.padDown.delete(action);
    }
  }

  isDown(action) {
    if (!this.enabled) return false;
    return (KEYMAP[action] || []).some((c) => this.down.has(c)) || this.padDown.has(action);
  }
  wasPressed(action) {
    if (!this.enabled) return false;
    return (KEYMAP[action] || []).some((c) => this.pressed.has(c)) || this.padPressed.has(action);
  }
  /** Eixo de movimento: x = direita, y = frente (−1..1) */
  moveAxis() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (this.isDown('forward')) y += 1;
    if (this.isDown('back')) y -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('left')) x -= 1;
    x += this.padMove.x; y += this.padMove.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  consumeLook() {
    const r = { dx: this.mouseDX, dy: this.mouseDY, px: this.padLook.x, py: this.padLook.y };
    this.mouseDX = this.mouseDY = 0;
    return r;
  }
  endFrame() { this.pressed.clear(); }
}
