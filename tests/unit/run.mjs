// Testes unitários (Node puro, sem navegador): colisão, navegação, saves, volumes de combate e dados.
import assert from 'node:assert/strict';
import { CollisionWorld } from '../../src/world/CollisionWorld.js';
import { Navigation } from '../../src/world/Navigation.js';
import { migrateSave, createEmptySave, SaveManager, SAVE_KEY, SAVE_VERSION } from '../../src/core/SaveManager.js';
import { CombatSystem, testVolume } from '../../src/gameplay/CombatSystem.js';
import { WEAPONS, weaponDamage } from '../../src/data/weapons.js';
import { Inventory } from '../../src/gameplay/Inventory.js';
import { DOCUMENTS } from '../../src/data/documents.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { SIDE_OBJECTIVES } from '../../src/data/chapters.js';
import { roomAt, knownRooms, floorOf, ROOMS } from '../../src/data/map.js';
import { QuestSystem } from '../../src/gameplay/QuestSystem.js';

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
  assert.ok(docs.length >= 7);
  for (const id of ['prontuario_leste', 'registro_necroterio', 'carta_helena']) assert.ok(DOCUMENTS[id], id);
  for (const d of docs) assert.ok(d.title && d.body);
});

test('dados: Rastejador é baixo, rastejante e com ataques válidos; chave do necrotério existe', () => {
  const r = ENEMIES.rastejador;
  assert.ok(r && r.crawler && r.height < 1);
  for (const a of r.attacks) assert.ok(a.range > 0 && a.windup > 0 && a.recover > 0);
  assert.ok(ITEMS.chave_necroterio?.name);
});

test('objetivos opcionais aparecem só depois da pista e somem ao concluir', () => {
  const q = new QuestSystem();
  assert.equal(q.side().length, 0);
  q.set('power');
  assert.equal(q.side().length, 1);
  q.set('enteredEast');
  assert.ok(q.side()[0].includes('chave do necrotério'));
  q.set('hasMorgueKey'); q.set('enteredMorgue'); q.set('readEastChart');
  assert.ok(q.side()[0].includes('gaveta 13'));
  q.set('coldRoomOpen');
  assert.equal(q.side().length, 0);
  for (const o of SIDE_OBJECTIVES) assert.ok(o.when && o.done && o.text);
});

test('A*: câmara fria só é alcançável com o painel secreto aberto', () => {
  const n = new Navigation();
  n.addNode('hall', 20, -5, 12); n.addNode('mor', 21, -5, 5); n.addNode('cold', 21.5, -5, -1.6);
  const morgue = { open: false }, cold = { open: false };
  n.link('hall', 'mor', morgue); n.link('mor', 'cold', cold);
  assert.equal(n.findPath('hall', 'cold'), null);
  morgue.open = true;
  assert.equal(n.findPath('hall', 'cold'), null);
  cold.open = true;
  assert.deepEqual(n.findPath('hall', 'cold').map((x) => x.id ?? x), ['hall', 'mor', 'cold']);
});

test('mapa: roomAt por andar, planta revela só cômodos não secretos', () => {
  assert.equal(floorOf(-5), 'lo'); assert.equal(floorOf(0), 'up'); assert.equal(floorOf(4), 'up2');
  assert.equal(roomAt({ x: 6, y: -5, z: 8 }).id, 'laundry');
  assert.equal(roomAt({ x: 6, y: 0, z: 18 }).id, 'chapel');
  assert.equal(roomAt({ x: 10, y: 4, z: 23 }).id, 'coro');
  assert.equal(roomAt({ x: 30, y: 4, z: 18 }).id, 'diretoria');
  assert.equal(knownRooms({}, 'lo').length, 0);
  const seen = knownRooms({ seen_laundry: true }, 'lo');
  assert.deepEqual(seen.map((r) => r.id), ['laundry']); assert.ok(seen[0].visited);
  const plan = knownRooms({ hasMapPlan: true }, 'lo');
  assert.ok(plan.some((r) => r.id === 'furnace') && !plan.some((r) => r.id === 'coldRoom'));
  assert.ok(knownRooms({ hasMapPlan: true, seen_coldRoom: true }, 'lo').some((r) => r.id === 'coldRoom'));
  for (const r of ROOMS) assert.ok(r.rect[0] < r.rect[2] && r.rect[1] < r.rect[3], r.id);
});

