// Testes unitários (Node puro, sem navegador): colisão, navegação, saves, volumes de combate e dados.
import assert from 'node:assert/strict';
import { CollisionWorld } from '../../src/world/CollisionWorld.js';
import { Navigation } from '../../src/world/Navigation.js';
import { migrateSave, createEmptySave, SaveManager, SAVE_KEY, SAVE_VERSION, makeChapter2Save, CH1_KEY_ITEMS } from '../../src/core/SaveManager.js';
import { CombatSystem, testVolume, rayVsVolume } from '../../src/gameplay/CombatSystem.js';
import { WEAPONS, weaponDamage, wearMult, wearCost, conditionLabel } from '../../src/data/weapons.js';
import { Inventory } from '../../src/gameplay/Inventory.js';
import { DOCUMENTS } from '../../src/data/documents.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { SIDE_OBJECTIVES, OBJECTIVES_C2, SIDE_OBJECTIVES_C2, CHAPTERS } from '../../src/data/chapters.js';
import { roomAt, knownRooms, floorOf, ROOMS, setMapChapter, chapterFloors } from '../../src/data/map.js';
import { QuestSystem } from '../../src/gameplay/QuestSystem.js';
import * as THREE from 'three';
import { attackClipTime, ATTACK_CLIPS, ACTION_CLIPS, CONFIG_MACHADO, CLIP } from '../../src/gameplay/rev6/configMachado.js';
import { readFileSync } from 'node:fs';
import { criarSistemaMachado } from '../../src/gameplay/rev6/sistemaMachado.js';
import { prepareClips, makeIdleClips } from '../../src/gameplay/EliasModel.js';

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
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(m.inventory.items.bandagem, 2);
  assert.equal(m.inventory.possuiMachado, true); assert.equal(m.inventory.machadoEquipado, true);
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

test('3º andar: facão, revólver com munição, pediatria no mapa, Quarto 7 secreto', () => {
  const f = WEAPONS.facao, r = WEAPONS.revolver, a = WEAPONS.machado;
  assert.ok(f && f.sharpenable && f.attacks.light1.dur < a.attacks.light1.dur && f.attacks.light1.stamina < a.attacks.light1.stamina);
  assert.ok(r && r.ranged && ITEMS[r.ammo] && r.attacks.heavy.shoot && r.shot.range >= 15 && r.shot.dmg > a.attacks.heavy.dmg);
  assert.equal(weaponDamage(r, r.attacks.light1, true), r.attacks.light1.dmg);   // pedra de afiar não vale para o revólver
  const inv = new Inventory({ emit() {} });
  assert.equal(inv.count('municao_38'), 0);
  inv.add('municao_38', 3); inv.remove('municao_38');
  assert.equal(inv.count('municao_38'), 2);
  assert.equal(roomAt({ x: 27, y: 7.3, z: 18 }).id, 'bercario');
  assert.equal(roomAt({ x: 20, y: 7.3, z: 24 }).id, 'pedCorridor');
  assert.equal(roomAt({ x: 14, y: 7.3, z: 18 }).id, 'quarto7');
  assert.equal(roomAt({ x: 42.2, y: 4, z: 22.6 }).id, 'fireEscape');
  assert.equal(roomAt({ x: 22, y: 7.3, z: 30 }).id, 'roof');
  assert.ok(!knownRooms({ hasMapPlan: true }, 'roof').some((x) => x.id === 'quarto7'));
  for (const id of ['desenho_crianca', 'ficha_bercario', 'ordem_seguranca', 'diario_menino']) assert.ok(DOCUMENTS[id]?.body, id);
  assert.ok(ITEMS.amuleto_menino && ITEMS.chave_seguranca);
  for (const d of ['picked_facao', 'picked_revolver', 'lockBroken', 'fireExitShortcut']) assert.ok(SIDE_OBJECTIVES.some((o) => o.done === d), d);
});

test('maternidade, arquivo morto, lança improvisada e sala de batismo secreta', () => {
  const l = WEAPONS.lanca, a = WEAPONS.machado;
  assert.ok(l && l.sharpenable && !l.ranged && l.reach > 1, 'lança alcança mais que o machado');
  for (const k of ['light1', 'heavy']) { const at = l.attacks[k]; assert.ok(at.active[0] < at.active[1] && at.active[1] <= at.dur, k); }
  assert.ok(l.attacks.heavy.dmg > l.attacks.light1.dmg && l.attacks.heavy.stamina > l.attacks.light1.stamina);
  const inv = new Inventory({ emit() {} });
  inv.addWeapon('lanca'); assert.ok(inv.weapons.includes('lanca'));
  assert.equal(roomAt({ x: 18, y: 4, z: 6 }).id, 'salaParto');
  assert.equal(roomAt({ x: 26, y: 4, z: 12.5 }).id, 'matCorridor');
  assert.equal(roomAt({ x: 34, y: 4, z: 6 }).id, 'postoObst');
  assert.equal(roomAt({ x: 41, y: -5, z: 4 }).id, 'deadArchive');
  assert.equal(roomAt({ x: 41, y: -5, z: -5 }).id, 'batismo');
  assert.ok(!knownRooms({ hasMapPlan: true }, 'lo').some((x) => x.id === 'batismo'));
  for (const id of ['prontuario_parto', 'carta_mae', 'livro_partos', 'prontuario_rn0', 'ata_batismo']) assert.ok(DOCUMENTS[id]?.body, id);
  for (const id of ['chave_maternidade', 'chave_arquivo_morto', 'manivela', 'pulseira_recem_nascido']) assert.ok(ITEMS[id]?.name, id);
  for (const d of ['maternityOpen', 'picked_lanca', 'deadArchiveOpen', 'shelfMoved', 'picked_pulseira']) assert.ok(SIDE_OBJECTIVES.some((o) => o.done === d), d);
});

test('desgaste: condição reduz o dano, afiada gasta menos, kit e pedra reparam, save migra', () => {
  const a = WEAPONS.machado, r = WEAPONS.revolver;
  for (const id of ['machado', 'martelo', 'facao', 'lanca']) assert.ok(WEAPONS[id].durability > 0, id);
  assert.ok(!r.durability && r.cylinder === 6);
  const h = a.attacks.heavy;
  assert.equal(weaponDamage(a, h, false, 1), h.dmg);
  assert.equal(weaponDamage(a, h, false, 0.3), Math.round(h.dmg * 0.85));
  assert.equal(weaponDamage(a, h, false, 0.1), Math.round(h.dmg * 0.7));
  assert.equal(weaponDamage(a, h, false, 0), Math.round(h.dmg * 0.5));
  assert.equal(weaponDamage(r, r.attacks.light1, false, 0), r.attacks.light1.dmg, 'revólver não desgasta');
  assert.equal(wearMult(0.6), 1); assert.equal(conditionLabel(0), 'quebrada'); assert.equal(conditionLabel(1), 'boa');
  assert.ok(wearCost(a, 'heavy', false) === 2 && wearCost(a, 'light1', true) === 0.75 && wearCost(a, 'light1', false, true) === 3 && wearCost(r, 'heavy') === 0);
  const inv = new Inventory({ emit() {} });
  inv.addWeapon('machado');
  assert.equal(inv.condition('machado'), 1);
  const res = inv.addWear('machado', a.durability * 0.6);
  assert.ok(res.before === 1 && Math.abs(res.after - 0.4) < 1e-9);
  assert.equal(inv.repair('machado', 0.6), true);
  assert.ok(Math.abs(inv.condition('machado') - 0.6) < 1e-9);
  assert.equal(inv.repair('machado', 0.6), false, 'a pedra não passa de 60%');
  inv.addWear('machado', 999); assert.equal(inv.condition('machado'), 0);
  inv.repair('machado', 1); assert.equal(inv.condition('machado'), 1);
  inv.addWear('machado', 10);
  const s = inv.serialize();
  const inv2 = new Inventory({ emit() {} }); inv2.restore(s);
  assert.equal(inv2.wear.machado, 10);
  // save antigo sem desgaste/tambor: armas novas; balas da reserva vão para o tambor (sem criar nem perder)
  const old = new Inventory({ emit() {} }); old.restore({ items: { municao_38: 9 }, weapons: ['machado', 'revolver'] });
  assert.deepEqual(old.wear, {});
  assert.equal(old.rounds('revolver'), 6); assert.equal(old.count('municao_38'), 3); assert.equal(old.ammoTotal('revolver'), 9);
  const few = new Inventory({ emit() {} }); few.restore({ items: { municao_38: 2 }, weapons: ['revolver'] });
  assert.equal(few.rounds('revolver'), 2); assert.equal(few.count('municao_38'), 0);
  const none = new Inventory({ emit() {} }); none.restore({ items: { municao_38: 4 }, weapons: ['machado'] });
  assert.equal(none.count('municao_38'), 4, 'sem revólver, nada muda');
  const saved = new Inventory({ emit() {} }); saved.restore({ items: { municao_38: 4 }, weapons: ['revolver'], loaded: { revolver: 1 } });
  assert.equal(saved.rounds('revolver'), 1); assert.equal(saved.count('municao_38'), 4);
});

test('mira manual: raio × esfera/cápsula, erra quando passa ao lado', () => {
  const cap = { type: 'capsule', x: 0, z: 5, y0: 0.3, y1: 1.6, r: 0.3 };
  const t = rayVsVolume({ x: 0, y: 1.2, z: 0 }, { x: 0, y: 0, z: 1 }, cap);
  assert.ok(Math.abs(t - 4.7) < 1e-6, String(t));
  assert.equal(rayVsVolume({ x: 0.5, y: 1.2, z: 0 }, { x: 0, y: 0, z: 1 }, cap), Infinity);
  assert.equal(rayVsVolume({ x: 0, y: 1.2, z: 0 }, { x: 0, y: 0, z: -1 }, cap), Infinity, 'atrás não conta');
  const d = Math.hypot(5, 1.4); // de cima, na calota
  const tt = rayVsVolume({ x: 0, y: 3, z: 0 }, { x: 0, y: -1.4 / d, z: 5 / d }, cap);
  assert.ok(tt < Infinity && tt > 4);
  const sph = { type: 'sphere', x: 2, y: 1, z: 2, r: 0.5 };
  const dd = Math.hypot(2, 2);
  assert.ok(Math.abs(rayVsVolume({ x: 0, y: 1, z: 0 }, { x: 2 / dd, y: 0, z: 2 / dd }, sph) - (dd - 0.5)) < 1e-6);
  const c = new CombatSystem({ scene: { add() {} } });
  const near = { alive: true, hurtVolumes: () => [{ ...cap, z: 3 }] }, far = { alive: true, hurtVolumes: () => [cap] };
  assert.equal(c.rayHit({ x: 0, y: 1.2, z: 0 }, { x: 0, y: 0, z: 1 }, 20, [far, near]).target, near);
  assert.equal(c.rayHit({ x: 0, y: 1.2, z: 0 }, { x: 0, y: 0, z: 1 }, 2, [far, near]), null, 'alcance');
});

test('trama RN 0: documento final, objetivo, itens de reparo e anos do livro de partos', () => {
  assert.ok(DOCUMENTS.contagem_confraria?.body.includes('Davi') && DOCUMENTS.contagem_confraria.body.includes('Tomé'));
  assert.ok(SIDE_OBJECTIVES.some((o) => o.when === 'foundBatismo' && o.done === 'rn0Revealed'));
  assert.ok(ITEMS.kit_reparo?.name);
  assert.ok(!DOCUMENTS.livro_partos.title.includes('1950'), 'o jogo se passa em 1934');
});

