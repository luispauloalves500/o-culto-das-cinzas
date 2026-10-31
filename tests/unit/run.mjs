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

console.log(`\n${ok}/${ok + fail} testes unitários OK`);
process.exit(fail ? 1 : 0);
