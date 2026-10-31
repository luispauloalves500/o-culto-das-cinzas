// Bloco do smoke para o Capítulo 7 — Sob a Pedra (primeira fatia). Usado pelo smoke completo (depois do fim do Cap. 6)
// e pelo smoke-c7.mjs (só este capítulo, a partir de um save c6_end). Tudo pelos sistemas reais via window.__ocdc.
export async function runC7(page, check, inject, SHOTS, c6endRaw) {
  await page.evaluate((raw) => localStorage.setItem('ocdc_save', raw), c6endRaw);
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  await page.evaluate(() => {
    const g = __ocdc; window.__toasts = [];
    document.getElementById('btnContinue').click(); T.run(0.3);
    if (!g.hud.__wrapped) { const t = g.hud.toast.bind(g.hud); g.hud.toast = (m, d) => { window.__toasts.push(String(m)); return t(m, d); }; g.hud.__wrapped = true; }
    window.T.lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    window.T.E = (id) => g.enemies.find((e) => e.id === id);
    window.T.S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    window.T.P = () => g.player.pos.toArray().map((v) => +v.toFixed(2));
  });

  // ---------- início: poço da escada ----------
  const a = await page.evaluate(() => {
    const g = __ocdc, s = T.S(), out = {};
    const emp = g.enemies.filter((e) => e.type === 'emparedado');
    Object.assign(out, { st: g.state, ch: g.chapter, sch: s.chapter, cp: s.checkpoint, pos: T.P(), obj: g.quest.current(), n: g.enemies.length,
      emp: emp.length, dorm: emp.filter((e) => e.dormant).length, fog: !!g.scene.fog, ac: typeof g.perception.acoustics === 'function',
      acHere: g.perception.acoustics(g.player.pos), axe: g.inventory.weapons.includes('machado'), lights: T.lights(), zone: g.level.zone });
    T.tp(18, 0, 1.6, Math.PI); out.ladder = T.interactAt('c7_ladder'); out.ladderT = window.__toasts.at(-1);
    T.tp(21.2, 0, 3, Math.PI / 2); out.svc = T.interactAt('door_c7_service'); out.svcLocked = g.level.doors.c7_service.locked && !g.level.doors.c7_service.open && g.quest.has('note_c7_service');
    T.tp(20.6, 0, 3.6, 0); out.book = T.interactAt('c7_ladder_book'); out.bookCp = T.S().checkpoint;
    T.tp(15.4, 0, 4.0, 0); out.band = T.interactAt('pick_c7_band_shaft');
    return out;
  });
  await page.screenshot({ path: SHOTS + '39-cap7-poco.png' });
  check('Cap. 7: Sob a Pedra começa no pé da escada do alçapão (capítulo 7, save c7_ladder, armas mantidas, névoa e acústica)', a.st === 'playing' && a.ch === 7 && a.sch === 7 && a.cp === 'c7_ladder' && Math.abs(a.pos[0] - 18) < 0.8 && a.pos[2] < 4 && a.axe && a.fog && a.ac && a.acHere > 1 && /galeria de pedra/.test(a.obj) && a.zone === 'c7_poco', JSON.stringify(a));
  check('Cap. 7: emparedados dormentes nos nichos, acólito e ≤ 16 luzes', a.n === 6 && a.emp === 5 && a.dorm === 4 && a.lights <= 16, JSON.stringify({ n: a.n, e: a.emp, d: a.dorm, l: a.lights }));
  check('Cap. 7: alçapão trancado por cima, porta de serviço sem fechadura deste lado, livro de registros (save) e bandagem', a.ladder === 'ok' && /alçapão/.test(a.ladderT) && a.svc === 'ok' && a.svcLocked && a.book === 'ok' && a.bookCp === 'c7_ladder' && a.band === 'ok', JSON.stringify({ l: a.ladder, s: a.svc, sl: a.svcLocked, b: a.book, cp: a.bookCp, bd: a.band }));

  // ---------- galeria de pedra → grade rangente → ossuário ----------
  const b = await page.evaluate(() => {
    const g = __ocdc, out = {}, D = g.level.doors;
    T.tp(18, 0, 5, 0); T.hold('KeyW', 1.6); out.gal = g.level.zone; out.p0 = T.P();
    T.tp(18, 0, 14.8, 0); T.hold('KeyW', 1.0); out.blocked = +g.player.pos.z.toFixed(2);
    T.tp(18, 0, 14.6, 0); out.gate = T.interactAt('door_c7_gate');
    const ev = g.perception.events.find((e) => e.kind === 'gate'); out.gateNoise = ev ? ev.radius : 0; out.creak = g.quest.has('c7_gateCreak');
    T.run(1.0); out.gateOpen = D.c7_gate.open;
    out.dorm = g.enemies.filter((e) => e.type === 'emparedado' && e.dormant).length;
    // anda (sem correr) pelo meio do ossuário: os nichos não acordam
    T.tp(18, 0, 15.4, 0); T.hold('KeyW', 1.5); out.inOss = g.quest.has('c7_inOssuary'); out.cp = T.S().checkpoint; out.zone = g.level.zone; out.p1 = T.P();
    out.dorm2 = g.enemies.filter((e) => e.type === 'emparedado' && e.dormant).length;
    out.ac = g.perception.acoustics(g.player.pos);
    T.tp(17.25, 0, 18.6, Math.PI); out.reg = T.interactAt('doc_registro_coveiro'); T.run(0.1); out.readReg = g.quest.has('c7_readRegistro');
    out.obj = g.quest.current(); out.lights = T.lights();
    return out;
  });
  await page.screenshot({ path: SHOTS + '40-cap7-ossuario.png' });
  check('Cap. 7: galeria de pedra e grade do ossuário (bloqueia fechada; abrir range — ruído real de 8 m)', b.gal === 'c7_galeria' && b.blocked < 16 && b.gate === 'ok' && b.gateNoise >= 8 && b.creak && b.gateOpen && b.dorm === 4, JSON.stringify(b));
  check('Cap. 7: entrar andando no ossuário (save c7_ossuario, eco 1,6×) não acorda os nichos; livro do coveiro', b.inOss && b.cp === 'c7_ossuary' && b.zone === 'c7_ossuario' && b.dorm2 === 4 && b.ac >= 1.5 && b.reg === 'ok' && b.readReg && /grade do fundo/.test(b.obj) && b.lights <= 16, JSON.stringify(b));

  // ---------- ossos que estalam e o emparedado cego ----------
  const c = await page.evaluate(() => {
    const g = __ocdc, out = {}, L = g.level;
    // mancha central: andar estala (ruído 'bones'), mas de longe dos nichos ninguém acorda
    T.tp(18, 0, 21.6, 0); window.__noise = []; const orig = g.perception.noise.bind(g.perception);
    g.perception.noise = (p, r, k) => { window.__noise.push({ k, r, x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); return orig(p, r, k); };
    T.hold('KeyW', 0.9); out.bones = window.__noise.filter((n) => n.k === 'bones').length; out.crunch = g.quest.has('c7_crunched');
    T.run(0.5); out.dorm = g.enemies.filter((e) => e.type === 'emparedado' && e.dormant).length;
    // mancha oeste, ao lado do nicho nW2: o morador acorda e vai até o barulho
    const e3 = T.E('c7_emp3'); out.e3d0 = e3.dormant;
    T.tp(15, 0, 27.9, 0); T.hold('KeyW', 0.7); T.run(0.3);
    out.e3d1 = e3.dormant; out.e3st = e3.state; out.woke = g.quest.has('c7_woke_c7_emp3'); out.niche = L.niches.nW2.open && !L.niches.nW2.plaster.visible && L.niches.nW2.rubble.visible;
    out.lk = e3.lastKnown ? [+e3.lastKnown.x.toFixed(1), +e3.lastKnown.z.toFixed(1)] : null;
    // cego: Elias some (teleporte silencioso) e fica parado — ele vai ao ponto do barulho, não a Elias
    T.tp(21.5, 0, 19.5, Math.PI); g.player.hp = g.player.maxHp; T.run(2.5);
    out.e3st2 = e3.state; out.e3d = +Math.hypot(e3.pos.x - g.player.pos.x, e3.pos.z - g.player.pos.z).toFixed(2);
    out.e3moved = +Math.hypot(e3.pos.x - 11.5, e3.pos.z - 27).toFixed(2); out.hp = g.player.hp;
    // e um golpe no ar (barulho) perto dele: ouve e vem
    T.tp(e3.pos.x + 4.5, 0, e3.pos.z, -Math.PI / 2); T.press('Mouse0'); T.run(0.6); out.e3st3 = e3.state;
    out.e3lk2 = e3.lastKnown ? +Math.hypot(e3.lastKnown.x - g.player.pos.x, e3.lastKnown.z - g.player.pos.z).toFixed(2) : null;
    g.perception.noise = orig;
    e3.setDeadInstant();
    // o já solto da nave do fundo
    const e5 = T.E('c7_emp5'); out.e5 = !e5.dormant && e5.alive; e5.setDeadInstant();
    out.hint = window.__toasts.length; g.player.hp = g.player.maxHp;
    return out;
  });
  check('Cap. 7: ossos no chão estalam ao andar (ruído real "bones"); no meio do ossuário os nichos não ouvem', c.bones >= 1 && c.crunch && c.dorm === 4, JSON.stringify(c));
  check('Cap. 7: pisar nos ossos ao lado do nicho acorda o emparedado — a cal cai e ele vai até o barulho', c.e3d0 && !c.e3d1 && c.woke && c.niche && ['investigate', 'chase', 'alert'].includes(c.e3st) && c.lk && Math.hypot(c.lk[0] - 15, c.lk[1] - 29) < 2.5, JSON.stringify(c));
  check('Cap. 7: emparedado é cego — com Elias parado e em silêncio ele vai ao barulho, não a Elias; um golpe o atrai', c.e3st2 !== 'attack' && c.e3d > 2 && c.e3moved > 0.8 && c.hp >= 99 && c.e3lk2 !== null && c.e3lk2 < 1.5, JSON.stringify({ s2: c.e3st2, d: c.e3d, m: c.e3moved, s3: c.e3st3, lk: c.e3lk2, hp: c.hp }));

  // ---------- grade do fundo (cadeado de crânio) → cripta → jazigo ----------
  const d = await page.evaluate(() => {
    const g = __ocdc, out = {}, L = g.level, D = L.doors;
    T.tp(18, 0, 34.4, 0); out.og = T.interactAt('door_c7_ossGate'); out.ogLocked = D.c7_ossGate.locked && !D.c7_ossGate.open; out.saw = g.quest.has('c7_sawGate'); out.obj1 = g.quest.current();
    T.tp(18, 0, 35.2, 0); T.hold('KeyW', 0.8); out.ogBlock = +g.player.pos.z.toFixed(2);
    // cripta: sem alavanca a tampa não sai
    T.tp(13, 0, 33.5, -Math.PI / 2); T.hold('KeyW', 1.4); out.inCrypt = g.quest.has('c7_inCrypt'); out.zone = L.zone;
    T.tp(8.4, 0, 34.8, 0); out.try1 = T.interactAt('c7_pry'); out.tried = g.quest.has('c7_triedJazigo') && !g.quest.has('c7_cryptOpen'); out.side = g.quest.side().join(' | ');
    out.ammo = T.interact('pick_c7_ammo_crypt');
    // o pé de cabra no carrinho da galeria de pedra
    T.tp(18.4, 0, 10.8, Math.PI / 2); out.crow = T.interactAt('pick_c7_crowbar'); out.hasCrow = g.inventory.has('pe_de_cabra') && g.quest.has('c7_hasCrowbar');
    // volta à cripta: a tampa range, tomba e acorda quem dorme no nicho da cripta
    const e4 = T.E('c7_emp4'); out.e4d0 = e4.dormant;
    T.tp(8.4, 0, 34.8, 0); window.__ev = null; out.pry = T.interactAt('c7_pry');
    const ev = g.perception.events.find((e) => e.kind === 'stone'); out.pryNoise = ev ? +ev.radius.toFixed(1) : 0;
    T.run(1.2);
    out.open = g.quest.has('c7_cryptOpen') && L.jazigo.open && L.jazigo.inside.visible && !!L.jazigo.collider && L.jazigo.lid.position.x < 7;
    out.e4d1 = e4.dormant; out.e4niche = L.niches.nC.open; out.woke4 = g.quest.has('c7_woke_c7_emp4');
    e4.setDeadInstant(); g.player.hp = g.player.maxHp;
    out.key = T.interactAt('pick_c7_jazigo'); if (g.state === 'reading') g.closeOverlay(); T.run(0.1);
    out.hasKey = g.inventory.has('chave_coveiro') && g.quest.has('c7_hasKey') && g.inventory.documents.includes('recado_ines_pedra');
    out.obj2 = g.quest.current();
    // a tampa tombada é obstáculo real
    T.tp(5.9, 0, 35.4, 0); T.hold('KeyW', 0.8); out.lidBlock = +g.player.pos.z.toFixed(2);
    // abrir a grade com a chave
    T.tp(18, 0, 34.4, 0); out.og2 = T.interactAt('door_c7_ossGate'); T.run(1.0);
    out.ogOpen = !D.c7_ossGate.locked && D.c7_ossGate.open && g.quest.has('c7_ossOpen') && !g.inventory.has('chave_coveiro');
    out.obj3 = g.quest.current(); out.lights = T.lights();
    return out;
  });
  await page.screenshot({ path: SHOTS + '41-cap7-cripta.png' });
  check('Cap. 7: grade do fundo trancada (cadeado de crânio) e bloqueando; objetivo aponta para a cripta', d.og === 'ok' && d.ogLocked && d.saw && d.ogBlock < 36 && /coveiro-mor/.test(d.obj1), JSON.stringify({ o: d.og, l: d.ogLocked, z: d.ogBlock, ob: d.obj1 }));
  check('Cap. 7: jazigo sem alavanca não abre (objetivo lateral) → pé de cabra no carrinho da galeria', d.inCrypt && d.zone === 'c7_cripta' && d.try1 === 'ok' && d.tried && /alavanca/.test(d.side) && d.ammo === 'ok' && d.crow === 'ok' && d.hasCrow, JSON.stringify({ c: d.inCrypt, z: d.zone, t: d.try1, s: d.side, a: d.ammo, cr: d.crow }));
  check('Cap. 7: a tampa do jazigo sai com o pé de cabra (barulho real ≥ 10 m acorda o emparedado da cripta); chave e recado de Inês', d.pry === 'ok' && d.pryNoise >= 10 && d.open && d.e4d0 && !d.e4d1 && d.e4niche && d.woke4 && d.key === 'ok' && d.hasKey && d.lidBlock < 36.2, JSON.stringify({ p: d.pry, n: d.pryNoise, o: d.open, e4: [d.e4d0, d.e4d1, d.e4niche], k: d.key, lb: d.lidBlock }));
  check('Cap. 7: a chave do coveiro-mor abre a grade do fundo', d.og2 === 'ok' && d.ogOpen && /túnel/.test(d.obj3) && d.lights <= 16, JSON.stringify({ o: d.og2, ob: d.obj3, l: d.lights }));

  // ---------- túnel → Estação Sé Velha → atalho → trilhos (fim da fatia) ----------
  const e = await page.evaluate(() => {
    const g = __ocdc, out = {}, L = g.level, D = L.doors;
    T.tp(18, 0, 37.2, 0); T.hold('KeyW', 1.5); T.tp(18, 0, 42.6, 0); T.hold('KeyW', 1.5); out.p0 = T.P();
    out.onPlat = g.quest.has('c7_onPlatform'); out.cp = T.S().checkpoint; out.zone = L.zone;
    const aco = T.E('c7_aco1'); out.aco = aco.alive && !aco.dormant; aco.setDeadInstant(); g.player.hp = g.player.maxHp;
    T.tp(13.4, 0, 45.2, Math.PI); out.quadro = T.interactAt('doc_quadro_linha_velha'); T.run(0.1); out.readQ = g.quest.has('c7_readQuadro');
    T.tp(8.4, 0, 46.0, Math.PI); out.book = T.interactAt('c7_platform_book'); out.bookCp = T.S().checkpoint;
    out.band = T.interactAt('pick_c7_band_platform') === 'ok' || T.interact('pick_c7_band_platform') === 'ok';
    out.lights = T.lights();
    // corredor de serviço → ferrolho do lado de lá → atalho para o poço
    T.tp(38, 0, 45.2, Math.PI); out.cor = T.interactAt('door_c7_corridor'); T.run(1.0); out.corOpen = D.c7_corridor.open;
    T.tp(38, 0, 45.0, Math.PI); T.hold('KeyW', 1.0); out.pc = T.P();
    T.tp(38.2, 0, 20, Math.PI); out.ammo = T.interactAt('pick_c7_ammo_service');
    T.tp(22.9, 0, 3, -Math.PI / 2); out.svc = T.interactAt('door_c7_service'); T.run(1.0);
    out.short = !D.c7_service.locked && D.c7_service.open && g.quest.has('c7_shortcut');
    T.tp(23.2, 0, 3, -Math.PI / 2); T.hold('KeyW', 1.0); out.pShaft = T.P();
    const path = g.nav.findPath('p0', 'plE2'); out.navLen = path ? path.length : -1;
    // escada de manutenção → trilhos; a borda da plataforma não se sobe de volta
    T.tp(42, 0, 48.4, 0); T.hold('KeyW', 1.8); out.pTrack = T.P();
    T.tp(30, -1, 51.2, Math.PI); T.hold('KeyW', 0.8); out.edge = T.P();
    T.tp(44.6, -1, 52.6, Math.PI / 2); T.hold('KeyW', 1.4); out.pEnd = T.P();
    out.done = g.quest.has('c7_sliceDone'); out.endCp = T.S().checkpoint; out.state = g.state; out.obj = g.quest.current();
    out.toast = window.__toasts.some((t) => /Fim da primeira parte/.test(t));
    T.key('KeyM'); out.map = g.menus.lastMap; out.mapTabs = [...document.querySelectorAll('.map-tab')].filter((b) => b.offsetParent).map((b) => b.textContent).join('|'); g.closeOverlay();
    return out;
  });
  await page.screenshot({ path: SHOTS + '42-cap7-trilhos.png' });
  check('Cap. 7: túnel até a Estação Sé Velha (save c7_platform), acólito de ronda, quadro da Linha Velha e livro de registros', e.onPlat && e.cp === 'c7_platform' && e.zone === 'c7_estacao' && e.aco && e.quadro === 'ok' && e.readQ && e.book === 'ok' && e.bookCp === 'c7_platform' && e.lights <= 16, JSON.stringify(e));
  check('Cap. 7: atalho — corredor de serviço da plataforma e ferrolho só do lado de lá até o poço da escada', e.cor === 'ok' && e.corOpen && e.pc[2] < 43.8 && e.ammo === 'ok' && e.svc === 'ok' && e.short && e.pShaft[0] < 21.8, JSON.stringify({ c: e.cor, pc: e.pc, a: e.ammo, s: e.svc, sh: e.short, p: e.pShaft, n: e.navLen }));
  check('Cap. 7: escada de manutenção desce aos trilhos; a borda de 1 m da plataforma não deixa subir de volta', e.pTrack[1] < -0.8 && e.pTrack[2] > 50.4 && e.edge[2] > 49.9 && e.edge[1] < -0.8, JSON.stringify({ t: e.pTrack, e: e.edge }));
  check('Cap. 7: trilhos para o leste encerram a primeira fatia (save c7_slice, sem chefe, sem tela de fim) e grade acorrentada bloqueia', e.done && e.endCp === 'c7_slice' && e.state === 'playing' && e.pEnd[0] > 46.2 && e.pEnd[0] < 48.9 && /Fim da primeira parte/.test(e.obj) && e.toast && e.map && e.map.rooms >= 6, JSON.stringify({ d: e.done, cp: e.endCp, st: e.state, p: e.pEnd, o: e.obj, m: e.map, tabs: e.mapTabs }));

  // ---------- recarregar c7_slice: estado restaurado ----------
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const z = await page.evaluate(() => {
    document.getElementById('btnContinue').click(); const g = __ocdc, L = g.level, D = L.doors; T.run(0.4);
    const E = (id) => g.enemies.find((e) => e.id === id);
    return { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), done: g.quest.has('c7_sliceDone'),
      og: !D.c7_ossGate.locked && D.c7_ossGate.open, svc: !D.c7_service.locked, jaz: L.jazigo.open && !!L.jazigo.collider,
      dead3: !E('c7_emp3').alive, dead4: !E('c7_emp4').alive, n2: L.niches.nW2.open, nC: L.niches.nC.open, n1: !L.niches.nW1.open && E('c7_emp1').dormant,
      crow: !L.pickupMeshes.c7_crowbar.visible && g.inventory.has('pe_de_cabra'), obj: g.quest.current() };
  });
  check('Cap. 7: recarregar c7_slice restaura trilhos, grade aberta, atalho, jazigo aberto, nichos quebrados e mortos', z.st === 'playing' && z.ch === 7 && z.pos[1] < -0.8 && z.pos[0] > 44 && z.done && z.og && z.svc && z.jaz && z.dead3 && z.dead4 && z.n2 && z.nC && z.n1 && z.crow && /Fim da primeira parte/.test(z.obj), JSON.stringify(z));
}