test('save v1 → v2: possuiMachado/machadoEquipado derivados de hasAxe e da lista de armas', () => {
  const a = migrateSave({ version: 1, flags: { hasAxe: true }, inventory: { items: {}, weapon: 'martelo', weapons: ['martelo'] } });
  assert.equal(a.version, 2); assert.equal(a.inventory.possuiMachado, true); assert.equal(a.inventory.machadoEquipado, false);
  assert.ok(a.inventory.weapons.includes('machado') && a.inventory.weapons.includes('martelo'));
  const b = migrateSave({ version: 1, flags: {}, inventory: { items: {}, weapon: null, weapons: [] } });
  assert.equal(b.inventory.possuiMachado, false); assert.deepEqual(b.inventory.weapons, []);
  const c = migrateSave({ version: 1, inventory: { weapon: 'machado' } });
  assert.equal(c.inventory.machadoEquipado, true); assert.deepEqual(c.inventory.weapons, ['machado']);
  const inv = new Inventory(); inv.restore({ items: {}, weapons: ['facao'], possuiMachado: true });
  assert.ok(inv.weapons.includes('machado')); assert.equal(inv.serialize().possuiMachado, true);
});

test('REV6: tempo do clipe casa a janela active com o golpe do clipe; quadril sem deriva XZ', () => {
  const m = ATTACK_CLIPS.heavy, act = [0.4, 0.6];
  assert.equal(attackClipTime(m, act, 0), m.seg[0]); assert.equal(attackClipTime(m, act, 1), m.seg[1]);
  assert.ok(Math.abs(attackClipTime(m, act, 0.4) - m.strike[0]) < 1e-9 && Math.abs(attackClipTime(m, act, 0.6) - m.strike[1]) < 1e-9);
  for (let t = 0; t < 1; t += 0.05) assert.ok(attackClipTime(m, act, t + 0.05) >= attackClipTime(m, act, t), 'monotônico');
  for (const k of ['Walking', 'Running', 'Attack', 'Double_Combo_Attack', CLIP.idle]) assert.ok(CONFIG_MACHADO.clipMap[k], 'variante _Machado de ' + k);
  const pos = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [0.1, 1, 0.2, 0.5, 1.1, 1.3]);
  const sc = new THREE.VectorKeyframeTrack('mixamorigSpine.scale', [0, 1], [1, 1, 1, 1, 1, 1]);
  const [clip] = prepareClips([new THREE.AnimationClip('Double_Combo_Attack', 1, [pos, sc])]);
  assert.equal(clip.tracks.length, 1, 'escala constante removida');
  const v = clip.tracks[0].values; [0.1, 1.1, 0.2].forEach((e, i) => assert.ok(Math.abs(v[3 + i] - e) < 1e-6, 'quadril ' + i));
});

test('REV6: coleta exige o machado do cenário a ≤ 1,5 m, esconde-o e mostra o equipado', () => {
  const pers = new THREE.Group(); const arma = new THREE.Object3D(); arma.name = 'Machado_Equipado'; arma.scale.setScalar(0); pers.add(arma);
  const clipes = [...new Set([...Object.keys(CONFIG_MACHADO.clipMap), ...Object.values(CONFIG_MACHADO.clipMap)])].map((n) => new THREE.AnimationClip(n, 1, []));
  const S = criarSistemaMachado({ THREE, personagem: pers, mixer: new THREE.AnimationMixer(pers), clipes, config: CONFIG_MACHADO });
  assert.equal(arma.visible, false, 'começa sem machado visível');
  const mundo = new THREE.Group(); mundo.userData.itemId = CONFIG_MACHADO.itemId;
  const mk = new THREE.Object3D(); mk.name = 'Machado_Coletavel'; mk.position.set(4.1, 0, 9.3); mundo.add(mk); mundo.updateMatrixWorld(true);
  assert.equal(S.tentarColetar(mundo, 1.5, new THREE.Vector3(4.1, 0, 7.5)), false, 'longe demais');
  assert.equal(S.tentarColetar(new THREE.Group(), 1.5, new THREE.Vector3(4.1, 0, 9.3)), false, 'objeto errado');
  assert.equal(S.tentarColetar(mundo, 1.5, new THREE.Vector3(4.1, 0, 8.7)), true);
  assert.equal(mundo.visible, false); assert.equal(arma.visible, true);
  assert.deepEqual(S.serializar(), { possuiMachado: true, machadoEquipado: true });
  S.tocar('Walking'); assert.equal(S.atual.getClip().name, CONFIG_MACHADO.clipMap.Walking, 'clipe _Machado com o machado');
});

test('REV6: clipes de ação/golpe existem no GLB e os trechos cabem na duração; combo do machado vai ao 3º golpe', () => {
  const f = readFileSync(new URL('../../public/models/elias_rev6.glb', import.meta.url));
  const j = JSON.parse(f.subarray(20, 20 + f.readUInt32LE(12)).toString());
  const dur = {};
  for (const a of j.animations) dur[a.name] = Math.max(...a.samplers.map((s) => j.accessors[s.input].max[0]));
  for (const [k, m] of [...Object.entries(ATTACK_CLIPS), ...Object.entries(ACTION_CLIPS).filter(([, m]) => m.seg)]) {
    for (const n of [m.clip, CONFIG_MACHADO.clipMap[m.clip]]) {
      assert.ok(dur[n] > 0, k + ': clipe ausente ' + n);
      assert.ok(m.seg[0] >= 0 && m.seg[1] <= dur[n] + 1e-3 && m.seg[0] < m.seg[1], k + ': trecho fora do clipe');
    }
  }
  assert.ok(dur[ACTION_CLIPS.aim.src] >= ACTION_CLIPS.aim.t && dur[ACTION_CLIPS.aimMove.clip] > 0, 'Run_and_Shoot');
  assert.equal(ATTACK_CLIPS.light3.clip, 'Triple_Combo_Attack'); assert.equal(ACTION_CLIPS.dodge.clip, 'Basic_Jump'); assert.equal(ACTION_CLIPS.door.clip, 'open_door_4');
  const m = WEAPONS.machado.attacks;
  assert.equal(m.light1.next, 'light2'); assert.equal(m.light2.next, 'light3'); assert.equal(m.light3.next, 'light1');
  assert.ok(m.light3.active[0] < m.light3.active[1] && m.light3.active[1] < 1 && m.light3.dmg > m.light2.dmg);
  const L = ATTACK_CLIPS.light3, a = m.light3.active;
  assert.ok(Math.abs(attackClipTime(L, a, a[0]) - L.strike[0]) < 1e-6 && Math.abs(attackClipTime(L, a, a[1]) - L.strike[1]) < 1e-6, 'janela active = 3º corte do clipe');
});

test('REV6: transições do mixer somam peso 1 (sem pisca de T-pose) e Elias_Aim usa o tronco do Run_and_Shoot', () => {
  const pers = new THREE.Group(); const arma = new THREE.Object3D(); arma.name = 'Machado_Equipado'; pers.add(arma);
  const names = [...new Set([...Object.keys(CONFIG_MACHADO.clipMap), ...Object.values(CONFIG_MACHADO.clipMap)])];
  const clipes = names.map((n) => new THREE.AnimationClip(n, 1, []));
  const S = criarSistemaMachado({ THREE, personagem: pers, mixer: new THREE.AnimationMixer(pers), clipes, config: CONFIG_MACHADO });
  S.tocar('Elias_Idle', { fade: 0 });
  assert.ok(Math.abs(S.pesoTotal() - 1) < 1e-6);
  const seq = ['Walking', 'Running', 'Elias_Idle', 'Walking', 'Basic_Jump', 'Elias_Idle', 'Run_and_Shoot', 'Elias_Aim'];
  for (const n of seq) {
    S.tocar(n, { fade: 0.2, repetir: n !== 'Basic_Jump' });
    for (let i = 0; i < 3; i++) { S.atualizar(1 / 60); assert.ok(Math.abs(S.pesoTotal() - 1) < 1e-6, n + ' soma ' + S.pesoTotal()); }
  }
  for (let i = 0; i < 30; i++) S.atualizar(1 / 60);
  assert.equal(S.atual.getEffectiveWeight(), 1); assert.equal(S.nomeBase, 'Elias_Aim');
  // makeIdleClips: Elias_Aim = pernas do idle + braço do Run_and_Shoot no instante AIM.t
  const q = (x) => new THREE.QuaternionKeyframeTrack(x[0], [0, 1], [...x[1], ...x[1]]);
  const qa = [0, 0, 0, 1], qb = [0, 0.7071, 0, 0.7071];
  const mk = (n, arm, leg) => new THREE.AnimationClip(n, 1, [q(['mixamorigRightArm.quaternion', arm]), q(['mixamorigLeftUpLeg.quaternion', leg])]);
  const cl = makeIdleClips([mk(CLIP.idleSrc, qa, qa), mk(CLIP.walk, qa, qa), mk('Run_and_Shoot', qb, qb), mk('Run_and_Shoot_Machado', qb, qb)]);
  const aim = cl.find((c) => c.name === 'Elias_Aim'), aimM = cl.find((c) => c.name === 'Elias_Aim_Machado');
  assert.ok(aim && aimM, 'Elias_Aim gerado (e variante _Machado)');
  const v = (c, n) => Array.from(c.tracks.find((t) => t.name === n).values.slice(0, 4)).map((x) => +x.toFixed(3));
  assert.deepEqual(v(aim, 'mixamorigRightArm.quaternion'), qb.map((x) => +x.toFixed(3)), 'braço do Run_and_Shoot');
  assert.deepEqual(v(aim, 'mixamorigLeftUpLeg.quaternion'), qa, 'perna do idle');
});

test('Cap. 2: save inicial mantém armas/melhorias e remove itens-chave do hospital', () => {
  const prev = { ...createEmptySave(), checkpoint: 'yard', player: { hp: 40 },
    inventory: { items: { bandagem: 2, fusivel: 1, chave_escada: 1, manivela: 1, municao_38: 5, kit_reparo: 1, amuleto_menino: 1 }, weapon: 'machado', weapons: ['machado', 'revolver'], wear: { machado: 30 }, loaded: { revolver: 3 }, possuiMachado: true, machadoEquipado: true },
    flags: { chapterDone: true, bossDead: true, maxHpUp: true, hasAmulet: true, sharpened: true, picked_axe: true },
    doors: { ward: { open: true, locked: false } }, deadEnemies: ['int_cor'], documents: ['ficha_elias'], playTime: 1234, stats: { kills: 9 } };
  const s = makeChapter2Save(prev);
  assert.equal(s.chapter, 2); assert.equal(s.checkpoint, 'c2_gate'); assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.player.hp, 80, 'vida mínima 80 ao começar');
  for (const k of CH1_KEY_ITEMS) assert.ok(!(k in s.inventory.items), 'sem ' + k);
  assert.deepEqual([s.inventory.items.bandagem, s.inventory.items.municao_38, s.inventory.items.kit_reparo], [2, 5, 1]);
  assert.deepEqual(s.inventory.weapons, ['machado', 'revolver']); assert.equal(s.inventory.weapon, 'machado');
  assert.equal(s.inventory.wear.machado, 30); assert.equal(s.inventory.loaded.revolver, 3); assert.equal(s.inventory.possuiMachado, true);
  assert.ok(s.flags.maxHpUp && s.flags.hasAmulet && s.flags.sharpened && s.flags.ch1Done && s.flags.c2_started);
  assert.deepEqual(s.doors, {}); assert.deepEqual(s.deadEnemies, []);
  assert.deepEqual(s.documents, ['ficha_elias']); assert.equal(s.playTime, 1234); assert.equal(s.stats.kills, 9);
  assert.equal(prev.inventory.items.fusivel, 1, 'não altera o save original');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).chapter, 2, 'migração preserva o capítulo');
  assert.equal(makeChapter2Save(null).chapter, 2, 'sem save anterior também funciona');
});

