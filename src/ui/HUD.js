// HUD em DOM: barras de vida/fôlego, arma, itens, objetivo, prompt de interação, dicas, avisos, chefe.
import { ITEMS } from '../data/items.js';
import { conditionLabel } from '../data/weapons.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = { hud: $('hud'), hp: $('hp'), st: $('st'), weapon: $('weapon'), items: $('items'), objective: $('objective'), objective2: $('objective2'),
      prompt: $('prompt'), hint: $('hint'), toast: $('toast'), boss: $('boss'), bossHp: $('bossHp'), bossName: $('bossName'), struggle: $('struggle'),
      vignette: $('vignette'), fps: $('fps'), cond: $('cond'), condTrack: $('condTrack'), crosshair: $('crosshair') };
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
  showBoss(v, name = 'O CIRURGIÃO') { this.el.boss.classList.toggle('hidden', !v); if (v && this.el.bossName) this.el.bossName.textContent = name; }
  reset() { this.toastT = 0; this.hintT = 0; this.el.toast.classList.add('hidden'); this.el.hint.classList.add('hidden'); this.setStruggle(false); this.showBoss(false); this.el.prompt.classList.add('hidden'); this._last = {}; }

  update(dt, game) {
    const p = game.player;
    this._set('hp', this.el.hp.style, 'width', (100 * p.hp / p.maxHp).toFixed(1) + '%');
    this._set('blessed', this.el.hp.parentElement.classList, 'value', p.blessed ? 'track blessed' : 'track');
    this._set('st', this.el.st.style, 'width', (100 * p.st / p.maxSt).toFixed(1) + '%');
    this._set('weapon', this.el.weapon, 'textContent', HUD.weaponLine(p, game.inventory));
    // conservação da arma corpo a corpo
    const w = p.weapon, inv = game.inventory;
    const cond = w?.durability ? inv.condition(w.id) : null;
    if (this.el.condTrack) {
      this._set('condVis', this.el.condTrack.classList, 'value', cond == null ? 'track cond hidden' : 'track cond');
      if (cond != null) {
        this._set('cond', this.el.cond.style, 'width', (100 * cond).toFixed(1) + '%');
        this._set('condCls', this.el.cond.classList, 'value', 'fill cond' + (cond <= 0 ? ' broken' : cond < 0.5 ? ' worn' : ''));
      }
    }
    // retícula de mira manual
    if (this.el.crosshair) this._set('xhair', this.el.crosshair.classList, 'value', p.state === 'aim' || (p.state === 'attack' && p.attack?.manual) ? 'aiming' : '');
    // "AGARRADO!" segue o estado real do jogador (nunca sobra de um respawn/teleporte)
    const grabbed = p.state === 'grabbed';
    if (this._last.grab !== grabbed) { this._last.grab = grabbed; this.setStruggle(grabbed); }
    const items = game.inventory.list().map((i) => `${ITEMS[i.id]?.name || i.id} ×${i.n}`).join(' · ');
    this._set('items', this.el.items, 'textContent', items);
    this._set('obj', this.el.objective, 'textContent', game.quest.current() ? '◆ ' + game.quest.current() : '');
    const side = game.quest.side();
    if (this.el.objective2) this._set('obj2', this.el.objective2, 'textContent', side.length ? '◇ ' + side[side.length - 1] : '');
    // objetivo longo (2 linhas) empurra o secundário para baixo em vez de sobrepor
    if (this.el.objective2 && this._last.objH !== this.el.objective.offsetHeight) {
      this._last.objH = this.el.objective.offsetHeight;
      this.el.objective2.style.top = (18 + Math.max(22, this._last.objH + 4)) + 'px';
    }
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
  /** texto da arma em mãos: conservação (corpo a corpo) ou tambor/reserva (revólver) */
  static weaponLine(p, inv) {
    const w = p.weapon;
    if (!w) return 'Desarmado';
    let t = w.name + (p.sharpened && w.sharpenable ? ' (afiado)' : '');
    if (w.cylinder) t += ` · ${inv.rounds(w.id)}/${w.cylinder} · reserva ${inv.count(w.ammo)}`;
    else if (w.ammo) t += ` · ${inv.count(w.ammo)} balas`;
    if (w.durability) { const c = inv.condition(w.id); t += ` · ${Math.round(c * 100)}% ${conditionLabel(c)}`; }
    return t;
  }
  setFps(show, fps) {
    this.el.fps.classList.toggle('hidden', !show);
    if (show) this.el.fps.textContent = fps.toFixed(0) + ' FPS';
  }
}
