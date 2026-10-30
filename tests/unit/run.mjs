// Testes unitários (Node puro, sem navegador): colisão, navegação, saves, volumes de combate e dados.
import assert from 'node:assert/strict';
import { CollisionWorld } from '../../src/world/CollisionWorld.js';
import { Navigation } from '../../src/world/Navigation.js';
import { migrateSave, createEmptySave, SaveManager, SAVE_KEY, SAVE_VERSION } from '../../src/core/SaveManager.js';
import { CombatSystem, testVolume } from '../../src/gameplay/CombatSystem.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { DOCUMENTS } from '../../src/data/documents.js';

let ok = 0, fail = 0;
function test(name, fn) {
  try { fn(); ok++; console.log('✔', name); } catch (e) { fail++; console.log('✘', name, '\n   ', e.message); }
}

test('círculo é empurrado para fora de uma parede', () => {
  const c = new CollisionWorld();
  c.addBox(0, 0, 0, 1, 3, 10);
  const p = { x: 1.1, y: 0, z: 5 };
  const hits = c.resolveCircle(p, 0.35, 1.8);
  assert.ok(hits && hits.length === 1);
  assert.ok(p.x >= 1.35 - 1e-6, `x=${p.x}`);
});

test('caixa desabilitada (porta aberta) não colide', () => {
  const c = new CollisionWorld();
  const b = c.addBox(0, 0, 0, 1, 3, 1, { tag: 'door' });
  b.enabled = false;
  const p = { x: 0.5, y: 0, z: 0.5 };
  assert.equal(c.resolveCircle(p, 0.3, 1.8), null);
});

test('caixa acima da cabeça não bloqueia', () => {
  const c = new CollisionWorld();
  c.addBox(0, 2.5, 0, 2, 3, 2);
  const p = { x: 1, y: 0, z: 1 };
  assert.equal(c.resolveCircle(p, 0.3, 1.8), null);
});

test('rampa (escada) interpola altura e respeita degrau máximo', () => {
  const c = new CollisionWorld();
  c.addFloor({ minX: 0, maxX: 2, minZ: 0, maxZ: 10, ramp: { axis: 'z', a: 0, b: 10, ya: 0, yb: -5 } });
  assert.equal(c.groundAt(1, 5, 0), -2.5);
  c.addFloor({ minX: 0, maxX: 2, minZ: 0, maxZ: 10, y: 3 });
  assert.equal(c.groundAt(1, 5, 0), -2.5, 'piso 3 m acima não pode ser escalado');
});

test('piso dinâmico (elevador) segue função', () => {
  const c = new CollisionWorld();
  let y = 0;
  c.addFloor({ minX: 0, maxX: 4, minZ: 0, maxZ: 4, y: () => y });
  assert.equal(c.groundAt(2, 2, 0), 0);
  y = -5;
  assert.equal(c.groundAt(2, 2, 0), -5);
});

test('raycast e linha de visão', () => {
  const c = new CollisionWorld();
  c.addBox(4, 0, -1, 5, 3, 1);
  assert.equal(c.segmentClear({ x: 0, y: 1, z: 0 }, { x: 10, y: 1, z: 0 }), false);
  assert.equal(c.segmentClear({ x: 0, y: 1, z: 3 }, { x: 10, y: 1, z: 3 }), true);
});

test('A* contorna porta fechada e usa a aberta', () => {
  const n = new Navigation();
  n.addNode('a', 0, 0, 0); n.addNode('b', 5, 0, 0); n.addNode('c', 0, 0, 10); n.addNode('d', 5, 0, 10);
  const door = { open: false };
  n.link('a', 'b', door); n.link('a', 'c'); n.link('c', 'd'); n.link('d', 'b');
  assert.deepEqual(n.findPath('a', 'b'), ['a', 'c', 'd', 'b']);
  door.open = true;
  assert.deepEqual(n.findPath('a', 'b'), ['a', 'b']);
});

test('save: migra v0, rejeita versão futura e lixo', () => {
  const m = migrateSave({ version: 0, inventory: ['bandagem', 'bandagem', 'fusivel'], weapon: 'machado' });
  assert.equal(m.version, 1);
  assert.equal(m.inventory.items.bandagem, 2);
  assert.equal(m.inventory.weapon, 'machado');
  assert.equal(migrateSave({ version: SAVE_VERSION + 1 }), null);
  assert.equal(migrateSave('x'), null);
  assert.equal(migrateSave({}), null);
});

test('SaveManager grava/lê com versão e ignora JSON corrompido', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const sm = new SaveManager(storage);
  assert.equal(sm.hasSave(), false);
  const s = createEmptySave(); s.flags.power = true; s.checkpoint = 'machine_room';
  assert.ok(sm.write(s));
  const l = sm.load();
  assert.equal(l.version, SAVE_VERSION); assert.equal(l.flags.power, true); assert.equal(l.checkpoint, 'machine_room');
  mem.set(SAVE_KEY, '{quebrado');
  assert.equal(sm.load(), null);
});

test('volumes de dano: cápsula e esfera', () => {
  const cap = { type: 'capsule', x: 0, z: 0, y0: 0.4, y1: 1.6, r: 0.4 };
  assert.ok(testVolume({ x: 0.6, y: 1, z: 0 }, 0.25, cap));
  assert.ok(!testVolume({ x: 0.7, y: 1, z: 0 }, 0.25, cap));
  assert.ok(!testVolume({ x: 0, y: 2.4, z: 0 }, 0.25, cap));
  assert.ok(testVolume({ x: 0, y: 1, z: 0.5 }, 0.2, { type: 'sphere', x: 0, y: 1, z: 0.8, r: 0.15 }));
});

test('varredura da arma prioriza o ponto fraco e respeita alvos já atingidos', () => {
  const target = {
    alive: true,
    hurtVolumes: () => [
      { type: 'sphere', part: 'weak', x: 0, y: 1.5, z: -0.4, r: 0.3 },
      { type: 'capsule', part: 'body', x: 0, z: 0, y0: 0.4, y1: 2, r: 0.5 },
    ],
  };
  const sweep = CombatSystem.prototype.sweep.bind({ debug: false });
  const hits = sweep({ x: 1, y: 1.5, z: -0.4 }, { x: -1, y: 1.5, z: -0.4 }, 0.2, [target], new Set());
  assert.equal(hits.length, 1);
  assert.equal(hits[0].volume.part, 'weak');
  assert.equal(sweep({ x: 1, y: 1.5, z: -0.4 }, { x: -1, y: 1.5, z: -0.4 }, 0.2, [target], new Set([target])).length, 0);
  const miss = sweep({ x: 3, y: 1, z: 3 }, { x: 4, y: 1, z: 3 }, 0.2, [target], new Set());
  assert.equal(miss.length, 0);
});

test('dados: ataques do machado têm janela ativa dentro da duração', () => {
  for (const w of Object.values(WEAPONS)) {
    for (const [k, a] of Object.entries(w.attacks)) {
      assert.ok(a.active[0] < a.active[1] && a.active[1] <= a.dur, `${w.id || ''}.${k}`);
      assert.ok(a.dmg > 0 && a.stamina > 0);
    }
  }
});

test('dados: documentos têm título e corpo', () => {
  const docs = Object.values(DOCUMENTS);
  assert.ok(docs.length >= 4);
  for (const d of docs) assert.ok(d.title && d.body);
});

console.log(`\n${ok}/${ok + fail} testes unitários OK`);
process.exit(fail ? 1 : 0);
