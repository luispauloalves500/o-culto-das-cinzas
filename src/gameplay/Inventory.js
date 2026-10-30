// Inventário compacto: itens contáveis + documentos coletados + armas (desgaste por arma, tambor do revólver).
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';

export class Inventory {
  constructor(bus) { this.items = {}; this.documents = []; this.weapons = []; this.wear = {}; this.loaded = {}; this.bus = bus; }
  addWeapon(id) { if (!this.weapons.includes(id)) { this.weapons.push(id); this.bus?.emit('WeaponAdded', id); } }
  add(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; this.bus?.emit('ItemAdded', { id, n }); }
  count(id) { return this.items[id] || 0; }
  has(id) { return (this.items[id] || 0) > 0; }
  remove(id, n = 1) { if (!this.has(id)) return false; this.items[id] -= n; if (this.items[id] <= 0) delete this.items[id]; return true; }
  addDocument(id) { if (!this.documents.includes(id)) { this.documents.push(id); this.bus?.emit('DocumentCollected', id); } }
  list() { return Object.entries(this.items).map(([id, n]) => ({ id, n, ...(ITEMS[id] || { name: id }) })); }

  /** conservação 0..1 de uma arma corpo a corpo (armas sem durabilidade: sempre 1) */
  condition(id) {
    const w = WEAPONS[id];
    if (!w?.durability) return 1;
    return Math.max(0, 1 - (this.wear[id] || 0) / w.durability);
  }
  /** aplica desgaste; retorna { before, after } para avisos de limiar */
  addWear(id, amount) {
    const w = WEAPONS[id];
    if (!w?.durability || !(amount > 0)) return null;
    const before = this.condition(id);
    this.wear[id] = Math.min(w.durability, (this.wear[id] || 0) + amount);
    return { before, after: this.condition(id) };
  }
  /** restaura a conservação até `to` (0..1); nunca piora */
  repair(id, to = 1) {
    const w = WEAPONS[id];
    if (!w?.durability) return false;
    const want = (1 - to) * w.durability;
    if ((this.wear[id] || 0) <= want + 1e-6) return false;
    this.wear[id] = Math.max(0, want);
    if (this.wear[id] === 0) delete this.wear[id];
    return true;
  }
  /** balas no tambor da arma de fogo */
  rounds(id) { return this.loaded[id] || 0; }
  /** munição total da arma (tambor + reserva) */
  ammoTotal(id) { const w = WEAPONS[id]; return this.rounds(id) + (w?.ammo ? this.count(w.ammo) : 0); }

  serialize() { return { items: { ...this.items }, weapons: [...this.weapons], wear: { ...this.wear }, loaded: { ...this.loaded } }; }
  restore(s, docs = []) {
    this.items = { ...(s?.items || {}) }; this.documents = [...docs];
    // saves v1 antigos só tinham a arma equipada: ela passa a ser a primeira da lista
    this.weapons = [...new Set([...(s?.weapon ? [s.weapon] : []), ...(Array.isArray(s?.weapons) ? s.weapons : [])])];
    // desgaste: saves antigos não tinham → armas novas em folha
    this.wear = {};
    for (const [id, v] of Object.entries(s?.wear || {})) if (WEAPONS[id]?.durability && v > 0) this.wear[id] = Math.min(WEAPONS[id].durability, +v);
    // tambor: saves antigos guardavam tudo na reserva → carrega o tambor com o que houver, sem criar nem perder bala
    this.loaded = {};
    if (s?.loaded && typeof s.loaded === 'object') {
      for (const [id, v] of Object.entries(s.loaded)) if (WEAPONS[id]?.cylinder) this.loaded[id] = Math.max(0, Math.min(WEAPONS[id].cylinder, v | 0));
    } else {
      for (const id of this.weapons) {
        const w = WEAPONS[id];
        if (!w?.cylinder) continue;
        const n = Math.min(w.cylinder, this.count(w.ammo));
        if (n > 0) { this.loaded[id] = n; this.remove(w.ammo, n); }
      }
    }
  }
}