test('Cap. 2: objetivos, mapa do Bairro Operário e caçador', () => {
  assert.equal(CHAPTERS.find((c) => c.id === 2).playable, true);
  const q = new QuestSystem(null, 2); q.restore({ c2_started: true });
  assert.equal(q.current(), OBJECTIVES_C2[0].text);
  q.set('c2_inDepot'); assert.equal(q.current(), OBJECTIVES_C2[1].text);
  assert.ok(q.side().includes(SIDE_OBJECTIVES_C2[0].text), 'beco como objetivo opcional');
  const q1 = new QuestSystem(null); assert.notEqual(q1.current(), OBJECTIVES_C2[0].text, 'Cap. 1 inalterado');
  assert.equal(roomAt({ x: 24, y: 0, z: 14 })?.ch || 1, 1, 'Cap. 1 não vê salas do Cap. 2');
  setMapChapter(2);
  try {
    assert.deepEqual(chapterFloors().map((f) => f.id), ['up']);
    assert.equal(roomAt({ x: 24, y: 0, z: 14 }).id, 'c2_deposito');
    assert.equal(roomAt({ x: 37, y: 0, z: 21 }).id, 'c2_escritorio');
    assert.equal(roomAt({ x: 11, y: 0, z: 12 }).id, 'c2_beco');
    assert.equal(knownRooms({ c2_started: true }, 'up').length >= 0, true);
  } finally { setMapChapter(1); }
  const c = ENEMIES.cacador; assert.ok(c && c.hearing > 2 && c.attacks.length === 2 && c.attacks.every((a) => ['swipe', 'lunge'].includes(a.id)));
  assert.ok(ITEMS.manivela_carga && DOCUMENTS.jornal_vespera && DOCUMENTS.bilhete_capataz);
});

test('Cap. 2: Rua do Carvão, fábrica, chefe e fim do capítulo (dados)', () => {
  const order = OBJECTIVES_C2.map((o) => o.done);
  assert.deepEqual(order.slice(3), ['c2_sliceDone', 'c2_inCoal', 'c2_hasFactoryKey', 'c2_factoryOpen', 'c2_valves', 'c2_bossDead', 'c2_chapterDone', 'c2_never']);
  assert.ok(!OBJECTIVES_C2.some((o) => /prévia/.test(o.text)), 'sem texto de prévia');
  const q = new QuestSystem(null, 2);
  q.restore({ c2_started: true, c2_inDepot: true, c2_hasCrank: true, c2_shutterOpen: true, c2_sliceDone: true });
  assert.match(q.current(), /Rua do Carvão/, 'save antigo (fim da prévia) segue para a Rua do Carvão');
  q.set('c2_inCoal'); q.set('c2_hasFactoryKey'); q.set('c2_factoryOpen'); q.set('c2_valves'); q.set('c2_bossDead');
  assert.ok(q.side().some((t) => /grelha/.test(t)), 'passe do bonde como objetivo opcional');
  setMapChapter(2);
  try {
    assert.equal(roomAt({ x: 44, y: 0, z: 45 }).id, 'c2_carvao');
    assert.equal(roomAt({ x: 34, y: 0, z: 43 }).id, 'c2_carvoaria');
    assert.equal(roomAt({ x: 45, y: 0, z: 70 }).id, 'c2_fabrica');
    assert.equal(roomAt({ x: 45, y: 0, z: 86 }).id, 'c2_fornalhas');
  } finally { setMapChapter(1); }
  const cv = ENEMIES.carvoeiro;
  assert.ok(cv && cv.hp > ENEMIES.cacador.hp && cv.attacks.length >= 1, 'carvoeiro mais robusto que o caçador');
  for (const id of ['escala_turno', 'diario_fornalheiro', 'recado_ines']) assert.equal(DOCUMENTS[id]?.ch, 2, id);
  assert.ok(ITEMS.chave_fabrica && ITEMS.passe_bonde);
});

const { FURNACE_PHASES } = await import('../../src/ai/FurnaceBoss.js');
test('Cap. 2: Brás tem 3 fases (limiares de vida)', () => {
  assert.ok(FURNACE_PHASES.p2 > FURNACE_PHASES.p3 && FURNACE_PHASES.p3 > 0);
});

const { makeChapter3Save } = await import('../../src/core/SaveManager.js');
const { OBJECTIVES_C3 } = await import('../../src/data/chapters.js');
const { VAULT_CODE } = await import('../../src/scenes/sede/SedeScript.js');
const { DIAL_SYMBOLS, SEDE_CHECKPOINTS } = await import('../../src/scenes/sede/SedeLevel.js');
test('Cap. 3: save mantém o passe, remove itens-chave do Cap. 1/2 e começa no bonde', () => {
  const prev = createEmptySave(); prev.chapter = 2; prev.flags = { c2_hasPass: true, sharpened: true, hasAmulet: true };
  prev.inventory.items = { passe_bonde: 1, manivela_carga: 1, chave_fabrica: 1, fusivel: 1, bandagem: 2 };
  prev.inventory.weapons = ['machado', 'revolver']; prev.documents = ['recado_ines']; prev.player.hp = 30;
  const s = makeChapter3Save(prev);
  assert.equal(s.chapter, 3); assert.equal(s.checkpoint, 'c3_tram');
  assert.equal(s.inventory.items.passe_bonde, 1); assert.equal(s.inventory.items.bandagem, 2);
  for (const k of ['manivela_carga', 'chave_fabrica', ...CH1_KEY_ITEMS]) assert.ok(!s.inventory.items[k], k);
  assert.ok(s.flags.c2_chapterDone && s.flags.c3_started && s.flags.sharpened && s.flags.hasAmulet);
  assert.deepEqual(s.deadEnemies, []); assert.ok(s.documents.includes('recado_ines'));
  assert.ok(s.player.hp >= 80, 'chega ao Cap. 3 com vida mínima');
  assert.ok(makeChapter3Save(null).inventory.items.passe_bonde >= 1, 'sem save anterior também leva o passe');
  assert.ok(SEDE_CHECKPOINTS[s.checkpoint]);
});
test('Cap. 3: objetivos, mapa da Sede, acólito, documentos e segredo do Regimento', () => {
  assert.equal(CHAPTERS.find((c) => c.id === 3).playable, true);
  assert.deepEqual(OBJECTIVES_C3.map((o) => o.done), ['c3_wicketOpen', 'c3_inHall', 'c3_readRegimento', 'c3_vaultOpen', 'c3_inArchive', 'c3_hasDossier', 'c3_hasSignet', 'c3_cryptOpen', 'c3_bossDead', 'c3_chapterDone', 'c3_never']);
  try {
    setMapChapter(3);
    assert.deepEqual(chapterFloors().map((f) => f.id).sort(), ['lo', 'up']);
    assert.equal(roomAt({ x: 18, y: 0, z: 20 }).id, 'c3_salao');
    assert.equal(roomAt({ x: 25, y: -4.5, z: 50 }).id, 'c3_arquivo');
    assert.equal(roomAt({ x: 10, y: 0, z: 34 }).id, 'c3_secretaria');
  } finally { setMapChapter(1); }
  const a = ENEMIES.acolito;
  assert.ok(a && a.hp > ENEMIES.cacador.hp && a.attacks.length >= 2 && a.attacks.every((k) => k.windup > 0 && k.dmg > 0));
  for (const id of ['livro_portaria', 'regimento_arquivo', 'ficha_ines', 'dossie_elias']) assert.equal(DOCUMENTS[id]?.ch, 3, id);
  assert.ok(ITEMS.dossie_elias && /Véu/.test(ITEMS.passe_bonde.desc));
  // o Regimento cita a ordem que abre o portão
  const body = DOCUMENTS.regimento_arquivo.body;
  const order = VAULT_CODE.map((i) => DIAL_SYMBOLS[i]);
  let at = -1; for (const w of order) { const k = body.indexOf(w, at + 1); assert.ok(k > at, w); at = k; }
});

const { SACRISTAN_PHASES, SACRISTAN_SUMMON, SWEEP_R } = await import('../../src/ai/SacristanBoss.js');
const { C3_BOSS_TRIGGER } = await import('../../src/scenes/sede/SedeScript.js');
const { CRYPT, CRYPT_NICHES, SACRISTAN_POS, CRYPT_PILLARS } = await import('../../src/scenes/sede/SedeLevel.js');
test('Cap. 3: O Sacristão — fases, invocação limitada, cripta e saves', () => {
  assert.ok(SACRISTAN_PHASES.p2 > SACRISTAN_PHASES.p3 && SACRISTAN_PHASES.p3 > 0);
  assert.ok(SACRISTAN_SUMMON.maxAlive <= 2 && SACRISTAN_SUMMON.maxTotal <= 4 && SACRISTAN_SUMMON.perCall <= SACRISTAN_SUMMON.maxAlive);
  assert.ok(SWEEP_R > 2 && SWEEP_R < 4.5);
  // chefe, nichos e pilares dentro da arena; gatilho dentro da arena e depois da porta (z 68)
  const T = C3_BOSS_TRIGGER, inA = (x, z) => x > 14 && x < 36 && z > 68 && z < 90;
  assert.ok(inA(SACRISTAN_POS.x, SACRISTAN_POS.z) && SACRISTAN_POS.y === CRYPT && CRYPT < -6);
  for (const n of CRYPT_NICHES) assert.ok(inA(n.x, n.z));
  for (const [x, z] of CRYPT_PILLARS) assert.ok(inA(x, z));
  assert.ok(T.minZ > 68 && T.maxZ < 90 && T.minX >= 14 && T.maxX <= 36);
  for (const id of ['c3_preboss', 'c3_end']) assert.ok(SEDE_CHECKPOINTS[id] && SEDE_CHECKPOINTS[id].y === CRYPT, id);
  assert.equal(DOCUMENTS.ordem_transferencia?.ch, 3);
  assert.ok(/Vigia/.test(DOCUMENTS.ordem_transferencia.body) && /Cidade Morta/.test(DOCUMENTS.ordem_transferencia.body));
  assert.ok(/sinete/i.test(DOCUMENTS.dossie_elias.body) && ITEMS.sinete_chama && ITEMS.fita_ines);
  try {
    setMapChapter(3);
    assert.equal(roomAt({ x: 25, y: CRYPT, z: 80 }).id, 'c3_cripta');
    assert.equal(roomAt({ x: 25, y: CRYPT, z: 62 }).id, 'c3_cripta_escada');
    assert.equal(roomAt({ x: 38, y: CRYPT, z: 86 }).id, 'c3_galeria');
  } finally { setMapChapter(1); }
  // um save antigo do Cap. 3 (fatia anterior, sem as flags da cripta) continua válido
  const old = migrateSave({ ...makeChapter3Save(null), checkpoint: 'c3_archive', flags: { c3_started: true, c3_hasDossier: true } });
  assert.ok(old && SEDE_CHECKPOINTS[old.checkpoint] && !old.flags.c3_cryptOpen && !old.flags.c3_bossDead);
});

