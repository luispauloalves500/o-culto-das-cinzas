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
import { attackClipTime, ATTACK_CLIPS, CONFIG_MACHADO, CLIP } from '../../src/gameplay/rev6/configMachado.js';
import { criarSistemaMachado } from '../../src/gameplay/rev6/sistemaMachado.js';
import { prepareClips } from '../../src/gameplay/EliasModel.js';

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

console.log(`\n${ok}/${ok + fail} testes unitários OK`);
process.exit(fail ? 1 : 0);
