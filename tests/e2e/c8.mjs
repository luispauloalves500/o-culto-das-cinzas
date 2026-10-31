// Bloco do smoke para o Capítulo 8 — A Última Chama (capítulo completo: Usina, torre, chefes e os três finais). Usado pelo smoke completo (depois do fim do Cap. 7)
// e pelo smoke-c8.mjs (só este capítulo, a partir de um save c7_end). Tudo pelos sistemas reais via window.__ocdc.
import { runC8Tower } from './c8tower.mjs';

export async function runC8(page, check, inject, SHOTS, c7endRaw) {
  await page.evaluate((raw) => localStorage.setItem('ocdc_save', raw), c7endRaw);
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const ext = () => page.evaluate(() => {
    const g = __ocdc; window.__toasts = window.__toasts || [];
    if (!g.hud.__wrapped) { const t = g.hud.toast.bind(g.hud); g.hud.toast = (m, d) => { window.__toasts.push(String(m)); return t(m, d); }; g.hud.__wrapped = true; }
    window.T.lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    window.T.E = (id) => g.enemies.find((e) => e.id === id);
    window.T.S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    window.T.P = () => g.player.pos.toArray().map((v) => +v.toFixed(2));
    window.T.heal = () => { g.player.hp = g.player.maxHp; g.player.st = g.player.maxSt; };
    window.T.last = () => window.__toasts.at(-1) || '';
  });
  await ext();
  await page.evaluate(() => { window.__toasts = []; document.getElementById('btnContinue').click(); });
  await ext();
  await page.evaluate(() => T.run(0.3));

  // ---------- migração c7_end → Cap. 8 e início no pátio ----------
  const a = await page.evaluate(() => {
    const g = __ocdc, s = T.S(), out = {};
    Object.assign(out, { st: g.state, ch: g.chapter, sch: s.chapter, cp: s.checkpoint, pos: T.P(), obj: g.quest.current(), n: g.enemies.length,
      types: g.enemies.map((e) => e.type).sort().join(','), fog: !!g.scene.fog, ac: typeof g.perception.acoustics === 'function', zone: g.level.zone,
      axe: g.inventory.weapons.includes('machado'), rev: g.inventory.weapons.includes('revolver'), oldKey: g.inventory.has('chave_escada_usina') || g.inventory.has('pe_de_cabra'),
      started: g.quest.has('c8_started') && g.quest.has('ch7Done'), lights: T.lights(), heat: !!T.E('c8_fog1').def.heatproof && !T.E('c8_aco1').def.heatproof,
      toast: window.__toasts.join(' | '), hasLadderState: typeof g.player.startClimb === 'function' });
    // inimigos do pátio fora do caminho (o pátio é testado pelo smoke de combate dos outros capítulos)
    T.E('c8_carv1').setDeadInstant();
    T.tp(3.2, 0, 2.6, Math.PI); out.stair = T.interactAt('c8_serviceStair'); out.stairT = T.last(); out.stillCh = g.chapter;
    T.tp(3.6, 0, 10, Math.PI / 2); out.hutDoor = T.interactAt('door_c8_hut'); T.run(0.8); out.hutOpen = g.level.doors.c8_hut.open;
    T.tp(1.5, 0, 9.4, 0); out.book = T.interactAt('c8_hut_book'); out.bookCp = T.S().checkpoint;
    T.tp(2.6, 0, 9.2, 0); out.bol = T.interactAt('doc_boletim_usina'); T.run(0.1); out.readBol = g.quest.has('c8_readBoletim');
    const b0 = g.inventory.count('bandagem'); T.tp(1.5, 0, 9.9, Math.PI); out.band = T.interactAt('pick_c8_band_hut'); out.bandN = g.inventory.count('bandagem') - b0;
    // portão de carga visto do pátio: trancado por dentro
    T.tp(13, 0, 23, 0); out.gate = T.interactAt('door_c8_cargo'); out.gateT = T.last(); out.gateLocked = g.level.doors.c8_cargo.locked && !g.level.doors.c8_cargo.open;
    T.tp(13, 0, 23, 0); T.hold('KeyW', 0.8); out.gateBlock = +g.player.pos.z.toFixed(2);
    out.obj2 = g.quest.current();
    return out;
  });
  await page.screenshot({ path: SHOTS + '47-cap8-patio.png' });
  check('Cap. 8: "Seguir" do Cap. 7 → A Última Chama no pátio de carvão (capítulo 8, save c8_yard, chaves do Cap. 7 removidas, armas mantidas, névoa e acústica)', a.st === 'playing' && a.ch === 8 && a.sch === 8 && a.cp === 'c8_yard' && Math.abs(a.pos[0] - 3.2) < 0.6 && a.axe && a.rev && !a.oldKey && a.started && a.fog && a.ac && a.zone === 'c8_patio' && /torre de carvão/.test(a.obj) && /Última Chama/.test(a.toast), JSON.stringify(a));
  check('Cap. 8: 7 inimigos (acólitos — um guarda a casa de máquinas da torre —, carvoeiro e foguistas resistentes ao calor) e ≤ 16 luzes', a.n === 7 && a.types === 'acolito,acolito,acolito,acolito,carvoeiro,foguista,foguista' && a.heat && a.lights <= 16, JSON.stringify({ n: a.n, t: a.types, h: a.heat, l: a.lights }));
  check('Cap. 8: guarita — escada de volta recusada, livro (save c8_yard), boletim e bandagem', a.stair === 'ok' && /Inês/.test(a.stairT) && a.stillCh === 8 && a.hutDoor === 'ok' && a.hutOpen && a.book === 'ok' && a.bookCp === 'c8_yard' && a.bol === 'ok' && a.readBol && a.band === 'ok' && a.bandN === 1, JSON.stringify(a));
  check('Cap. 8: portão de carga da Casa das Caldeiras trancado por dentro e sólido', a.gate === 'ok' && a.gateLocked && a.gateBlock < 24 && /torre de carvão|esteira|dentro/.test(a.gateT + a.obj2), JSON.stringify({ g: a.gate, t: a.gateT, l: a.gateLocked, b: a.gateBlock }));

  // ---------- escalada da torre de carvão ----------
  const b = await page.evaluate(() => {
    const g = __ocdc, pl = g.player, out = {};
    T.E('c8_aco1').setDeadInstant(); T.heal();
    T.tp(22, 0, 10.3, 0); out.grab = T.interactAt('c8_ladder'); out.st0 = pl.state; out.onX = [+pl.pos.x.toFixed(2), +pl.pos.z.toFixed(2)];
    // subir devagar: degraus rangem baixo
    window.__ev = []; const orig = g.perception.noise.bind(g.perception); g.perception.noise = (p, r, k) => { window.__ev.push({ k, r }); return orig(p, r, k); };
    T.hold('KeyW', 0.8); out.y1 = +pl.pos.y.toFixed(2); out.slow = Math.max(0, ...window.__ev.filter((e) => e.k === 'ladder').map((e) => e.r));
    // apressado: mais rápido, mais alto, gasta fôlego
    window.__ev = []; const st0 = pl.st; g.input.down.add('ShiftLeft'); T.hold('KeyW', 0.5); g.input.down.delete('ShiftLeft');
    out.fast = Math.max(0, ...window.__ev.filter((e) => e.k === 'ladder').map((e) => e.r)); out.stUsed = +(st0 - pl.st).toFixed(1); out.y2 = +pl.pos.y.toFixed(2);
    g.perception.noise = orig;
    // golpe na escada: derruba
    const hp0 = pl.hp; out.hit = pl.takeHit({ dmg: 10, from: { x: 22, y: 0, z: 9 } }); out.stHit = pl.state; T.run(1.6);
    out.fell = +pl.pos.y.toFixed(2); out.stAfter = pl.state; out.hpLost = +(hp0 - pl.hp).toFixed(1); out.climbedEarly = g.quest.has('c8_climbed');
    // soltar com Espaço (esquiva) também cai
    T.heal(); T.tp(22, 0, 10.3, 0); T.interactAt('c8_ladder'); T.hold('KeyW', 0.6); T.press('Space'); T.run(1.2); out.drop = pl.state; out.dropY = +pl.pos.y.toFixed(2);
    // subida completa
    T.heal(); T.tp(22, 0, 10.3, 0); out.grab2 = T.interactAt('c8_ladder'); T.hold('KeyW', 3.0);
    out.top = T.P(); out.stTop = pl.state; out.climbed = g.quest.has('c8_climbed'); out.obj = g.quest.current(); out.zone = g.level.zone;
    // descer pela escada e subir de novo (o topo também agarra)
    T.tp(22, 4.4, 13.1, Math.PI); out.down = T.interactAt('c8_ladder_top'); out.stDown = pl.state; T.hold('KeyS', 3.2); T.run(0.2); out.bottom = T.P();
    T.tp(22, 0, 10.3, 0); T.interactAt('c8_ladder'); T.hold('KeyW', 3.2); T.run(0.2); out.top2 = T.P();
    return out;
  });
  await page.screenshot({ path: SHOTS + '48-cap8-torre-carvao.png' });
  check('Cap. 8: escada de mão real — agarra, sobe com W (sem gravidade), apressar com Shift sobe mais rápido, range mais alto e gasta fôlego', b.grab === 'ok' && b.st0 === 'climb' && b.onX[0] === 22 && b.y1 > 0.8 && b.slow >= 3 && b.fast > b.slow && b.stUsed > 3 && b.y2 - b.y1 > 0.9, JSON.stringify(b));
  check('Cap. 8: golpe recebido na escada derruba Elias (cai ao chão, estado hit); Espaço solta e cai', b.hit === 'hit' && b.stHit === 'hit' && b.fell < 0.2 && b.hpLost >= 10 && !b.climbedEarly && b.drop !== 'climb' && b.dropY < 0.2, JSON.stringify(b));
  check('Cap. 8: topo da torre de carvão (y 4,4 — c8_climbed, objetivo do volante); a escada também desce e sobe de novo', b.grab2 === 'ok' && Math.abs(b.top[1] - 4.4) < 0.15 && b.top[2] > 12.4 && b.stTop === 'free' && b.climbed && /volante/.test(b.obj) && b.down === 'ok' && b.stDown === 'climb' && b.bottom[1] < 0.1 && b.bottom[2] < 12.2 && Math.abs(b.top2[1] - 4.4) < 0.15, JSON.stringify(b));

  // ---------- esteira → galeria da Casa das Caldeiras ----------
  const c = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    T.E('c8_aco2').setDeadInstant(); T.heal();
    T.tp(22, 4.4, 14, 0); T.hold('KeyW', 2.2); out.p0 = T.P(); out.belt = out.p0[1] > 4.2;
    T.tp(22, 4.4, 23, 0); T.hold('KeyW', 1.0); out.inBoiler = q.has('c8_inBoiler'); out.cp = T.S().checkpoint; out.zone = L.zone; out.p1 = T.P();
    out.acLoud = +g.perception.acoustics({ x: 10, y: 0, z: 37 }).toFixed(2); out.press = L.pressurized();
    out.lights = T.lights();
    // a escada da galeria desce ao chão (x 26..29, z 44 → 50)
    T.tp(27.5, 4.4, 43.2, 0); T.hold('KeyW', 3.6); out.p2 = T.P();
    // placa de operação sob a galeria (parede leste)
    T.tp(28.6, 0, 30, Math.PI / 2); out.plaque = T.interactAt('doc_placa_caldeiras'); out.plaqueDoc = g.inventory.documents.includes('placa_caldeiras');
    // válvula sem volante: só o eixo
    T.tp(17.9, 0, 29.9, -Math.PI / 2); out.v0 = T.interactAt('c8_valve_I'); out.v0T = T.last(); out.vented0 = q.has('c8_vent_I') || !!g.script.vent;
    // válvula III de baixo: haste partida
    T.tp(17.8, 0, 45.9, -Math.PI / 2); out.br = T.interactAt('c8_valveBroken_III'); out.brT = T.last(); out.sawBroken = q.has('c8_sawBroken');
    // porta-pistão: travada pela pressão
    T.tp(13, 0, 50.6, 0); out.sd = T.interactAt('door_c8_steamDoor'); out.sdT = T.last(); out.sdLocked = L.doors.c8_steamDoor.locked;
    T.tp(13, 0, 50.6, 0); T.hold('KeyW', 0.8); out.sdBlock = +g.player.pos.z.toFixed(2);
    // portão de carga por dentro: ergue a tranca (atalho)
    T.tp(13, 0, 25.2, Math.PI); out.cg = T.interactAt('door_c8_cargo'); T.run(1.0); out.cgOpen = L.doors.c8_cargo.open && !L.doors.c8_cargo.locked && q.has('c8_gateUnbarred') && !L.gateBar?.visible;
    T.tp(13, 0, 25.2, Math.PI); T.hold('KeyW', 1.0); out.cgThrough = +g.player.pos.z.toFixed(2);
    out.obj = q.current();
    return out;
  });
  await page.screenshot({ path: SHOTS + '49-cap8-caldeiras.png' });
  check('Cap. 8: esteira coberta leva à galeria da Casa das Caldeiras (save c8_boiler, ronco das caldeiras abafa os passos)', c.belt && c.inBoiler && c.cp === 'c8_boiler' && c.zone === 'c8_caldeiras' && c.acLoud < 1 && c.press === 3 && c.lights <= 16, JSON.stringify(c));
  check('Cap. 8: escada da galeria desce ao chão; placa de operação; válvula sem volante não alivia; válvula III partida por baixo', c.p2[1] < 0.2 && c.p2[2] > 49 && c.plaque === 'ok' && c.plaqueDoc && c.v0 === 'ok' && /sem volante/.test(c.v0T) && !c.vented0 && c.br === 'ok' && /partida/.test(c.brT) && c.sawBroken, JSON.stringify(c));
  check('Cap. 8: porta-pistão da turbina travada pela pressão (3/3, sólida); portão de carga destrancado por dentro vira atalho ao pátio', c.sd === 'ok' && /3\/3/.test(c.sdT) && c.sdLocked && c.sdBlock < 52 && c.cg === 'ok' && c.cgOpen && c.cgThrough < 23.6 && /volante/.test(c.obj), JSON.stringify(c));

  // ---------- corredor de tubos (jatos de vapor) e oficina ----------
  const d = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, pl = g.player, out = {};
    // o foguista c8_fog1 patrulha perto da porta dos tubos; a fase da patrulha varia com o tempo real gasto antes (cinemáticas/gráficos),
    // então ele fica parado durante este bloco para o teste medir só os jatos (ele volta a agir no bloco das caldeiras)
    const fogD = T.E('c8_fog1'), fogWas = fogD.dormant; fogD.dormant = true;
    T.heal();
    T.tp(1.2, 0, 33.2, -Math.PI / 2); out.door = T.interactAt('door_c8_pipes'); T.run(1.0); out.doorOpen = L.doors.c8_pipes.open;
    // parado sob o jato 0 até ele abrir: queima
    T.tp(-3.5, 0, 33.2, -Math.PI / 2); let t = 0; while (!L.leakActive(0) && t < 4) { T.run(0.05); t += 0.05; }
    const hp0 = pl.hp; T.run(0.9); out.leakDmg = +(hp0 - pl.hp).toFixed(1); out.sawLeaks = q.has('c8_sawLeaks'); out.burned = q.has('c8_burned');
    // fora do jato (entre os tubos) nada acontece
    T.heal(); T.tp(-5.25, 0, 33.2, -Math.PI / 2); const hp1 = pl.hp; T.run(3.3); out.safeDmg = +(hp1 - pl.hp).toFixed(1);
    // ciclo real: o jato liga e desliga com período de 3,2 s
    let on = 0, off = 0; for (let i = 0; i < 64; i++) { T.run(0.05); L.leakActive(1) ? on++ : off++; } out.cycle = [on, off];
    // registro sem volante
    T.heal(); T.tp(-13.2, 0, 33.4, Math.PI); out.feed0 = T.interactAt('c8_feed'); out.feed0T = T.last(); out.leaksOff0 = q.has('c8_leaksOff');
    // oficina
    T.tp(-14.6, 0, 33.2, -Math.PI / 2); T.hold('KeyW', 0.8); out.inOf = q.has('c8_inOficina'); out.zone = L.zone;
    T.tp(-20.1, 0, 35.3, 0); out.wheel = T.interactAt('pick_c8_wheel'); out.hasWheel = g.inventory.has('volante_valvula') && q.has('c8_hasWheel');
    T.tp(-19.0, 0, 35.3, 0); out.hel = T.interactAt('doc_bilhete_helena'); T.run(0.1); out.readHel = q.has('c8_readHelena');
    const am0 = g.inventory.count('municao_38'); T.tp(-21.0, 0, 35.2, 0); out.ammo = T.interactAt('pick_c8_ammo_oficina'); out.ammoN = g.inventory.count('municao_38') - am0;
    T.tp(-15.6, 0, 31.1, Math.PI); out.band = T.interactAt('pick_c8_band_oficina');
    T.tp(-16.6, 0, 31.1, Math.PI); out.book = T.interactAt('c8_oficina_book'); out.cp = T.S().checkpoint;
    out.obj = q.current();
    // fechar o registro com o volante: os jatos param de vez
    T.heal(); T.tp(-13.2, 0, 33.4, Math.PI); out.feed = T.interactAt('c8_feed'); out.leaksOff = q.has('c8_leaksOff') && L.leaksOff;
    T.tp(-3.5, 0, 33.2, Math.PI / 2); const hp2 = pl.hp; T.run(3.4); out.afterDmg = +(hp2 - pl.hp).toFixed(1);
    out.anyLeak = [0, 1, 2].some((i) => L.leakActive(i));
    out.lights = T.lights(); fogD.dormant = fogWas;
    return out;
  });
  await page.screenshot({ path: SHOTS + '50-cap8-oficina.png' });
  check('Cap. 8: corredor de tubos — jatos de vapor periódicos reais (ciclo 3,2 s) queimam quem está embaixo; entre os jatos é seguro', d.door === 'ok' && d.doorOpen && d.leakDmg >= 6 && d.sawLeaks && d.burned && d.safeDmg === 0 && d.cycle[0] > 15 && d.cycle[1] > 25, JSON.stringify(d));
  check('Cap. 8: oficina — volante de válvula (Helena), bilhete de Helena, munição, bandagem e livro (save c8_oficina)', d.inOf && d.zone === 'c8_oficina' && d.wheel === 'ok' && d.hasWheel && d.hel === 'ok' && d.readHel && d.ammo === 'ok' && d.ammoN === 6 && d.band === 'ok' && d.book === 'ok' && d.cp === 'c8_oficina' && /alivie|caldeiras/i.test(d.obj), JSON.stringify(d));
  check('Cap. 8: registro de alimentação — sem volante só o eixo; com o volante fecha os jatos de vez (sem dano)', d.feed0 === 'ok' && /volante/.test(d.feed0T) && !d.leaksOff0 && d.feed === 'ok' && d.leaksOff && d.afterDmg === 0 && !d.anyLeak && d.lights <= 16, JSON.stringify(d));

  // ---------- válvulas de alívio: girar, cancelar, vapor ----------
  const e = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, pl = g.player, S = g.script, out = {};
    T.heal();
    // soltar o volante no meio (afastar-se) cancela
    T.tp(17.9, 0, 29.9, -Math.PI / 2); out.v1a = T.interactAt('c8_valve_I'); out.venting = !!S.vent; T.run(0.8);
    T.tp(19.9, 0, 29.9, -Math.PI / 2); T.run(0.1); out.cancel = !S.vent && !q.has('c8_vent_I') && (q.flags.c8_ventCancelled || 0) >= 1 && /soltou/.test(T.last());
    // levar um golpe também solta
    T.tp(17.9, 0, 29.9, -Math.PI / 2); T.interactAt('c8_valve_I'); T.run(0.5); pl.takeHit({ dmg: 5, from: { x: 19, y: 0, z: 29.9 } }); T.run(0.1);
    out.cancelHit = !S.vent && !q.has('c8_vent_I') && /golpe/.test(T.last()); T.run(1.0);
    // alívio completo da caldeira I — com um acólito (não resistente) e o foguista (resistente) sob o bocal
    T.heal(); const aco = T.E('c8_aco3'), fog = T.E('c8_fog1');
    window.__ev = []; const orig = g.perception.noise.bind(g.perception); g.perception.noise = (p, r, k) => { window.__ev.push({ k, r, y: p.y }); return orig(p, r, k); };
    T.tp(17.9, 0, 29.9, -Math.PI / 2); out.v1 = T.interactAt('c8_valve_I'); T.run(2.4); g.perception.noise = orig;
    out.vented1 = q.has('c8_vent_I') && L.boilers.I.vented; out.press1 = L.pressurized();
    const st = window.__ev.filter((x) => x.k === 'steam'); out.steamNoise = st.map((x) => x.r); out.steamFloors = [...new Set(st.map((x) => x.y))];
    out.v1T = T.last();
    T.tp(-14.6, 0, 33.2, 0); aco.pos.set(10.3, 0, 33.2); aco.home = { x: 10.3, y: 0, z: 33.2, yaw: 0 }; aco.patrol = null; fog.pos.set(9.6, 0, 32.6); fog.home = { x: 9.6, y: 0, z: 32.6, yaw: 0 }; fog.patrol = null;
    const ah = aco.hp, fh = fog.hp; T.run(0.3); out.delayDmg = ah - aco.hp; T.run(4.5); out.acoPos = aco.pos.toArray().map((v) => +v.toFixed(1)); out.acoSt = aco.state;
    out.acoDmg = ah - aco.hp; out.acoDead = !aco.alive; out.fogDmg = fh - fog.hp; out.steamHits = q.flags.c8_steamHits || 0; out.kill = q.has('c8_steamKill');
    // Elias sob a nuvem também queima
    T.heal(); T.tp(10, 0, 33, 0); const hp0 = pl.hp; T.run(1.0); out.plDmg = +(hp0 - pl.hp).toFixed(1);
    T.run(1.5); fog.setDeadInstant();
    // caldeira II
    T.heal(); T.tp(17.9, 0, 37.9, -Math.PI / 2); out.v2 = T.interactAt('c8_valve_II'); T.run(2.4); out.vented2 = q.has('c8_vent_II'); out.v2T = T.last();
    out.press2 = L.pressurized(); out.ac2 = +g.perception.acoustics({ x: 10, y: 0, z: 37 }).toFixed(2);
    // caldeira III: pela passarela da galeria
    T.run(6); T.heal(); T.tp(11.9, 4.4, 48.3, -Math.PI / 2); out.v3pos = T.P(); out.v3 = T.interactAt('c8_valve_III'); T.run(2.4);
    out.vented3 = q.has('c8_vent_III'); out.all = q.has('c8_ventedAll'); out.v3T = T.last(); out.press3 = L.pressurized();
    T.run(6); out.speed = +L.turbineSpeed.toFixed(2); out.ac3 = +g.perception.acoustics({ x: 10, y: 0, z: 37 }).toFixed(2);
    out.obj = q.current(); out.wheels = ['I', 'II', 'III'].every((id) => L.boilers[id].wheel?.visible !== false);
    return out;
  });
  await page.screenshot({ path: SHOTS + '51-cap8-alivio.png' });
  check('Cap. 8: girar o volante leva 2,2 s parado — afastar-se ou levar golpe solta (a válvula fecha)', e.v1a === 'ok' && e.venting && e.cancel && e.cancelHit, JSON.stringify(e));
  check('Cap. 8: caldeira I aliviada — jato com ruído real (chão e galeria), pressão 2/3', e.v1 === 'ok' && e.vented1 && e.press1 === 2 && e.steamNoise.length >= 2 && e.steamNoise[0] >= 14 && e.steamFloors.length === 2 && /2\/3/.test(e.v1T), JSON.stringify(e));
  check('Cap. 8: a nuvem de vapor (após 1,2 s) queima e mata o acólito; o foguista encapuzado é imune; Elias embaixo também queima', e.delayDmg === 0 && e.acoDmg > 0 && e.acoDead && e.kill && e.steamHits >= 3 && e.fogDmg === 0 && e.plDmg >= 10, JSON.stringify(e));
  check('Cap. 8: caldeira II e a III pela passarela da galeria — linha zerada (c8_ventedAll), turbina desacelera e a sala fica mais silenciosa', e.v2 === 'ok' && e.vented2 && e.press2 === 1 && e.ac2 > 0.6 && e.v3 === 'ok' && e.vented3 && e.all && e.press3 === 0 && /terceira/.test(e.v3T) && e.speed < 0.5 && e.ac3 > e.ac2 && /porta-pistão|Turbina/.test(e.obj), JSON.stringify(e));

  // ---------- Sala da Turbina, sabotagem e base da torre ----------
  const f = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, pl = g.player, out = {}, $ = (id) => document.getElementById(id);
    T.heal(); T.E('c8_fog2').setDeadInstant(); T.E('c8_aco3').alive && T.E('c8_aco3').setDeadInstant();
    T.tp(13, 0, 50.6, 0); out.sd = T.interactAt('door_c8_steamDoor'); T.run(1.5); out.sdOpen = L.doors.c8_steamDoor.open && q.has('c8_steamDoorOpen');
    T.tp(13, 0, 50.6, 0); T.hold('KeyW', 1.2); out.inT = q.has('c8_inTurbine'); out.cp = T.S().checkpoint; out.zone = L.zone; out.p = T.P();
    T.tp(4.2, 0, 62.9, 0); out.ord = T.interactAt('doc_ordem_vernet'); T.run(0.1); out.readOrd = q.has('c8_readOrdem');
    T.tp(2.9, 0, 62.9, 0); out.book = T.interactAt('c8_turbine_book');
    T.tp(13, 0, 66.6, 0); out.td = T.interactAt('door_c8_towerDoor'); out.tdT = T.last(); out.tdLocked = L.doors.c8_towerDoor.locked;
    T.tp(13, 0, 66.8, 0); T.hold('KeyW', 0.8); out.tdBlock = +pl.pos.z.toFixed(2);
    out.v0 = Math.round(L.voltage);
    window.__ev = []; const orig = g.perception.noise.bind(g.perception); g.perception.noise = (p, r, k) => { window.__ev.push({ k, r }); return orig(p, r, k); };
    T.tp(27.8, 0, 56, Math.PI / 2); out.board = T.interactAt('c8_board'); g.perception.noise = orig;
    out.sab = q.has('c8_sabotage') && L.sabotage; out.sabNoise = window.__ev.some((x) => x.k === 'metal' && x.r >= 9);
    T.run(3); out.v1 = Math.round(L.voltage); out.tdUnlocked = !L.doors.c8_towerDoor.locked;
    const am0 = g.inventory.count('municao_38'); T.tp(26.6, 0, 65.9, 0); out.ammo = T.interactAt('pick_c8_ammo_turbine'); out.ammoN = g.inventory.count('municao_38') - am0;
    out.obj = q.current();
    T.tp(13, 0, 66.6, 0); out.td2 = T.interactAt('door_c8_towerDoor'); T.run(1.2); out.tdOpen = L.doors.c8_towerDoor.open;
    T.tp(13, 0, 66.8, 0); T.hold('KeyW', 1.6); out.slice = q.has('c8_sliceDone'); out.cp2 = T.S().checkpoint; out.endT = T.last(); out.zone2 = L.zone; out.st = g.state;
    T.tp(13, 0, 70.6, 0); out.lift = T.interactAt('c8_lift'); out.liftT = T.last();
    out.obj2 = q.current(); out.lights = T.lights();
    T.key('KeyM'); out.map = g.menus.lastMap; g.closeOverlay();
    out.endScreen = !!$('chapterEnd')?.offsetParent;
    out.alive = pl.alive;
    return out;
  });
  await page.screenshot({ path: SHOTS + '52-cap8-torre.png' });
  check('Cap. 8: sem pressão a porta-pistão desliza; Sala da Turbina (save c8_turbine), ordem de Vernet e livro', f.sd === 'ok' && f.sdOpen && f.inT && f.cp === 'c8_turbine' && f.zone === 'c8_turbina' && f.ord === 'ok' && f.readOrd && f.book === 'ok', JSON.stringify(f));
  check('Cap. 8: porta da torre com fechadura elétrica (sólida); acumuladores seguram ~110 V com a turbina parada', f.td === 'ok' && f.tdLocked && /elétric|corrente|fechadura/.test(f.tdT) && f.tdBlock < 68 && f.v0 >= 100 && f.v0 <= 140, JSON.stringify(f));
  check('Cap. 8: sabotagem real — chave geral desarmada (ruído), voltagem a 0, porta da torre destrancada; munição', f.board === 'ok' && f.sab && f.sabNoise && f.v1 <= 5 && f.tdUnlocked && f.ammo === 'ok' && f.ammoN === 4 && /base da torre/.test(f.obj), JSON.stringify(f));
  check('Cap. 8: base da torre de transmissão (save c8_slice, sem tela de fim) — monta-cargas sem força lá no alto, objetivo da escada de marinheiro, mapa da Usina', f.td2 === 'ok' && f.tdOpen && f.slice && f.cp2 === 'c8_slice' && /Base da torre/.test(f.endT) && !/próxima atualização/.test(f.endT + f.obj2) && f.zone2 === 'c8_torre' && f.st === 'playing' && f.lift === 'ok' && /monta-cargas|cabine/.test(f.liftT) && /escada de marinheiro/.test(f.obj2) && f.map && f.map.rooms >= 6 && !f.endScreen && f.alive && f.lights <= 16, JSON.stringify(f));

  // ---------- recarregar c8_slice ----------
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  await ext();
  await page.evaluate(() => { window.__toasts = []; document.getElementById('btnContinue').click(); });
  await ext();
  const y = await page.evaluate(() => {
    T.run(0.4);
    const g = __ocdc, L = g.level, D = L.doors, q = g.quest;
    return { st: g.state, ch: g.chapter, pos: T.P(), toast: window.__toasts.join(' | '), press: L.pressurized(), vented: ['I', 'II', 'III'].every((id) => L.boilers[id].vented),
      sd: !D.c8_steamDoor.locked, cargo: !D.c8_cargo.locked, td: !D.c8_towerDoor.locked, sab: L.sabotage, volt: Math.round(L.voltage), leaks: L.leaksOff,
      wheel: g.inventory.has('volante_valvula'), wheelHidden: !L.pickupMeshes.c8_wheel.visible, dead: ['c8_aco1', 'c8_carv1', 'c8_aco2', 'c8_aco3', 'c8_fog1', 'c8_fog2'].every((id) => !T.E(id).alive),
      obj: q.current(), slice: q.has('c8_sliceDone'), plumes: Object.keys(g.script.plumes).length };
  });
  check('Cap. 8: recarregar c8_slice restaura caldeiras aliviadas, portas, sabotagem, registro fechado, volante e mortos (na base da torre)', y.st === 'playing' && y.ch === 8 && y.pos[2] > 69 && /base da torre/.test(y.toast) && y.press === 0 && y.vented && y.sd && y.cargo && y.td && y.sab && y.volt === 0 && y.leaks && y.wheel && y.wheelHidden && y.dead && y.slice && /escada de marinheiro/.test(y.obj) && y.plumes === 0, JSON.stringify(y));

  // ---------- a torre: casa de máquinas, chefes, Inês e Helena, finais, créditos ----------
  await runC8Tower(page, check, inject, ext, SHOTS);
}