const { makeChapter4Save, CH3_KEY_ITEMS, CH2_KEY_ITEMS } = await import('../../src/core/SaveManager.js');
const { OBJECTIVES_C4, SIDE_OBJECTIVES_C4, objectivesFor, sideObjectivesFor } = await import('../../src/data/chapters.js');
const { CIDADE_CHECKPOINTS, PLAZA, PLAZA_OBSTACLES, VIGIA_BALCONY } = await import('../../src/scenes/cidade/CidadeLevel.js');
const { C4_BOSS_TRIGGER, CIDADE_SPAWNS } = await import('../../src/scenes/cidade/CidadeScript.js');
const { VIGIA_RETREAT, VIGIA_BOUNDS } = await import('../../src/ai/VigiaBoss.js');
test('Cap. 4: migração do save do fim do Cap. 3 (bueiro), itens e flags', () => {
  const end3 = migrateSave({ ...createEmptySave(), chapter: 3, checkpoint: 'c3_end', player: { hp: 40 },
    inventory: { items: { bandagem: 2, municao_38: 7, sinete_chama: 1, passe_bonde: 1, fita_ines: 1, dossie_elias: 1, chave_fabrica: 1, fusivel: 1 }, weapon: 'machado', weapons: ['machado', 'revolver'], possuiMachado: true, machadoEquipado: true },
    flags: { c3_started: true, c3_bossDead: true, c3_chapterDone: true, hasBracelet: true, sharpened: true }, doors: { c3_arena: { open: true } }, deadEnemies: ['aco_hall'], documents: ['ordem_transferencia', 'dossie_elias'], playTime: 3600 });
  const s = makeChapter4Save(end3);
  assert.equal(s.chapter, 4); assert.equal(s.checkpoint, 'c4_drain'); assert.ok(CIDADE_CHECKPOINTS[s.checkpoint]);
  assert.equal(s.player.hp, 80);
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS]) assert.equal(s.inventory.items[k], undefined, k);
  for (const k of ['fita_ines', 'dossie_elias', 'passe_bonde', 'bandagem', 'municao_38']) assert.ok(s.inventory.items[k] > 0, k);
  assert.ok(s.inventory.possuiMachado && s.inventory.weapons.includes('revolver'));
  assert.ok(s.flags.c3_chapterDone && s.flags.ch3Done && s.flags.c4_started && s.flags.hasBracelet && s.flags.sharpened);
  assert.deepEqual(s.doors, {}); assert.deepEqual(s.deadEnemies, []);
  assert.deepEqual(s.documents, ['ordem_transferencia', 'dossie_elias']); assert.equal(s.playTime, 3600);
  assert.ok(migrateSave(JSON.parse(JSON.stringify(s))).chapter === 4);
  assert.equal(CHAPTERS.find((c) => c.id === 4).playable, true);
  assert.ok(ITEMS.chave_relojoaria && ITEMS.chave_torre);
});
test('Cap. 4: objetivos, mapa do centro antigo, cinzento e documentos', () => {
  assert.equal(objectivesFor(4), OBJECTIVES_C4); assert.equal(sideObjectivesFor(4), SIDE_OBJECTIVES_C4);
  assert.equal(objectivesFor(3).length > 0 && objectivesFor(3) !== OBJECTIVES_C4, true);
  const q = new QuestSystem(null, 4);
  assert.equal(OBJECTIVES_C4[0].done, 'c4_inStreet'); assert.equal(q.current(), OBJECTIVES_C4[0].text);
  for (const k of ['c4_hasWatchKey', 'c4_watchOpen', 'c4_inPlaza', 'c4_vigiaRetreat', 'c4_hasTowerKey', 'c4_sliceDone']) assert.ok(OBJECTIVES_C4.some((o) => o.done === k), k);
  assert.equal(OBJECTIVES_C4[OBJECTIVES_C4.length - 1].done, 'c4_never');
  for (const o of SIDE_OBJECTIVES_C4) assert.ok(o.when && o.done && o.text);
  try {
    setMapChapter(4);
    assert.deepEqual(chapterFloors().map((f) => f.id), ['up', 'roof']);
    assert.equal(roomAt({ x: 15, y: 9, z: 90 }).id, 'c4_maquinas');
    assert.equal(roomAt({ x: 17.7, y: 9, z: 80 }).id, 'c4_galeria');
    assert.equal(roomAt({ x: 15, y: 5.8, z: 101 }).id, 'c4_passagem');
    assert.equal(roomAt({ x: 7, y: 0, z: 3 }).id, 'c4_beco');
    assert.equal(roomAt({ x: 7, y: 0, z: 30 }).id, 'c4_rua');
    assert.equal(roomAt({ x: 0, y: 0, z: 22 }).id, 'c4_farmacia');
    assert.equal(roomAt({ x: 14, y: 0, z: 35 }).id, 'c4_relojoaria');
    assert.equal(roomAt({ x: 14, y: 0, z: 45 }).id, 'c4_patio');
    assert.equal(roomAt({ x: 20, y: 0, z: 60 }).id, 'c4_praca');
    assert.equal(roomAt({ x: 15, y: 0, z: 80 }).id, 'c4_torre');
  } finally { setMapChapter(1); }
  assert.equal(roomAt({ x: 14, y: 0, z: 35 })?.id?.startsWith('c4_') ?? false, false);
  const c = ENEMIES.cinzento;
  assert.ok(c && c.chase > c.walk * 3 && c.hearing < ENEMIES.acolito.hearing && c.attacks.length >= 2 && c.attacks.every((k) => k.windup > 0));
  for (const id of ['edital_toque', 'diario_farmaceutico', 'caderno_relojoeiro']) assert.equal(DOCUMENTS[id]?.ch, 4, id);
  assert.ok(/gaveta do caixa/.test(DOCUMENTS.diario_farmaceutico.body) && /lampião/.test(DOCUMENTS.caderno_relojoeiro.body) && /3h07/.test(DOCUMENTS.edital_toque.body));
  for (const s of CIDADE_SPAWNS) assert.ok(ENEMIES[s.type], s.id);
});
test('Cap. 4: O Vigia — praça, gatilho, retirada e obstáculos', () => {
  const inP = (x, z) => x > PLAZA.minX && x < PLAZA.maxX && z > PLAZA.minZ && z < PLAZA.maxZ;
  const T = C4_BOSS_TRIGGER;
  assert.ok(T.minZ > PLAZA.minZ + 2 && T.maxZ <= PLAZA.maxZ && T.minX >= PLAZA.minX && T.maxX <= PLAZA.maxX);
  assert.ok(CIDADE_CHECKPOINTS.c4_plaza.z < T.minZ && inP(CIDADE_CHECKPOINTS.c4_plaza.x, CIDADE_CHECKPOINTS.c4_plaza.z));
  for (const [x, z] of PLAZA_OBSTACLES) assert.ok(inP(x, z));
  assert.ok(VIGIA_RETREAT > 0.2 && VIGIA_RETREAT < 0.7);
  assert.ok(VIGIA_BOUNDS.minX >= PLAZA.minX && VIGIA_BOUNDS.maxX <= PLAZA.maxX && VIGIA_BOUNDS.minZ > PLAZA.minZ && VIGIA_BOUNDS.maxZ < PLAZA.maxZ);
  assert.ok(VIGIA_BALCONY.y > 6 && Math.abs(VIGIA_BALCONY.z - PLAZA.maxZ) < 1.5);
  for (const id of ['c4_drain', 'c4_watch', 'c4_plaza', 'c4_tower']) assert.ok(CIDADE_CHECKPOINTS[id] && CIDADE_CHECKPOINTS[id].y === 0, id);
  // um save antigo do Cap. 3 concluído vira Cap. 4 ao continuar (Game.continueGame usa makeChapter4Save)
  const old = migrateSave({ ...makeChapter3Save(null), checkpoint: 'c3_end', flags: { c3_chapterDone: true } });
  assert.ok(old.flags.c3_chapterDone && makeChapter4Save(old).chapter === 4);
});

const C4L = await import('../../src/scenes/cidade/CidadeLevel.js');
const C4S = await import('../../src/scenes/cidade/CidadeScript.js');
test('Cap. 4: Torre do Relógio — escada, casa das máquinas, 2º confronto e passagem', () => {
  // objetivos: depois da porta da Torre vêm subida, roda de escape, mecanismo, Vigia, ponteiros e passagem
  const order = OBJECTIVES_C4.map((o) => o.done);
  const after = order.slice(order.indexOf('c4_sliceDone') + 1);
  assert.deepEqual(after, ['c4_inGears', 'c4_hasEscape', 'c4_mechRunning', 'c4_vigiaDead', 'c4_passageOpen', 'c4_chapterDone', 'c4_never']);
  assert.ok(SIDE_OBJECTIVES_C4.some((o) => o.done === 'c4_readRondas') && SIDE_OBJECTIVES_C4.some((o) => o.done === 'c4_readBilhete'));
  for (const id of ['livro_rondas', 'bilhete_ines']) assert.equal(DOCUMENTS[id]?.ch, 4, id);
  assert.ok(/3h07/.test(DOCUMENTS.livro_rondas.body) && /Afogada/.test(DOCUMENTS.bilhete_ines.body));
  assert.ok(ITEMS.roda_escape);
  // a escada sobe do térreo (y 0) até a galeria (GEAR_Y), lance a lance, sem degrau impossível
  const F = C4L.TOWER_FLIGHTS;
  assert.equal(F.length, 4);
  const ys = F.map((f) => [f.yb, f.ya]);
  assert.equal(ys[0][0], 0); assert.equal(ys[ys.length - 1][1], C4L.GEAR_Y);
  for (let i = 1; i < ys.length; i++) assert.equal(ys[i][0], ys[i - 1][1]);
  // horas do mostrador: a certa é a do toque
  assert.equal(C4L.C4_HOURS[C4L.C4_RIGHT_HOUR], '3h07');
  assert.equal(new Set(C4L.C4_HOURS).size, C4L.C4_HOURS.length);
  // checkpoints da Torre
  assert.equal(C4L.CIDADE_CHECKPOINTS.c4_gears.y, C4L.GEAR_Y); assert.equal(C4L.CIDADE_CHECKPOINTS.c4_end.y, C4L.GEAR_Y);
  const B = C4L.VIGIA_HALL_BOUNDS, H = C4L.HALL;
  assert.ok(B.minX > H.minX && B.maxX < H.maxX && B.minZ > H.minZ && B.maxZ < H.maxZ);
  for (const [x, z] of C4L.HALL_OBSTACLES) assert.ok(x > B.minX && x < B.maxX && z > B.minZ && z < B.maxZ);
  const P = C4L.PASSAGE; assert.ok(P.minX > H.minX && P.maxX < H.maxX && P.maxZ <= H.maxZ && P.stairEnd > P.maxZ);
  // pêndulo cruza a linha da galeria até o mecanismo
  const PD = C4L.PENDULUM; assert.ok(PD.z > H.minZ && PD.z < C4L.MECH.minZ && C4L.GEAR_Y + PD.pivotY - PD.len < C4L.GEAR_Y + 1.6);
  // um cinzento novo na casa das máquinas (8 inimigos no capítulo), adormecido
  assert.equal(C4S.CIDADE_SPAWNS.length, 8);
  const w = C4S.CIDADE_SPAWNS.find((e) => e.id === 'cin_maq'); assert.ok(w && w.dormant && w.y === C4L.GEAR_Y);
  assert.ok(C4S.C4_VIGIA_HP2 > 300);
});

