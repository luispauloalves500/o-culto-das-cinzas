// Inventário compacto: itens contáveis + documentos coletados.
import { ITEMS } from '../data/items.js';

export class Inventory {
  constructor(bus) { this.items = {}; this.documents = []; this.bus = bus; }
  add(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; this.bus?.emit('ItemAdded', { id, n }); }
  has(id) { return (this.items[id] || 0) > 0; }
  remove(id, n = 1) { if (!this.has(id)) return false; this.items[id] -= n; if (this.items[id] <= 0) delete this.items[id]; return true; }
  addDocument(id) { if (!this.documents.includes(id)) { this.documents.push(id); this.bus?.emit('DocumentCollected', id); } }
  list() { return Object.entries(this.items).map(([id, n]) => ({ id, n, ...(ITEMS[id] || { name: id }) })); }
  serialize() { return { items: { ...this.items } }; }
  restore(s, docs = []) { this.items = { ...(s?.items || {}) }; this.documents = [...docs]; }
}