test('dados: anexo (escada, planta, medalha, hino) e cadeia de objetivos até a capela', () => {
  for (const id of ['chave_escada', 'planta_hospital', 'medalha_sao_dimas']) assert.ok(ITEMS[id], id);
  for (const id of ['ordem_lavanderia', 'diario_forneiro', 'lista_transferencia', 'memorando_diretoria', 'hino_capela']) assert.ok(DOCUMENTS[id]?.body, id);
  const h = DOCUMENTS.hino_capela.body; const i = ['Brás', 'Luzia', 'Roque', 'Dimas'].map((n) => h.indexOf(n));
  assert.ok(i.every((x) => x >= 0) && i[0] < i[1] && i[1] < i[2] && i[2] < i[3], 'ordem do hino');
  assert.ok(SIDE_OBJECTIVES.length >= 11);
});

test('armas: martelo pesado e válido; pedra de afiar só vale para o machado', () => {
  const m = WEAPONS.martelo, a = WEAPONS.machado;
  assert.ok(m && m.breaksWalls && m.name);
  for (const k of ['light1', 'light2', 'heavy']) { const d = m.attacks[k]; assert.ok(d.active[0] < d.active[1] && d.active[1] < d.dur, k); }
  assert.ok(m.attacks.heavy.dmg > a.attacks.heavy.dmg && m.attacks.heavy.poise > a.attacks.heavy.poise && m.attacks.light1.dur > a.attacks.light1.dur);
  assert.equal(weaponDamage(a, a.attacks.light1, true), Math.round(a.attacks.light1.dmg * 1.3));
  assert.equal(weaponDamage(a, a.attacks.light1, false), a.attacks.light1.dmg);
  assert.equal(weaponDamage(m, m.attacks.heavy, true), m.attacks.heavy.dmg);
});

test('inventário: lista de armas, migração de save v1 (só weapon) e serialização', () => {
  const inv = new Inventory({ emit() {} });
  inv.restore({ items: { bandagem: 1 }, weapon: 'machado' }, []);
  assert.deepEqual(inv.weapons, ['machado']);
  inv.addWeapon('martelo'); inv.addWeapon('martelo');
  assert.deepEqual(inv.weapons, ['machado', 'martelo']);
  const s = inv.serialize();
  const inv2 = new Inventory({ emit() {} }); inv2.restore({ ...s, weapon: 'martelo' }, []);
  assert.deepEqual([...inv2.weapons].sort(), ['machado', 'martelo']);
  const empty = createEmptySave();
  assert.deepEqual(empty.inventory.weapons, []);
});

test('mapa: ala cirúrgica superior, expurgo secreto e telhado', () => {
  assert.equal(floorOf(7.3), 'roof'); assert.equal(floorOf(5.9), 'up2');
  assert.equal(roomAt({ x: 26, y: 4, z: 27.5 }).id, 'wingCorridor');
  assert.equal(roomAt({ x: 27.5, y: 4, z: 37.2 }).id, 'expurgo');
  assert.equal(roomAt({ x: 33.5, y: 7.3, z: 36 }).id, 'shed');
  assert.equal(roomAt({ x: 22, y: 7.3, z: 30 }).id, 'roof');
  assert.equal(roomAt({ x: 39.5, y: 1, z: 18 }).id, 'mainStair');
  assert.ok(!knownRooms({ hasMapPlan: true }, 'up2').some((r) => r.id === 'expurgo'));
  assert.ok(knownRooms({ hasMapPlan: true }, 'roof').length >= 2);
  for (const id of ['registro_cirurgico', 'bilhete_zelador', 'ultimo_bilhete']) assert.ok(DOCUMENTS[id]?.body, id);
  assert.ok(ITEMS.pedra_afiar);
  assert.ok(SIDE_OBJECTIVES.some((o) => o.done === 'wallBroken') && SIDE_OBJECTIVES.some((o) => o.done === 'hasHammer'));
});

console.log(`\n${ok}/${ok + fail} testes unitários OK`);
process.exit(fail ? 1 : 0);
