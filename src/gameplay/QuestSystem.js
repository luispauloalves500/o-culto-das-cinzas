// Objetivos e flags persistentes (energia ligada, chefe vencido, etc.)
import { objectivesFor, sideObjectivesFor } from '../data/chapters.js';

export class QuestSystem {
  constructor(bus, chapter = 1) { this.flags = {}; this.bus = bus; this.chapter = chapter; }
  set(flag, v = true) {
    if (this.flags[flag] === v) return;
    this.flags[flag] = v;
    this.bus?.emit('FlagChanged', { flag, v });
    this.bus?.emit('QuestStepCompleted', flag);
  }
  has(flag) { return !!this.flags[flag]; }
  /** objetivo atual: primeiro da lista cuja condição ainda não foi satisfeita */
  current() {
    for (const o of objectivesFor(this.chapter)) if (!this.has(o.done)) return o.text;
    return '';
  }
  /** objetivos opcionais ativos (revelados e ainda não concluídos) */
  side() { return sideObjectivesFor(this.chapter).filter((o) => this.has(o.when) && !this.has(o.done)).map((o) => o.text); }
  serialize() { return { ...this.flags }; }
  restore(f) { this.flags = { ...(f || {}) }; }
}