const C5L = await import('../../src/scenes/aguas/AguasLevel.js');
const C5S = await import('../../src/scenes/aguas/AguasScript.js');
const { makeChapter5Save, CH4_KEY_ITEMS } = await import('../../src/core/SaveManager.js');
const { OBJECTIVES_C5, SIDE_OBJECTIVES_C5 } = await import('../../src/data/chapters.js');
test('Cap. 5: migração do Cap. 4 concluído, objetivos em ordem e documentos', () => {
  const end4 = migrateSave({ ...makeChapter4Save(null), checkpoint: 'c4_end', flags: { c4_chapterDone: true, hasAmulet: true }, inventory: { items: { bandagem: 2, municao_38: 7, chave_torre: 1, roda_escape: 1 }, weapons: ['machado', 'revolver'], wear: {}, loaded: { revolver: 6 } }, documents: ['livro_rondas'], player: { hp: 30 } });
  const s = makeChapter5Save(end4);
  assert.equal(s.chapter, 5); assert.equal(s.checkpoint, 'c5_passage');
  assert.ok(s.flags.c4_chapterDone && s.flags.ch4Done && s.flags.c5_started && s.flags.hasAmulet);
  assert.equal(s.inventory.items.bandagem, 2); assert.equal(s.inventory.items.municao_38, 7);
  for (const k of CH4_KEY_ITEMS) assert.equal(s.inventory.items[k], undefined, k);
  assert.ok(s.inventory.weapons.includes('revolver') && s.documents.includes('livro_rondas'));
  assert.ok(s.player.hp >= 80); assert.deepEqual(s.deadEnemies, []);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).chapter, 5);
  assert.equal(makeChapter5Save(null).chapter, 5);
  assert.equal(objectivesFor(5), OBJECTIVES_C5); assert.equal(sideObjectivesFor(5), SIDE_OBJECTIVES_C5);
  assert.deepEqual(OBJECTIVES_C5.map((o) => o.done), ['c5_inCanal', 'c5_crossed', 'c5_inPumps', 'c5_hasFuse', 'c5_power', 'c5_upper', 'c5_sluiceOpen', 'c5_sliceDone', 'c5_afogadaDead', 'c5_chapterDone', 'c5_never']);
  const q = new QuestSystem(null, 5); assert.equal(q.current(), OBJECTIVES_C5[0].text);
  assert.ok(SIDE_OBJECTIVES_C5.length >= 1 && SIDE_OBJECTIVES_C5.length <= 4);
  for (const o of SIDE_OBJECTIVES_C5) assert.ok(o.when && o.done && o.text);
  for (const id of ['aviso_comporta', 'relatorio_bombeamento', 'diario_comporteiro', 'ficha_remessa']) assert.equal(DOCUMENTS[id]?.ch, 5, id);
  // o relatório dá a ordem certa dos disjuntores
  const order = C5L.BREAKER_ORDER.map((i) => C5L.BREAKERS[i]);
  const body = DOCUMENTS.relatorio_bombeamento.body;
  let at = -1; for (const n of order) { const k = body.indexOf(n, at + 1); assert.ok(k > at, n); at = k; }
  assert.ok(ITEMS.fusivel_ceramico && CHAPTERS.find((c) => c.id === 5)?.playable === true);
});
test('Cap. 5: mapa dos canais, afogado e checkpoints', () => {
  try {
    setMapChapter(5);
    assert.deepEqual(chapterFloors().map((f) => f.id), ['up', 'up2']);
    assert.equal(roomAt({ x: 15, y: 0, z: 4 }).id, 'c5_passagem');
    assert.equal(roomAt({ x: 20, y: -1, z: 16 }).id, 'c5_canal');
    assert.equal(roomAt({ x: 4, y: 0, z: 25 }).id, 'c5_comporteiro');
    assert.equal(roomAt({ x: 27, y: 0, z: 25 }).id, 'c5_painel');
    assert.equal(roomAt({ x: 36, y: 0, z: 25 }).id, 'c5_ante');
    assert.equal(roomAt({ x: 36, y: 0, z: 36 }).id, 'c5_bombas');
    assert.equal(roomAt({ x: 29.3, y: 4.5, z: 53 }).id, 'c5_passarela');
    assert.equal(roomAt({ x: 33, y: 4.5, z: 64 }).id, 'c5_turbinas');
  } finally { setMapChapter(1); }
  assert.equal(roomAt({ x: 36, y: 0, z: 36 })?.id?.startsWith('c5_') ?? false, false);
  const a = ENEMIES.afogado;
  assert.ok(a && a.aquatic && a.drySpeed < 1 && a.wetSpeed > 1 && a.wetDmg > 1 && a.emergeTime > 0);
  assert.ok(a.attacks.length >= 2 && a.attacks.every((k) => k.windup > 0));
  // na água ou na beira: molhado; no seco (galeria): seco
  const L = Object.create(C5L.AguasLevel.prototype);
  assert.equal(L.wetness({ x: 20, y: -1, z: 16 }), 1);
  assert.ok(L.wetness({ x: 20, y: 0, z: 19.8 }) > 0.5);
  assert.equal(L.wetness({ x: 30, y: 0, z: 25 }), 0);
  assert.ok(L.waterAt({ x: 20, y: -1.4, z: 16 }));
  assert.equal(L.waterAt({ x: 20, y: 0, z: 16 }), null); // na passarela
  assert.equal(L.waterAt({ x: 20, y: 0, z: 25 }), null);
  for (const s of C5S.AGUAS_SPAWNS) assert.ok(ENEMIES[s.type], s.id);
  assert.ok(C5S.AGUAS_SPAWNS.filter((s) => s.type === 'afogado').length >= 3);
  for (const s of C5S.AGUAS_SPAWNS.filter((s) => s.submerged)) assert.ok(s.dormant && s.y < 0, s.id);
  const CP = C5L.AGUAS_CHECKPOINTS;
  for (const id of ['c5_passage', 'c5_pumps', 'c5_slice']) assert.ok(CP[id], id);
  assert.equal(CP.c5_passage.y, 0); assert.equal(CP.c5_slice.y, C5L.UPPER);
  assert.equal(L.waterAt(CP.c5_passage), null); assert.equal(L.waterAt(CP.c5_pumps), null);
  assert.deepEqual([...C5L.BREAKER_ORDER].sort(), [0, 1, 2]);
});

const { AfogadaBoss, AFOGADA_DMG, AFOGADA_PHASES } = await import('../../src/ai/AfogadaBoss.js');
const { normalizeChapter5Flags } = await import('../../src/core/SaveManager.js');
function afogadaGame() {
  const col = new CollisionWorld();
  const noop = () => {};
  const mats = new Proxy({}, { get: (t, k) => (t[k] ||= new THREE.MeshLambertMaterial({ color: 0x777777 })) });
  const pl = { pos: new THREE.Vector3(33, C5L.UPPER, 70), radius: 0.32, alive: true, hp: 100, hits: 0, takeHit() { this.hits++; return 'hit'; }, releaseGrab: noop, grabbedBy: null, grab: noop };
  return { col, materials: mats, scene: new THREE.Scene(), audio: { play: noop }, hud: { toast: noop }, cameraCtl: { addShake: noop },
    combat: { emit: noop, blood: noop, sparks: noop, splash: noop }, bus: { emit: noop }, player: pl, perception: { noise: noop } };
}
test('Cap. 5: A Afogada — imune submersa, guelras fortes no seco, turbina/ralo/fases e morte', () => {
  const P = C5L.POOL, U = C5L.UPPER, A = C5L.ARENA;
  // geometria: poço dentro do salão, margens secas dos dois lados, máquinas e grades nas margens
  assert.ok(P.minX > A.minX + 2 && P.maxX < A.maxX - 2 && P.minZ > A.minZ + 2 && P.maxZ < A.maxZ - 4 && P.top === U && P.bed < P.level && P.level < U);
  const L = Object.create(C5L.AguasLevel.prototype);
  assert.ok(L.waterAt({ x: 33, y: P.bed, z: 78 })?.id === 'turbinas');
  assert.equal(L.waterAt({ x: 26, y: U, z: 78 }), null);
  assert.ok(L.wetness({ x: 33, y: P.bed, z: 78 }) === 1 && L.wetness({ x: 26, y: U, z: 70 }) < 0.5);
  L.poolDrained = true; assert.equal(L.waterAt({ x: 33, y: P.bed, z: 78 }), null); assert.equal(L.wetness({ x: 33, y: P.bed, z: 78 }), 0);
  const inPool = (o) => o.x > P.minX && o.x < P.maxX && o.z > P.minZ && o.z < P.maxZ;
  for (const g of C5L.GRATES) assert.ok(!inPool({ x: (g.minX + g.maxX) / 2, z: (g.minZ + g.maxZ) / 2 }) && g.minX >= A.minX && g.maxX <= A.maxX);
  assert.ok(!inPool(C5L.TURBINE_LEVER) && !inPool(C5L.DRAIN_VALVE) && C5L.TURBINE_HOUSING.minZ > P.maxZ);
  const CP = C5L.AGUAS_CHECKPOINTS;
  assert.ok(CP.c5_boss.z > A.minZ && CP.c5_boss.z < P.minZ && CP.c5_end.z > A.maxZ && CP.c5_end.z < C5L.DISCHARGE.endZ);
  // chefe
  const g = afogadaGame();
  for (const w of C5L.WATERS) g.col.addFloor({ minX: w.minX, maxX: w.maxX, minZ: w.minZ, maxZ: w.maxZ, y: w.bed });
  g.col.addFloor({ minX: A.minX, maxX: A.maxX, minZ: A.minZ, maxZ: P.minZ, y: U });
  const b = new AfogadaBoss(g, { x: 33, y: P.bed, z: 78, pool: P, bounds: C5L.ARENA_BOUNDS, intake: { x: 33, y: P.bed, z: 83 } });
  assert.equal(b.state, 'dormant'); assert.equal(b.takeHit({ dmg: 50, volume: { part: 'weak' } }), 'immune');
  b.activate(); assert.equal(b.state, 'emerge'); assert.deepEqual(b.hurtVolumes(), []);
  for (let i = 0; i < 30; i++) b.update(0.1);
  assert.equal(b.state, 'swim'); assert.ok(b.wet);
  assert.equal(b.takeHit({ dmg: 50, volume: { part: 'weak' } }), 'immune');
  // à tona (bote), dentro d'água: golpes quase não entram
  b._set('lunge'); const h0 = b.hp;
  b.takeHit({ dmg: 100, volume: { part: 'body' } }); assert.ok(Math.abs(h0 - b.hp - 100 * AFOGADA_DMG.wet.body) < 1e-6);
  // turbina: só pega se ela estiver na água
  assert.equal(b.turbinePull(), true); assert.equal(b.state, 'pinned');
  const vols = b.hurtVolumes(); assert.ok(vols.find((v) => v.part === 'weak') && vols.find((v) => v.part === 'body'));
  const h1 = b.hp; b.takeHit({ dmg: 40, volume: { part: 'weak' } }); assert.ok(Math.abs(h1 - b.hp - 40 * AFOGADA_DMG.exposed.weak) < 1e-6);
  assert.ok(AFOGADA_DMG.exposed.weak > AFOGADA_DMG.dry.weak && AFOGADA_DMG.dry.weak > AFOGADA_DMG.wet.weak * 2 && AFOGADA_DMG.dry.body > AFOGADA_DMG.wet.body);
  // no seco (margem): turbina não pega; dano de guelra seco
  b.pos.set(26, U, 70); b._set('stalk');
  assert.equal(b.wet, false); assert.equal(b.turbinePull(), false);
  // fase 2 e 3 pelos limiares
  b.hp = b.maxHp * AFOGADA_PHASES.p2 + 1; b.takeHit({ dmg: 10, volume: { part: 'weak' } }); assert.equal(b.phase, 2);
  b.hp = b.maxHp * AFOGADA_PHASES.p3 + 1; b._set('stalk'); b.takeHit({ dmg: 10, volume: { part: 'weak' } }); assert.equal(b.phase, 3);
  // ralo: no fundo do poço ela encalha; depois disso não há mais água
  b.pos.set(33, P.bed, 78); b._set('swim');
  assert.equal(b.drain(), true); assert.equal(b.state, 'beached'); assert.equal(b.wet, false); assert.equal(b.drain(), false);
  // morte real
  b.hp = 1; assert.equal(b.takeHit({ dmg: 50, volume: { part: 'weak' } }), 'dead'); assert.equal(b.state, 'dead'); assert.equal(b.alive, false);
  const b2 = new AfogadaBoss(afogadaGame(), { x: 33, y: P.bed, z: 78, pool: P, bounds: C5L.ARENA_BOUNDS });
  b2.setDeadAt(C5S.AFOGADA_BODY.x, C5S.AFOGADA_BODY.y, C5S.AFOGADA_BODY.z); assert.equal(b2.alive, false); assert.equal(b2.rig.root.visible, true);
  assert.ok(C5S.C5_TURBINE_CD >= 8 && C5S.C5_DRAIN_TURNS >= 1);
  assert.ok(C5S.AGUAS_SPAWNS.find((s) => s.id === 'afo_descarga' && s.dormant && s.z > C5L.DISCHARGE.minZ));
});
test('Cap. 5: migração das flags (fatia antiga, chefe, fim) e mapa do salão', () => {
  const slice = migrateSave({ ...makeChapter5Save(null), checkpoint: 'c5_slice', flags: { c5_sliceDone: true, c5_sluiceOpen: true, c5_power: true } });
  assert.ok(slice.flags.c5_gatesOpen && !slice.flags.c5_afogadaDead);
  const boss = migrateSave({ ...makeChapter5Save(null), checkpoint: 'c5_boss', flags: {} });
  assert.ok(boss.flags.c5_afogadaDead && boss.flags.c5_gatesOpen && boss.flags.c5_sluiceOpen);
  const end = migrateSave({ ...makeChapter5Save(null), checkpoint: 'c5_end', flags: { ch5Done: true } });
  assert.ok(end.flags.c5_chapterDone && end.flags.ch5Done && end.flags.c5_afogadaDead);
  assert.equal(normalizeChapter5Flags({ chapter: 4, flags: { ch5Done: true } }).flags.c5_afogadaDead, undefined);
  try {
    setMapChapter(5);
    assert.equal(roomAt({ x: 26, y: 4.5, z: 78 }).id, 'c5_salao');
    assert.equal(roomAt({ x: 33, y: 3.1, z: 78 }).id, 'c5_poco');
    assert.equal(roomAt({ x: 33, y: 4.5, z: 96 }).id, 'c5_descarga');
  } finally { setMapChapter(1); }
  assert.ok(CHAPTERS.find((c) => c.id === 6 && c.playable));
  assert.ok(CHAPTERS.find((c) => c.id === 7 && c.playable));
});

