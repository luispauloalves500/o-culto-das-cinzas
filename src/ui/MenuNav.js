// Navegação por teclado e gamepad nos menus (pt63u): foco visível, setas/D-pad,
// confirmar e voltar, sliders com esquerda/direita e sons curtos.
const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'options', 'pause', 'saves', 'inventory', 'map', 'reader', 'dead', 'chapterEnd', 'credits', 'loading', 'clickToPlay'];

export function visibleScreen() {
  for (const id of SCREENS) {
    const el = $(id);
    if (el && !el.classList.contains('hidden')) return id;
  }
  return null;
}

export function collectNav(root) {
  if (!root) return [];
  const sel = 'button, input, select, textarea, [data-nav], .doc-item, .save-slot, .map-tab, .inv-item[data-nav]';
  return [...root.querySelectorAll(sel)].filter((el) => {
    if (el.disabled) return false;
    if (el.classList.contains('hidden')) return false;
    if (el.closest('.hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

export function moveIndex(n, i, dir) {
  if (n <= 0) return 0;
  return (i + dir % n + n * 8) % n;
}

export function nudgeRange(el, dir) {
  if (!el || el.tagName !== 'INPUT' || el.type !== 'range') return false;
  const min = el.min === '' ? 0 : +el.min, max = el.max === '' ? 1 : +el.max;
  const step = el.step === '' || el.step === 'any' ? (max - min) / 20 : +el.step;
  const next = Math.max(min, Math.min(max, +el.value + dir * (step || 1)));
  if (next === +el.value) return true;
  el.value = String(next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

export function nudgeSelect(el, dir) {
  if (!el || el.tagName !== 'SELECT') return false;
  const opts = [...el.options].filter((o) => !o.disabled);
  if (!opts.length) return true;
  let i = opts.indexOf(el.selectedOptions[0]);
  i = Math.max(0, Math.min(opts.length - 1, i + dir));
  if (opts[i] && el.value !== opts[i].value) {
    el.value = opts[i].value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}

export function activateEl(el) {
  if (!el) return false;
  if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
    el.checked = !el.checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'range')) return true;
  el.click();
  return true;
}

export class MenuNav {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.i = 0;
    this.screen = null;
    this._repeat = 0;
    this._hold = 0;
    this._lastDir = 0;
  }

  refresh(prefer) {
    const name = visibleScreen();
    this.screen = name;
    const root = name ? $(name) : null;
    const items = collectNav(root);
    const prev = prefer || (this.items[this.i] || null);
    this.items = items;
    let i = prev ? items.indexOf(prev) : 0;
    if (i < 0) i = 0;
    this.i = i;
    this._paint();
  }

  _paint() {
    for (const el of this.items) el.classList.remove('nav-focus');
    const el = this.items[this.i];
    if (!el) return;
    el.classList.add('nav-focus');
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  _sound(name) {
    try { this.game.audio?.play?.(name); } catch (e) { /* áudio ainda fechado */ }
  }

  _move(dir) {
    if (!this.items.length) return;
    this.i = moveIndex(this.items.length, this.i, dir);
    this._paint();
    this._sound('ui');
  }

  _nudge(dir) {
    const el = this.items[this.i];
    if (!el) return;
    if (nudgeRange(el, dir) || nudgeSelect(el, dir)) this._sound('ui');
  }

  _confirm() {
    const el = this.items[this.i];
    if (!el) return;
    this._sound('ui_ok');
    activateEl(el);
  }

  _back() {
    const g = this.game, name = visibleScreen();
    this._sound('ui_back');
    if (name === 'options') { g.menus.show(g.menus.optionsReturn || 'menu'); return; }
    if (name === 'saves') {
      if (!$('savesConfirm')?.classList.contains('hidden')) { g.menus.cancelSaveDelete?.(); return; }
      g.menus.closeSaves?.();
      return;
    }
    if (name === 'pause') { g.resume(); return; }
    if (name === 'inventory' || name === 'map' || name === 'reader') { g.closeOverlay(); return; }
    if (name === 'credits') { g.menus.show('chapterEnd'); return; }
    if (name === 'clickToPlay') { g.resume(); return; }
  }

  /** trata entrada de menu; devolve true se consumiu (o jogo não deve interpretar a tecla) */
  handle(input) {
    const g = this.game;
    if (g.loading) return false;
    const st = g.state;
    if (st === 'playing' || st === 'cutscene' || st === 'dying') return false;
    const name = visibleScreen();
    if (!name || name === 'loading') return false;
    if (name !== this.screen || !this.items.length) this.refresh();

    const up = input.wasPressed('forward') || input.padPressed?.has('reload');
    const down = input.wasPressed('back') || input.padPressed?.has('repair');
    const left = input.wasPressed('left');
    const right = input.wasPressed('right');
    const confirm = input.wasPressed('interact') || input.pressed.has('Enter') || input.pressed.has('NumpadEnter');
    const back = input.wasPressed('pause') && name !== 'menu';

    // repetição do stick/seta segura
    const ax = input.padMove || { x: 0, y: 0 };
    let hold = 0;
    if (ax.y > 0.55) hold = -1;
    else if (ax.y < -0.55) hold = 1;
    else if (ax.x > 0.55) hold = 2;
    else if (ax.x < -0.55) hold = -2;
    if (hold) {
      if (this._hold !== hold) { this._hold = hold; this._repeat = 0.32; if (Math.abs(hold) === 1) this._move(hold); else this._nudge(Math.sign(hold)); }
    } else this._hold = 0;

    if (name === 'map' && (left || right)) {
      this.game.menus.mapCycle(left ? -1 : 1);
      this._sound('ui');
      this.refresh();
      return true;
    }
    if (up) this._move(-1);
    else if (down) this._move(1);
    else if (left) this._nudge(-1);
    else if (right) this._nudge(1);
    else if (confirm) this._confirm();
    else if (back) this._back();
    return up || down || left || right || confirm || back;
  }

  tick(dt) {
    if (!this._hold) return;
    this._repeat -= dt;
    if (this._repeat <= 0) {
      this._repeat = 0.12;
      if (Math.abs(this._hold) === 1) this._move(this._hold);
      else this._nudge(Math.sign(this._hold));
    }
  }
}
