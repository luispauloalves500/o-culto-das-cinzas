// HUD em DOM: barras de vida/fôlego, arma, itens, objetivo, prompt de interação, dicas, avisos, chefe.
import { ITEMS } from '../data/items.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = { hud: $('hud'), hp: $('hp'), st: $('st'), weapon: $('weapon'), items: $('items'), objective: $('objective'), objective2: $('objective2'),
      prompt: $('prompt'), hint: $('hint'), toast: $('toast'), boss: $('boss'), bossHp: $('bossHp'), struggle: $('struggle'),
      vignette: $('vignette'), fps: $('fps') };
    this.toastT = 0; this.hintT = 0; this.dmgFlash = 0;
    this._last = {};
    this.lastToast = ''; this.lastHint = '';
  }
  show(v) { this.el.hud.classList.toggle('hidden', !v); }
  _set(key, el, prop, val) { if (this._last[key] !== val) { this._last[key] = val; el[prop] = val; } }

  toast(msg, dur = 3) { this.el.toast.textContent = msg; this.el.toast.classList.remove('hidden'); this.toastT = dur; this.lastToast = msg; }
  hint(html, dur = 6) { this.el.hint.innerHTML = html; this.el.hint.classList.remove('hidden'); this.hintT = dur; this.lastHint = html; }
  flashDamage() { this.dmgFlash = 1; }
  setStruggle(v) { this.el.struggle.classList.toggle('hidden', !v); }
  showBoss(v) { this.el.boss.classList.toggle('hidden', !v); }
  reset() { this.toastT = 0; this.hintT = 0; this.el.toast.classList.add('hidden'); this.el.hint.classList.add('hidden'); this.setStruggle(false); this.showBoss(false); this.el.prompt.classList.add('hidden'); this._last = {}; }

  update(dt, game) {
    const p = game.player;
    this._set('hp', this.el.hp.style, 'width', (100 * p.hp / p.maxHp).toFixed(1) + '%');
    this._set('blessed', this.el.hp.parentElement.classList, 'value', p.blessed ? 'track blessed' : 'track');
    this._set('st', this.el.st.style, 'width', (100 * p.st / p.maxSt).toFixed(1) + '%');
    this._set('weapon', this.el.weapon, 'textContent', p.weapon ? p.weapon.name + (p.sharpened && p.weapon.sharpenable ? ' (afiado)' : '') : 'Desarmado');
    const items = game.inventory.list().map((i) => `${ITEMS[i.id]?.name || i.id} ×${i.n}`).join(' · ');
    this._set('items', this.el.items, 'textContent', items);
    this._set('obj', this.el.objective, 'textContent', game.quest.current() ? '◆ ' + game.quest.current() : '');
    const side = game.quest.side();
    if (this.el.objective2) this._set('obj2', this.el.objective2, 'textContent', side.length ? '◇ ' + side[side.length - 1] : '');
    const it = game.currentInteractable;
    const ptxt = it ? '[E] ' + (typeof it.prompt === 'function' ? it.prompt() : it.prompt) : '';
    this._set('prompt', this.el.prompt, 'textContent', ptxt);
    this.el.prompt.classList.toggle('hidden', !ptxt);
    if (game.boss && !this.el.boss.classList.contains('hidden')) this._set('boss', this.el.bossHp.style, 'width', (100 * Math.max(0, game.boss.hp) / game.boss.maxHp).toFixed(1) + '%');
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.el.toast.classList.add('hidden');
    if (this.hintT > 0 && (this.hintT -= dt) <= 0) this.el.hint.classList.add('hidden');
    // vinheta: vida baixa + flash de dano
    this.dmgFlash = Math.max(0, this.dmgFlash - dt * 2.5);
    const low = p.hp < 35 ? (1 - p.hp / 35) * 0.7 : 0;
    this.el.vignette.style.opacity = Math.min(1, low + this.dmgFlash * 0.8).toFixed(2);
  }
  setFps(show, fps) {
    this.el.fps.classList.toggle('hidden', !show);
    if (show) this.el.fps.textContent = fps.toFixed(0) + ' FPS';
  }
}