const C6L = await import('../../src/scenes/acervo/AcervoLevel.js');
const C6S = await import('../../src/scenes/acervo/AcervoScript.js');
const { makeChapter6Save, CH5_KEY_ITEMS } = await import('../../src/core/SaveManager.js');
const { OBJECTIVES_C6, SIDE_OBJECTIVES_C6 } = await import('../../src/data/chapters.js');
test('Cap. 6: migração do Cap. 5 concluído, objetivos, documentos e capítulo jogável', () => {
  const end5 = migrateSave({ ...makeChapter5Save(null), checkpoint: 'c5_end', flags: { c5_chapterDone: true, c5_afogadaDead: true, hasBracelet: true }, inventory: { items: { bandagem: 3, municao_38: 9, fusivel_ceramico: 1, fita_vermelha: 1 }, weapons: ['machado', 'revolver'], wear: {}, loaded: { revolver: 6 } }, documents: ['ficha_remessa'], player: { hp: 20 } });
  const s = makeChapter6Save(end5);
  assert.equal(s.chapter, 6); assert.equal(s.checkpoint, 'c6_dock');
  assert.ok(s.flags.c5_chapterDone && s.flags.ch5Done && s.flags.c5_afogadaDead && s.flags.c6_started && s.flags.hasBracelet);
  for (const k of CH5_KEY_ITEMS) assert.equal(s.inventory.items[k], undefined, k);
  assert.equal(s.inventory.items.bandagem, 3); assert.equal(s.inventory.items.municao_38, 9);
  assert.ok(s.inventory.weapons.includes('revolver') && s.documents.includes('ficha_remessa'));
  assert.ok(s.player.hp >= 80); assert.deepEqual(s.deadEnemies, []); assert.deepEqual(s.doors, {});
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).chapter, 6);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).checkpoint, 'c6_dock');
  assert.equal(makeChapter6Save(null).chapter, 6);
  assert.equal(objectivesFor(6), OBJECTIVES_C6); assert.equal(sideObjectivesFor(6), SIDE_OBJECTIVES_C6);
  assert.deepEqual(OBJECTIVES_C6.map((o) => o.done), ['c6_inAtrium', 'c6_inHall', 'c6_vaultOpen', 'c6_inStorage', 'c6_sliceDone', 'c6_galleryOpen', 'c6_collectorDead', 'c6_chapterDone', 'c6_never']);
  const q = new QuestSystem(null, 6); assert.equal(q.current(), OBJECTIVES_C6[0].text);
  assert.ok(SIDE_OBJECTIVES_C6.length >= 2 && SIDE_OBJECTIVES_C6.length <= 5);
  for (const o of SIDE_OBJECTIVES_C6) assert.ok(o.when && o.done && o.text);
  assert.ok(/Sob a Pedra/.test(OBJECTIVES_C6.at(-1).text) && !/em breve/.test(OBJECTIVES_C6.at(-1).text));
  for (const id of ['guia_visitante', 'diario_conservadora', 'cartao_inventario_31']) assert.equal(DOCUMENTS[id]?.ch, 6, id);
  // o guia dá a regra do cofre; o Cap. 5 aponta para o Cap. 6
  assert.ok(/peça mais antiga/.test(DOCUMENTS.guia_visitante.body));
  assert.ok(!/em breve/.test(OBJECTIVES_C5.at(-1).text));
  assert.ok(CHAPTERS.find((c) => c.id === 6)?.playable === true);
});
test('Cap. 6: vitrines, código do cofre, espécime, mapa e checkpoints', () => {
  const V = C6L.VITRINES;
  assert.equal(new Set(V.map((v) => v.id)).size, V.length);
  // a peça mais antiga do salão é a de vidro fosco, e o nº dela é o código
  const dated = V.filter((v) => v.year && v.kind === 'low');
  const oldest = dated.reduce((a, b) => (b.year < a.year ? b : a));
  assert.equal(oldest.id, C6S.C6_ALARM_VITRINE); assert.ok(oldest.fogged);
  assert.deepEqual(oldest.inv.split('').map(Number), C6L.VAULT_CODE);
  assert.equal(V.filter((v) => v.fogged).length, 1);
  // vitrines dentro das salas, espécimes nas vitrines altas
  const H = C6L.HALL;
  for (const v of V.filter((o) => o.id !== 'v_atrio')) assert.ok(v.x > H.minX && v.x < H.maxX && v.z > H.minZ && v.z < H.maxZ, v.id);
  for (const v of V.filter((o) => o.kind === 'tall')) {
    const sp = C6S.ACERVO_SPAWNS.find((s) => s.id === v.specimen);
    assert.ok(sp && sp.dormant && sp.type === 'especime' && Math.hypot(sp.x - v.x, sp.z - v.z) < 0.1, v.id);
  }
  // espécime: novo arquétipo leve
  const e = ENEMIES.especime;
  assert.ok(e && e.exhibit && e.hp < ENEMIES.acolito.hp && e.chase > ENEMIES.acolito.walk);
  assert.ok(e.attacks.length >= 2 && e.attacks.every((k) => k.windup > 0 && k.dmg > 0));
  for (const s of C6S.ACERVO_SPAWNS) assert.ok(ENEMIES[s.type], s.id);
  assert.ok(C6S.ACERVO_SPAWNS.some((s) => s.type === 'acolito') && C6S.ACERVO_SPAWNS.filter((s) => s.type === 'especime').length >= 3);
  // prop real: hurtVolume e vida; quebra com dano suficiente, a vitrine alta acorda o espécime
  const calls = []; const noop = () => {};
  const S = { game: { audio: { play: noop }, perception: { noise: (p, r, k) => calls.push(['noise', r, k]) }, combat: { emit: noop } },
    _wakeSpecimen: (id) => calls.push(['wake', id]), _breakVitrine: (id) => calls.push(['break', id]) };
  const low = new C6S.Vitrine(S, V.find((v) => v.id === 'v_cranio'));
  assert.ok(low.isProp && low.alive && low.hurtVolumes()[0].type === 'capsule');
  assert.equal(low.takeHit({ dmg: 5 }), 'hit');
  assert.equal(low.takeHit({ dmg: C6L.VITRINE_HP.low }), 'dead');
  assert.ok(calls.find((c) => c[0] === 'break' && c[1] === 'v_cranio') && calls.find((c) => c[0] === 'noise'));
  const tall = new C6S.Vitrine(S, V.find((v) => v.id === 'v_esp1'));
  tall.takeHit({ dmg: 3 }); assert.ok(calls.find((c) => c[0] === 'wake' && c[1] === 'c6_esp1'));
  // mapa
  try {
    setMapChapter(6);
    assert.deepEqual(chapterFloors().map((f) => f.id), ['up']);
    assert.equal(roomAt({ x: 15, y: 0, z: 3 }).id, 'c6_doca');
    assert.equal(roomAt({ x: 15, y: 0, z: 12 }).id, 'c6_atrio');
    assert.equal(roomAt({ x: 15, y: 0, z: 30 }).id, 'c6_salao');
    assert.equal(roomAt({ x: 36, y: 0, z: 33 }).id, 'c6_conservacao');
    assert.equal(roomAt({ x: 36, y: 0, z: 48 }).id, 'c6_deposito');
  } finally { setMapChapter(1); }
  // checkpoints dentro das salas e névoa por zona
  const CP = C6L.ACERVO_CHECKPOINTS, L = Object.create(C6L.AcervoLevel.prototype);
  for (const [id, room] of [['c6_dock', 'c6_doca'], ['c6_atrium', 'c6_atrio'], ['c6_hall', 'c6_salao'], ['c6_conserv', 'c6_conservacao'], ['c6_slice', 'c6_deposito']]) {
    assert.ok(CP[id], id); assert.equal(CP[id].y, 0);
    assert.equal(L.zoneAt({ ...CP[id], y: 1 })?.id, room, id);
  }
  assert.ok(CP.c6_slice.z < C6L.COLLECTOR_DOOR.z && CP.c6_slice.z > C6L.STORAGE.minZ);
  assert.ok(C6L.DIAL.zs.length === 3 && C6L.DIAL.x < C6L.HALL.maxX);
});

