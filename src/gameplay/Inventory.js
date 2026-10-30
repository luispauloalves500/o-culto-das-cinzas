// Inventário compacto: itens contáveis + documentos coletados.
import { ITEMS } from '../data/items.js';

export class Inventory {
  constructor(bus) { this.items = {}; this.documents = []; this.weapons = []; this.bus = bus; }
  addWeapon(id) { if (!this.weapons.includes(id)) { this.weapons.push(id); this.bus?.emit('WeaponAdded', id); } }
  add(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; this.bus?.emit('ItemAdded', { id, n }); }
  count(id) { return this.items[id] || 0; }
  has(id) { return (this.items[id] || 0) > 0; }
  remove(id, n = 1) { if (!this.has(id)) return false; this.items[id] -= n; if (this.items[id] <= 0) delete this.items[id]; return true; }
  addDocument(id) { if (!this.documents.includes(id)) { this.documents.push(id); this.bus?.emit('DocumentCollected', id); } }
  list() { return Object.entries(this.items).map(([id, n]) => ({ id, n, ...(ITEMS[id] || { name: id }) })); }
  serialize() { return { items: { ...this.items }, weapons: [...this.weapons] }; }
  restore(s, docs = []) {
    this.items = { ...(s?.items || {}) }; this.documents = [...docs];
    // saves v1 antigos só tinham a arma equipada: ela passa a ser a primeira da lista
    this.weapons = [...new Set([...(s?.weapon ? [s.weapon] : []), ...(Array.isArray(s?.weapons) ? s.weapons : [])])];
  }
}