const { CollectorBoss, COLLECTOR_HP, COLLECTOR_PHASES, COLLECTOR_DMG, COLLECTOR_CRUSH_DMG, COLLECTOR_RAIL } = await import('../../src/ai/CollectorBoss.js');
const { normalizeChapter6Flags } = await import('../../src/core/SaveManager.js');
function collectorLevel() {
  const busts = {};
  for (const u of C6L.BUSTS) busts[u.id] = { u, mesh: new THREE.Group(), taken: false };
  const L = Object.create(C6L.AcervoLevel.prototype);
  Object.assign(L, { busts, armored: {}, rails: [], railLog: [] });
  for (const c of C6L.ARMORED_CASES) L.armored[c.id] = { c, hits: 0, cracks: { children: [] } };
  L.setRail = (i, w, k) => L.railLog.push([i, w, k]);
  return L;
}
function collectorGame() {
  const g = afogadaGame();
  const G = C6L.GALLERY;
  g.col.addFloor({ minX: G.minX, maxX: G.maxX, minZ: G.minZ, maxZ: G.maxZ, y: 0 });
  g.player.pos.set(37, 0, 57);
  g.player.hurtVolumes = function () { return [{ type: 'capsule', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.3, y1: this.pos.y + 1.5, r: 0.32 }]; };
  const hits = []; g.player.takeHit = (h) => { hits.push(h); return 'hit'; }; g.player.hitsLog = hits;
  g.emitted = []; g.bus = { emit: (n, x) => g.emitted.push([n, x]) };
  return g;
}
test('Cap. 6: O Colecionador — gaiola, choque na vitrine blindada, guincho, bustos, trilho, fases e morte', () => {
  const g = collectorGame(), L = collectorLevel(), C = C6L.COLLECTOR_BODY;
  let woke = 0;
  const b = new CollectorBoss(g, { x: C.x, y: C.y, z: C.z, bounds: C6L.GALLERY_BOUNDS, level: L, rows: C6L.RAIL_ROWS, railX: C6L.RAIL_X, onWake: () => woke++ });
  assert.equal(b.id, 'colecionador'); assert.equal(b.maxHp, COLLECTOR_HP); assert.equal(b.state, 'dormant');
  assert.equal(b.takeHit({ dmg: 50, volume: { part: 'weak' } }), 'immune'); assert.equal(b.crush(), false);
  b.activate(); assert.equal(b.state, 'intro');
  // gaiola fechada: coração quase não sente
  b._set('stalk');
  const h0 = b.hp; b.takeHit({ dmg: 100, volume: { part: 'weak' } });
  assert.ok(Math.abs(h0 - b.hp - 100 * COLLECTOR_DMG.guarded.weak) < 1e-6 && b.lastHit.exposed === false);
  const v0 = b.hurtVolumes(); assert.ok(v0.find((v) => v.part === 'weak').r < 0.3 && v0.find((v) => v.part === 'body'));
  // investida contra a vitrine blindada: atordoa, racha o vidro e abre a gaiola
  const rc = C6L.ARMORED_CASES[0];
  g.col.addBox(rc.x - 0.65, 0, rc.z - 0.65, rc.x + 0.65, 2.3, rc.z + 0.65, { tag: 'obstacle' });
  b.pos.set(rc.x, 0, rc.z + 2.6); b.yaw = Math.PI; g.player.pos.set(rc.x, 0, rc.z - 2.4);
  b._set('charge');
  for (let i = 0; i < 20 && b.state === 'charge'; i++) b.update(0.05);
  assert.equal(b.state, 'stunned'); assert.equal(L.armored[rc.id].hits, 1); assert.ok(b.stunDur >= 4.2);
  assert.ok(b.exposed && b.hurtVolumes().find((v) => v.part === 'weak').r > 0.4);
  const h1 = b.hp; b.takeHit({ dmg: 40, volume: { part: 'weak' } });
  assert.ok(Math.abs(h1 - b.hp - 40 * COLLECTOR_DMG.exposed.weak) < 1e-6);
  assert.ok(COLLECTOR_DMG.exposed.weak > COLLECTOR_DMG.guarded.weak * 4 && COLLECTOR_DMG.exposed.body > COLLECTOR_DMG.guarded.body);
  // guincho: dano real e estado esmagado (gaiola aberta)
  b._set('stalk'); const h2 = b.hp;
  assert.equal(b.crush(), true); assert.equal(b.state, 'crushed'); assert.ok(b.exposed);
  assert.ok(Math.abs(h2 - b.hp - COLLECTOR_CRUSH_DMG) < 1e-6);
  for (let i = 0; i < 60; i++) b.update(0.1);
  assert.notEqual(b.state, 'crushed');
  // fases pelos limiares (com eventos); fase 3 acorda a Galeria pela sineta
  b._set('stalk'); b.hp = b.maxHp * COLLECTOR_PHASES.p2 + 1; b.takeHit({ dmg: 100, volume: { part: 'body' } }); assert.equal(b.phase, 2);
  b._set('stalk'); b.hp = b.maxHp * COLLECTOR_PHASES.p3 + 1; b.takeHit({ dmg: 100, volume: { part: 'body' } }); assert.equal(b.phase, 3);
  assert.ok(g.emitted.find((e) => e[0] === 'CollectorPhase' && e[1] === 2) && g.emitted.find((e) => e[0] === 'CollectorPhase' && e[1] === 3));
  b._set('stalk'); b.pos.set(37, 0, 63); g.player.pos.set(37, 0, 61.4);
  for (let i = 0; i < 20; i++) b.update(0.1);
  assert.equal(woke, 1); assert.ok(b.seen.cue >= 1 && b.seen.sweep >= 1);
  // trilho: a faixa de Elias pisca, o braço varre e acerta quem estiver na faixa (inimigo incluso)
  b.sweeps = []; b._set('stalk'); b.railCd = 99; b.throwCd = 99;
  g.player.hitsLog.length = 0; g.player.pos.set(36.9, 0, C6L.RAIL_ROWS[1]);
  assert.equal(b.startSweep(1), true); assert.equal(b.startSweep(1), false);
  for (let i = 0; i < 30; i++) b._updateSweeps(0.1);
  assert.ok(g.player.hitsLog.find((h) => h.dmg === COLLECTOR_RAIL.dmg && h.blockable === false));
  assert.equal(b.sweeps.length, 0);
  // bustos: vai buscar o mais próximo, arranca do pedestal e arremessa (projétil real)
  b._set('stalk'); b.railCd = 99; b.throwCd = 0; b.wakePending = false;
  b.pos.set(30.6, 0, 57); g.player.pos.set(37, 0, 63);
  let thrown = false;
  for (let i = 0; i < 60 && !thrown; i++) { b.update(0.05); thrown = b.seen.throw > 0; }
  assert.ok(L.busts.b0.taken && thrown && b.seen.fetch >= 1);
  assert.ok(b.projectiles.length >= 0);
  // território: só a Galeria
  b.pos.set(20, 0, 40); b._clamp(); assert.ok(b.pos.x >= C6L.GALLERY_BOUNDS.minX && b.pos.z >= C6L.GALLERY_BOUNDS.minZ);
  // morte real: limpa projéteis e estaciona os carrinhos
  b._set('stalk'); b.hp = 1; assert.equal(b.takeHit({ dmg: 50, volume: { part: 'weak' } }), 'dead');
  assert.equal(b.alive, false); assert.equal(b.projectiles.length, 0); assert.equal(b.sweeps.length, 0);
  assert.ok(g.emitted.find((e) => e[0] === 'BossDefeated'));
  const b2 = new CollectorBoss(collectorGame(), { x: C.x, y: C.y, z: C.z, bounds: C6L.GALLERY_BOUNDS, level: collectorLevel(), rows: C6L.RAIL_ROWS });
  b2.setDeadAt(C.x, C.y, C.z); assert.equal(b2.alive, false); assert.equal(b2.rig.root.visible, true);
});
test('Cap. 6: Galeria, reserva, guinchos, checkpoints c6_boss/c6_end e migração de saves da fatia', () => {
  const G = C6L.GALLERY, B = C6L.GALLERY_BOUNDS, R = C6L.RESERVE;
  assert.ok(G.minZ >= C6L.STORAGE.maxZ && B.minX > G.minX && B.maxX < G.maxX && B.maxZ < G.maxZ);
  for (const c of C6L.CRANES) {
    assert.ok(c.x - C6L.CRANE_RADIUS > G.minX && c.x + C6L.CRANE_RADIUS < G.maxX);
    // a alavanca fica fora do círculo de queda
    assert.ok(Math.hypot(c.lever.x - c.x, c.lever.z - c.z) > C6L.CRANE_RADIUS + 1);
  }
  // o atordoamento numa vitrine blindada próxima de um guincho deixa o chefe dentro do círculo (combo possível)
  assert.ok(C6L.ARMORED_CASES.some((a) => C6L.CRANES.some((c) => Math.hypot(a.x - c.x, a.z + 1.3 - c.z) < C6L.CRANE_RADIUS)));
  assert.ok(C6L.BUSTS.length >= 6 && C6L.RAIL_ROWS.every((z) => z > B.minZ && z < B.maxZ));
  for (const s of C6S.ACERVO_SPAWNS.filter((o) => o.gallery)) assert.ok(s.dormant && s.z > G.minZ && s.z < G.maxZ && C6L.GALLERY_CASES.find((c) => c.id === s.gallery));
  assert.ok(R.minZ === G.maxZ && R.endZ > R.minZ && R.endZ < R.maxZ && C6L.EXIT_DOOR.z === G.maxZ);
  const CP = C6L.ACERVO_CHECKPOINTS, L = Object.create(C6L.AcervoLevel.prototype);
  assert.equal(L.zoneAt({ ...CP.c6_boss, y: 1 })?.id, 'c6_galeria'); assert.equal(L.zoneAt({ ...CP.c6_end, y: 1 })?.id, 'c6_reserva');
  assert.ok(CP.c6_end.z < R.endZ);
  try {
    setMapChapter(6);
    assert.equal(roomAt({ x: 37, y: 0, z: 64 }).id, 'c6_galeria');
    assert.equal(roomAt({ x: 37, y: 0, z: 79 }).id, 'c6_reserva');
  } finally { setMapChapter(1); }
  for (const id of ['catalogo_colecionador', 'relicario_colecionador']) assert.equal(DOCUMENTS[id]?.ch, 6, id);
  assert.ok(/Sob a Pedra/.test(DOCUMENTS.catalogo_colecionador.body) && /Peça 32/.test(DOCUMENTS.relicario_colecionador.body));
  // saves: a fatia antiga continua (Galeria fechada até a sineta); boss/fim implicam o chefe morto
  const slice = migrateSave({ ...makeChapter6Save(null), checkpoint: 'c6_slice', flags: { c6_sliceDone: true } });
  assert.ok(slice.flags.c6_sliceDone && slice.flags.c6_vaultOpen && !slice.flags.c6_galleryOpen && !slice.flags.c6_collectorDead);
  const boss = migrateSave({ ...makeChapter6Save(null), checkpoint: 'c6_boss', flags: {} });
  assert.ok(boss.flags.c6_collectorDead && boss.flags.c6_galleryOpen && boss.flags.c6_sliceDone);
  const end = migrateSave({ ...makeChapter6Save(null), checkpoint: 'c6_end', flags: { ch6Done: true } });
  assert.ok(end.flags.c6_chapterDone && end.flags.ch6Done && end.flags.c6_collectorDead);
  assert.equal(normalizeChapter6Flags({ chapter: 5, flags: { ch6Done: true } }).flags.c6_collectorDead, undefined);
  assert.ok(C6S.C6_BELL_DELAY > 0 && C6S.C6_BELL_DELAY < 5);
});

// ---------------- Capítulo 7 — Sob a Pedra (primeira fatia) ----------------
const { makeChapter7Save, normalizeChapter7Flags } = await import('../../src/core/SaveManager.js');
const { OBJECTIVES_C7, SIDE_OBJECTIVES_C7 } = await import('../../src/data/chapters.js');
const { PerceptionSystem } = await import('../../src/ai/PerceptionSystem.js');
const C7L = await import('../../src/scenes/pedra/PedraLevel.js');
const C7S = await import('../../src/scenes/pedra/PedraScript.js');
test('Cap. 7: migração do fim do Cap. 6, objetivos, documentos e capítulo jogável', () => {
  const end6 = migrateSave({ ...makeChapter6Save(null), checkpoint: 'c6_end', flags: { c6_chapterDone: true, c6_collectorDead: true, hasAmulet: true }, inventory: { items: { bandagem: 2, municao_38: 7 }, weapons: ['machado', 'revolver'], wear: {}, loaded: { revolver: 6 } }, documents: ['catalogo_colecionador'], player: { hp: 15 } });
  const s = makeChapter7Save(end6);
  assert.equal(s.chapter, 7); assert.equal(s.checkpoint, 'c7_ladder');
  assert.ok(s.flags.c6_chapterDone && s.flags.ch6Done && s.flags.c6_collectorDead && s.flags.c7_started && s.flags.hasAmulet && s.flags.ch5Done);
  assert.equal(s.inventory.items.bandagem, 2); assert.equal(s.inventory.items.municao_38, 7);
  assert.ok(s.inventory.weapons.includes('revolver') && s.documents.includes('catalogo_colecionador'));
  assert.ok(s.player.hp >= 80); assert.deepEqual(s.deadEnemies, []); assert.deepEqual(s.doors, {});
  const again = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(again.chapter, 7); assert.equal(again.checkpoint, 'c7_ladder');
  assert.equal(makeChapter7Save(null).chapter, 7);
  assert.ok(CHAPTERS.find((c) => c.id === 7)?.playable === true);
  assert.equal(objectivesFor(7), OBJECTIVES_C7); assert.equal(sideObjectivesFor(7), SIDE_OBJECTIVES_C7);
  assert.deepEqual(OBJECTIVES_C7.map((o) => o.done), ['c7_inOssuary', 'c7_sawGate', 'c7_hasKey', 'c7_ossOpen', 'c7_onPlatform', 'c7_sliceDone', 'c7_never']);
  const q = new QuestSystem(null, 7); assert.equal(q.current(), OBJECTIVES_C7[0].text);
  assert.ok(SIDE_OBJECTIVES_C7.length >= 2 && SIDE_OBJECTIVES_C7.length <= 5);
  for (const o of SIDE_OBJECTIVES_C7) assert.ok(o.when && o.done && o.text);
  for (const id of ['registro_coveiro', 'recado_ines_pedra', 'quadro_linha_velha']) assert.ok(DOCUMENTS[id]?.ch === 7 && DOCUMENTS[id].title && DOCUMENTS[id].body, id);
  assert.ok(ITEMS.pe_de_cabra && ITEMS.chave_coveiro);
  // saves do Cap. 7: plataforma implica a cripta aberta e a grade aberta; fim da fatia implica a plataforma
  const plat = migrateSave({ ...s, checkpoint: 'c7_platform', flags: {} });
  assert.ok(plat.flags.c7_onPlatform && plat.flags.c7_ossOpen && plat.flags.c7_hasKey && plat.flags.c7_cryptOpen && plat.flags.c6_chapterDone);
  const sl = migrateSave({ ...s, checkpoint: 'c7_slice', flags: {} });
  assert.ok(sl.flags.c7_sliceDone && sl.flags.c7_onPlatform && sl.flags.c7_ossOpen);
  const oss = migrateSave({ ...s, checkpoint: 'c7_ossuary', flags: {} });
  assert.ok(oss.flags.c7_inOssuary && !oss.flags.c7_ossOpen && !oss.flags.c7_hasKey);
  assert.equal(normalizeChapter7Flags({ chapter: 6, flags: {} }).flags.c6_chapterDone, undefined);
});
test('Cap. 7: emparedado cego que acorda com barulho; a pedra ecoa (acústica por área)', () => {
  const e = ENEMIES.emparedado;
  assert.ok(e && e.blind && e.wakeOnNoise && e.walled && e.hearing > 1 && e.sight < 2.5);
  assert.ok(e.dormantHearing > 0 && e.dormantHearing < 1);
  assert.ok(e.attacks.length >= 2 && e.attacks.every((k) => k.windup > 0 && k.range > 0));
  for (const s of C7S.PEDRA_SPAWNS) assert.ok(ENEMIES[s.type], s.id);
  const niched = C7S.PEDRA_SPAWNS.filter((s) => s.niche);
  assert.ok(niched.length >= 4 && niched.every((s) => s.dormant && s.type === 'emparedado'));
  for (const s of niched) { const n = C7L.NICHES.find((o) => o.id === s.niche); assert.ok(n && n.enemy === s.id && Math.hypot(n.x - s.x, n.z - s.z) < 0.1, s.id); }
  assert.ok(C7L.NICHES.some((n) => !n.enemy));
  // acústica: ossuário > cripta > galerias > fora
  const O = C7L.OSSUARY, a = (x, z) => C7L.acousticAt({ x, y: 0, z });
  assert.ok(a(18, 26) > a(8, 34) && a(8, 34) > a(18, 10) && a(18, 10) > 1 && a(-50, -50) === 1);
  const col = new CollisionWorld(), per = new PerceptionSystem(col);
  per.acoustics = C7L.acousticAt;
  const emp = { pos: new THREE.Vector3(O.minX - 0.5, 0, 26), def: e };
  // andando (2,5) a 3 m: dormente ouve no ossuário (eco); a mesma distância fora da pedra, não
  per.noise({ x: emp.pos.x + 3, y: 0, z: 26 }, 2.5, 'step');
  assert.ok(per.hear(emp, e.dormantHearing)); per.endStep();
  per.acoustics = null; per.noise({ x: emp.pos.x + 3, y: 0, z: 26 }, 2.5, 'step');
  assert.equal(per.hear(emp, e.dormantHearing), null); per.endStep();
  per.acoustics = C7L.acousticAt;
  // andando pelo meio do ossuário (6 m), o nicho não acorda; correndo, acorda; ossos estalando (andando) acordam a ~5 m
  per.noise({ x: emp.pos.x + 6, y: 0, z: 26 }, 2.5, 'step'); assert.equal(per.hear(emp, e.dormantHearing), null); per.endStep();
  per.noise({ x: emp.pos.x + 6, y: 0, z: 26 }, 7.5, 'step'); assert.ok(per.hear(emp, e.dormantHearing)); per.endStep();
  per.noise({ x: emp.pos.x + 5, y: 0, z: 26 }, C7S.C7_BONE_NOISE.walk, 'bones'); assert.ok(per.hear(emp, e.dormantHearing)); per.endStep();
  assert.deepEqual(per.events, []); assert.equal(per.last.length, 1);
  assert.ok(C7S.C7_BONE_NOISE.run > C7S.C7_BONE_NOISE.walk && C7S.C7_BONE_STEP > 0.3 && C7S.C7_PRY_NOISE >= C7S.C7_GATE_NOISE);
  // ossos: manchas dentro do ossuário e fora do eixo central da entrada (dá para contornar)
  for (const b of C7L.BONE_PATCHES) assert.ok(b.x0 >= O.minX && b.x1 <= O.maxX && b.z0 > O.minZ && b.z1 < O.maxZ, b.id);
  assert.ok(C7L.boneAt(18, 23) && !C7L.boneAt(18, 20) && !C7L.boneAt(18, 27));
});
test('Cap. 7: mapa, checkpoints, zonas e geometria da fatia (sem chefe)', () => {
  const CP = C7L.PEDRA_CHECKPOINTS, L = Object.create(C7L.PedraLevel.prototype);
  assert.deepEqual(Object.keys(CP).sort(), ['c7_ladder', 'c7_ossuary', 'c7_platform', 'c7_slice']);
  assert.equal(L.zoneAt({ ...CP.c7_ladder, y: 1 })?.id, 'c7_poco');
  assert.equal(L.zoneAt({ ...CP.c7_ossuary, y: 1 })?.id, 'c7_ossuario');
  assert.equal(L.zoneAt({ ...CP.c7_platform, y: 1 })?.id, 'c7_estacao');
  assert.equal(L.zoneAt({ ...CP.c7_slice, y: 0 })?.id, 'c7_estacao');
  assert.ok(CP.c7_slice.y === C7L.TRACK_Y && CP.c7_slice.x < C7L.TRACKS.maxX && CP.c7_slice.x < 48.9);
  // o checkpoint do ossuário fica fora das manchas de ossos e longe dos nichos
  assert.ok(!C7L.boneAt(CP.c7_ossuary.x, CP.c7_ossuary.z));
  for (const n of C7L.NICHES) assert.ok(Math.hypot(n.x - CP.c7_ossuary.x, n.z - CP.c7_ossuary.z) > 5, n.id);
  // cripta encosta no ossuário (porta oeste) e o jazigo fica dentro dela
  const C = C7L.CRYPT, J = C7L.JAZIGO;
  assert.ok(C.maxX === C7L.OSSUARY.minX && J.minX > C.minX && J.maxX < C.maxX && J.maxZ < C.maxZ && J.use.z < J.minZ);
  assert.ok(C7L.TUNNEL.minZ === C7L.OSSUARY.maxZ && C7L.TUNNEL.maxZ === C7L.PLATFORM.minZ && C7L.TRACKS.minZ === C7L.PLATFORM.maxZ);
  try {
    setMapChapter(7);
    assert.deepEqual(chapterFloors().map((f) => f.id), ['up']);
    assert.equal(roomAt({ x: 18, y: 0, z: 3 }).id, 'c7_poco');
    assert.equal(roomAt({ x: 18, y: 0, z: 26 }).id, 'c7_ossuario');
    assert.equal(roomAt({ x: 8, y: 0, z: 34 }).id, 'c7_cripta');
    assert.equal(roomAt({ x: 24, y: 0, z: 47 }).id, 'c7_plataforma');
    assert.equal(roomAt({ x: 38, y: 0, z: 20 }).id, 'c7_servico_n');
  } finally { setMapChapter(1); }
  // a fatia não tem chefe: nenhum spawn de chefe e nenhuma flag de chefe nos objetivos
  assert.ok(C7S.PEDRA_SPAWNS.every((s) => !ENEMIES[s.type].boss));
  assert.ok(!OBJECTIVES_C7.some((o) => /Dead|boss|chefe/i.test(o.done)));
});

console.log(`\n${ok}/${ok + fail} testes unitários OK`);
process.exit(fail ? 1 : 0);
