// Bloco do smoke para o Capítulo 6 — O Acervo (primeira fatia). Usado pelo smoke completo (depois do fim do Cap. 5)
// e pelo smoke-c6.mjs (só este capítulo, a partir de um save c5_end). Tudo pelos sistemas reais via window.__ocdc.
export async function runC6(page, check, inject, SHOTS, c5endRaw) {
  await inject();
  const hook = () => page.evaluate(() => {
    const g = __ocdc; window.__toasts = [];
    if (!g.hud.__wrapped) { const t = g.hud.toast.bind(g.hud); g.hud.toast = (m, d) => { window.__toasts.push(String(m)); return t(m, d); }; g.hud.__wrapped = true; }
  });
  await hook();
  const c6s = await page.evaluate(() => {
    const g = __ocdc, s = JSON.parse(localStorage.getItem('ocdc_save')); T.run(0.3);
    const lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    const esp = g.enemies.filter((e) => e.type === 'especime');
    return { st: g.state, ch: g.chapter, sch: s.chapter, cp: s.checkpoint, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), obj: g.quest.current(),
      axe: g.inventory.weapons.includes('machado') && !!g.player.weapon, fuse: g.inventory.has('fusivel_ceramico'), docs: g.inventory.documents.length,
      flags: { c5: !!s.flags.c5_chapterDone, st: !!s.flags.c6_started, af: !!s.flags.c5_afogadaDead }, lights: lights(), n: g.enemies.length,
      esp: esp.length, dorm: esp.filter((e) => e.dormant).length, fog: !!g.scene.fog, props: g.script.props.length, targets: g.targets().filter((t) => t.isProp).length };
  });
  await page.screenshot({ path: SHOTS + '33-cap6-doca.png' });
  check('Cap. 6: botão do fim do Cap. 5 inicia O Acervo na doca do Museu (save migrado, itens-chave do Cap. 5 removidos)', c6s.st === 'playing' && c6s.ch === 6 && c6s.sch === 6 && c6s.cp === 'c6_dock' && Math.abs(c6s.pos[0] - 15) < 0.8 && Math.abs(c6s.pos[2] - 2) < 0.8 && c6s.axe && !c6s.fuse && c6s.docs > 0 && c6s.flags.c5 && c6s.flags.st && c6s.flags.af && /Museu|doca/i.test(c6s.obj), JSON.stringify(c6s));
  check('Cap. 6: espécimes dormentes nas vitrines, vitrines como alvos reais, névoa própria e ≤ 16 luzes', c6s.n === 5 && c6s.esp === 3 && c6s.dorm === 2 && c6s.props === 9 && c6s.targets === 9 && c6s.fog && c6s.lights <= 16, JSON.stringify(c6s));

  // doca → átrio: porta real, portas principais acorrentadas, vitrine de lembranças quebrada a machado
  const c6a = await page.evaluate(() => {
    const g = __ocdc, out = {}, P = () => g.player.pos.toArray().map((v) => +v.toFixed(2));
    T.tp(15, 0, 6.2, 0); T.hold('KeyW', 1.2); out.blocked = g.player.pos.z;
    T.tp(15, 0, 6.6, 0); out.dock = T.interactAt('door_c6_dock'); T.run(0.8);
    T.tp(14.7, 0, 6.6, 0); T.hold('KeyW', 1.6); out.inAtrium = g.quest.has('c6_inAtrium'); out.p1 = P();
    const aco = g.enemies.find((e) => e.id === 'c6_aco1'); out.acoPatrol = !aco.dormant && aco.alive; aco.setDeadInstant();
    T.tp(5.6, 0, 15, -Math.PI / 2); out.main = T.interactAt('door_c6_main'); out.mainLocked = g.level.doors.c6_main.locked && !g.level.doors.c6_main.open && g.quest.has('note_c6_main');
    // vitrine de lembranças: machado de verdade
    const V = g.script.vit.v_atrio; out.hp0 = V.hp; const noise0 = g.perception?.events?.length ?? null;
    T.tp(21.6, 0, 14.75, 0); g.player.yaw = 0;
    let swings = 0; for (; swings < 8 && V.alive; swings++) { g.player.yaw = 0; T.press('Mouse0'); T.run(0.9); }
    out.swings = swings; out.broken = !V.alive && g.quest.has('c6_broke_v_atrio') && !g.level.vitrines.v_atrio.glass.visible && g.level.vitrines.v_atrio.shards.visible;
    out.band0 = g.inventory.count('bandagem'); out.loot = T.interact('pick_c6_loot_v_atrio'); out.band1 = g.inventory.count('bandagem');
    // guia do visitante e livro de registros da recepção
    T.tp(16.5, 0, 13.0, 0); out.guia = T.interactAt('doc_guia_visitante'); if (g.state === 'reading') g.closeOverlay(); T.run(0.1); out.readGuia = g.quest.has('c6_readGuia');
    T.tp(13.2, 0, 13.0, 0); out.book = T.interactAt('c6_atrium_book'); out.cp = JSON.parse(localStorage.getItem('ocdc_save')).checkpoint;
    out.obj = g.quest.current();
    return out;
  });
  check('Cap. 6: porta real da doca (bloqueia fechada, abre) e entrada no átrio; portas principais acorrentadas', c6a.blocked < 7.9 && c6a.dock === 'ok' && c6a.inAtrium && c6a.acoPatrol && c6a.main === 'ok' && c6a.mainLocked, JSON.stringify(c6a));
  check('Cap. 6: vitrine quebrada a machado (dano real, cacos) libera a bandagem exposta', c6a.broken && c6a.swings >= 1 && c6a.loot === 'ok' && c6a.band1 === c6a.band0 + 1, JSON.stringify({ s: c6a.swings, b: c6a.broken, l: c6a.loot }));
  check('Cap. 6: guia do visitante e livro de registros do átrio (save c6_atrium)', c6a.guia === 'ok' && c6a.readGuia && c6a.book === 'ok' && c6a.cp === 'c6_atrium' && /Salão/.test(c6a.obj), JSON.stringify({ g: c6a.guia, b: c6a.book, cp: c6a.cp, o: c6a.obj }));

  // salão de exposição: placas, espécime que acorda, relicário (alarme), gaveta de fundo falso
  const c6b = await page.evaluate(() => {
    const g = __ocdc, out = {}, E = (id) => g.enemies.find((e) => e.id === id), S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    g.player.hp = g.player.maxHp;
    T.tp(15, 0, 20.6, 0); out.hall = T.interactAt('door_c6_hall'); T.run(0.8); T.tp(15.4, 0, 20.6, 0); T.hold('KeyW', 1.8);
    out.inHall = g.quest.has('c6_inHall'); out.cp = S().checkpoint;
    T.tp(6, 0, 25.6, 0); out.pl = T.interact('c6_plaque_v_cranio'); out.t1 = window.__toasts.at(-1);
    T.tp(9, 0, 35.6, 0); out.pf = T.interact('c6_plaque_v_relicario'); out.t2 = window.__toasts.find((t) => /fosco/.test(t)) || window.__toasts.at(-1); out.know0 = g.quest.has('c6_knowCode');
    out.esp1Dorm0 = E('c6_esp1').dormant;
    // vitrine de corpo inteiro: Elias encosta no vidro e o espécime sai
    T.tp(4.4, 0, 33, -Math.PI / 2); T.run(0.3);
    out.esp1Woke = !E('c6_esp1').dormant && g.quest.has('c6_broke_v_esp1') && g.level.vitrines.v_esp1.collider.enabled === false;
    T.tp(6.5, 0, 33, -Math.PI / 2); g.player.hp = g.player.maxHp; T.run(1.2); out.esp1State = E('c6_esp1').state;
    E('c6_esp1').setDeadInstant();
    // o relicário: machado no vidro fosco → alarme acorda o espécime 88, a placa interna dá o número
    const R = g.script.vit.v_relicario; out.esp2Dorm0 = E('c6_esp2').dormant;
    T.tp(9, 0, 36.15, 0); let sw = 0; for (; sw < 8 && R.alive; sw++) { g.player.yaw = 0; T.press('Mouse0'); T.run(0.9); }
    out.relBroken = !R.alive; out.esp2Woke = !E('c6_esp2').dormant && g.quest.has('c6_broke_v_esp2'); out.know = g.quest.has('c6_knowCode');
    out.alarm = window.__toasts.some((t) => /sino/.test(t));
    T.tp(9, 0, 35.6, 0); out.pf2 = T.interact('c6_plaque_v_relicario'); out.t3 = window.__toasts.at(-1);
    E('c6_esp2').setDeadInstant();
    // tabuleiro: gaveta de fundo falso (objetivo lateral)
    const B = g.script.vit.v_tabuleiro; T.tp(24, 0, 26.15, 0); let sw2 = 0; for (; sw2 < 8 && B.alive; sw2++) { g.player.yaw = 0; T.press('Mouse0'); T.run(0.9); }
    const a0 = T.ammo(); T.tp(24, 0, 25.6, 0); out.cache = T.interact('pick_c6_loot_v_tabuleiro'); out.ammoGain = T.ammo() - a0; out.gotCache = g.quest.has('c6_gotCache');
    let l = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) l++; }); out.lights = l;
    out.obj = g.quest.current();
    return out;
  });
  await page.screenshot({ path: SHOTS + '34-cap6-salao.png' });
  check('Cap. 6: Salão de Exposição (porta dupla, autosave c6_hall) e placas de latão com ano e nº', c6b.hall === 'ok' && c6b.inHall && c6b.cp === 'c6_hall' && c6b.pl === 'ok' && /1811/.test(c6b.t1) && /207/.test(c6b.t1) && c6b.pf === 'ok' && /fosco/.test(c6b.t2) && !c6b.know0 && /inventário/.test(c6b.obj), JSON.stringify({ t1: c6b.t1, t2: c6b.t2, cp: c6b.cp }));
  check('Cap. 6: espécime acorda quando Elias encosta no vidro (vitrine estoura, colisor some) e persegue', c6b.esp1Dorm0 && c6b.esp1Woke && ['chase', 'attack', 'investigate', 'alert'].includes(c6b.esp1State), JSON.stringify({ s: c6b.esp1State }));
  check('Cap. 6: quebrar o Relicário (vidro fosco) dispara o alarme, acorda o espécime 88 e revela o nº 418', c6b.esp2Dorm0 && c6b.relBroken && c6b.esp2Woke && c6b.know && c6b.alarm && c6b.pf2 === 'ok' && /418/.test(c6b.t3), JSON.stringify({ t3: c6b.t3 }));
  check('Cap. 6: gaveta de fundo falso do tabuleiro (objetivo lateral) e ≤ 16 luzes no salão', c6b.cache === 'ok' && c6b.ammoGain === 8 && c6b.gotCache && c6b.lights <= 16, JSON.stringify({ c: c6b.cache, a: c6b.ammoGain, l: c6b.lights }));

  // porta-cofre: código errado, código certo → conservação → depósito → porta do Colecionador
  const c6c = await page.evaluate(() => {
    const g = __ocdc, out = {}, E = (id) => g.enemies.find((e) => e.id === id), S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    const D = g.level.doors;
    T.tp(28.4, 0, 33, Math.PI / 2); T.hold('KeyW', 1.2); out.vaultBlock = g.player.pos.x;
    T.tp(28.5, 0, 36.5, Math.PI / 2); out.wrong = T.interact('c6_dialHandle'); out.tried = g.quest.has('c6_triedCode') && D.c6_vault.locked;
    const turns = []; [4, 1, 8].forEach((n, i) => { for (let k = 0; k < n; k++) { T.tp(28.5, 0, 35, Math.PI / 2); turns.push(T.interact('c6_dial' + i)); } });
    out.turns = turns.every((r) => r === 'ok'); out.tl = turns.slice(0, 2); out.dial = g.script.dial.join('');
    out.right = T.interact('c6_dialHandle'); T.run(1.0);
    out.open = g.quest.has('c6_vaultOpen') && !D.c6_vault.locked && D.c6_vault.open; out.cp1 = S().checkpoint; out.saveOpen = !!S().flags.c6_vaultOpen;
    T.tp(28.6, 0, 33, Math.PI / 2); T.hold('KeyW', 1.6); out.inConserv = g.quest.has('c6_inConserv'); out.px = g.player.pos.x;
    const e3 = E('c6_esp3'); out.esp3 = e3.alive && !e3.dormant; e3.setDeadInstant();
    T.tp(36, 0, 28.0, 0); out.diario = T.interactAt('doc_diario_conservadora'); if (g.state === 'reading') g.closeOverlay(); T.run(0.1); out.readD = g.quest.has('c6_readDiario');
    T.tp(31.7, 0, 36.8, 0); out.book = T.interact('c6_conserv_book'); out.cp2 = S().checkpoint;
    T.tp(37, 0, 38.6, 0); out.sdoor = T.interactAt('door_c6_storage'); T.run(0.8); T.tp(36.6, 0, 38.6, 0); T.hold('KeyW', 1.5);
    out.inStorage = g.quest.has('c6_inStorage');
    E('c6_aco2').setDeadInstant();
    T.tp(33.0, 0, 49.7, -Math.PI / 2); out.cartao = T.interact('doc_cartao_inventario_31'); if (g.state === 'reading') g.closeOverlay(); T.run(0.1); out.readC = g.quest.has('c6_readCartao');
    let l = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) l++; }); out.lights = l;
    out.objBefore = g.quest.current();
    T.tp(38.6, 0, 52.4, 0); out.plaque = T.interact('c6_collectorPlaque'); T.run(0.3);
    const s = S(); out.end = { cp: s.checkpoint, ch: s.chapter, done: !!s.flags.c6_sliceDone, st: g.state, locked: D.c6_collector.locked && !D.c6_collector.open };
    out.toast = window.__toasts.find((t) => /Colecionador chega/.test(t)) || '';
    out.endScreen = !document.getElementById('chapterEnd')?.classList.contains('hidden') && !!document.getElementById('chapterEnd')?.offsetParent;
    out.obj = g.quest.current();
    T.tp(37, 0, 52.4, 0); out.door = T.interactAt('door_c6_collector'); out.stillLocked = D.c6_collector.locked;
    T.key('KeyM'); out.mapState = g.state; out.map = g.menus.lastMap; out.tabs = [...document.querySelectorAll('.map-tab')].filter((e) => !e.classList.contains('hidden')).map((e) => e.textContent); g.closeOverlay();
    return out;
  });
  await page.screenshot({ path: SHOTS + '35-cap6-deposito.png' });
  check('Cap. 6: porta-cofre bloqueia, código errado não abre, discos 4-1-8 + alavanca abrem e salvam', c6c.vaultBlock < 29.85 && c6c.wrong === 'ok' && c6c.tried && c6c.turns && c6c.dial === '418' && c6c.right === 'ok' && c6c.open && c6c.cp1 === 'c6_hall' && c6c.saveOpen, JSON.stringify({ b: c6c.vaultBlock, d: c6c.dial, cp: c6c.cp1, w: c6c.wrong, t: c6c.tried, tl: c6c.tl, r: c6c.right }));
  check('Cap. 6: Ala de Conservação (espécime solto, diário, livro c6_conserv) e depósito (cartão da remessa 31)', c6c.inConserv && c6c.px > 30.5 && c6c.esp3 && c6c.diario === 'ok' && c6c.readD && c6c.book === 'ok' && c6c.cp2 === 'c6_conserv' && c6c.sdoor === 'ok' && c6c.inStorage && c6c.cartao === 'ok' && c6c.readC && c6c.lights <= 16 && /Colecionador/.test(c6c.objBefore), JSON.stringify({ cp: c6c.cp2, o: c6c.objBefore, l: c6c.lights, ic: c6c.inConserv, px: c6c.px, e3: c6c.esp3, di: c6c.diario, rd: c6c.readD, bk: c6c.book, sd: c6c.sdoor, is: c6c.inStorage, ca: c6c.cartao, rc: c6c.readC }));
  check('Cap. 6: placa da Galeria do Colecionador encerra a fatia (save c6_slice, aviso do chefe, sem tela de fim)', c6c.plaque === 'ok' && c6c.end.cp === 'c6_slice' && c6c.end.ch === 6 && c6c.end.done && c6c.end.st === 'playing' && c6c.end.locked && c6c.toast && !c6c.endScreen && /próxima atualização/.test(c6c.obj) && c6c.door === 'ok' && c6c.stillLocked, JSON.stringify({ e: c6c.end, t: c6c.toast, o: c6c.obj }));
  check('Cap. 6: mapa do Museu (uma aba) com as salas percorridas', c6c.mapState === 'map' && c6c.map && c6c.map.rooms >= 5 && c6c.tabs.length <= 1, JSON.stringify({ m: c6c.map, t: c6c.tabs }));

  // recarregar c6_slice: estado restaurado
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const c6r = await page.evaluate(() => {
    document.getElementById('btnContinue').click(); const g = __ocdc; T.run(0.5);
    const L = g.level, D = L.doors;
    return { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), done: g.quest.has('c6_sliceDone'), vault: D.c6_vault.open && !D.c6_vault.locked,
      broken: ['v_atrio', 'v_relicario', 'v_tabuleiro', 'v_esp1', 'v_esp2'].every((id) => !L.vitrines[id].glass.visible && !g.script.vit[id].alive),
      intact: g.script.vit.v_cranio.alive && L.vitrines.v_cranio.glass.visible, dead: g.enemies.filter((e) => !e.alive).length, dial: g.script.dial.join(''),
      picked: g.level.pickupMeshes.c6_loot_v_tabuleiro.visible === false, collector: D.c6_collector.locked, obj: g.quest.current() };
  });
  check('Cap. 6: recarregar c6_slice restaura cofre aberto, vitrines quebradas, inimigos mortos e o fim da fatia', c6r.st === 'playing' && c6r.ch === 6 && c6r.pos[2] > 50 && c6r.done && c6r.vault && c6r.broken && c6r.intact && c6r.dead === 5 && c6r.dial === '418' && c6r.picked && c6r.collector && /próxima atualização/.test(c6r.obj), JSON.stringify(c6r));

  // save antigo do fim do Cap. 5 (c5_end) → Continuar migra para o Cap. 6
  if (c5endRaw) {
    await page.evaluate((raw) => localStorage.setItem('ocdc_save', raw), c5endRaw);
    await page.reload({ waitUntil: 'networkidle0' });
    await inject();
    const c6m = await page.evaluate(() => {
      document.getElementById('btnContinue').click(); const g = __ocdc; T.run(0.4);
      const s = JSON.parse(localStorage.getItem('ocdc_save'));
      return { st: g.state, ch: g.chapter, cp: s.checkpoint, sch: s.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), fuse: g.inventory.has('fusivel_ceramico'), c5: !!s.flags.c5_chapterDone };
    });
    check('Cap. 6: "Continuar" num save c5_end migra para o Capítulo 6 (doca do Museu)', c6m.st === 'playing' && c6m.ch === 6 && c6m.sch === 6 && c6m.cp === 'c6_dock' && c6m.pos[2] < 4 && !c6m.fuse && c6m.c5, JSON.stringify(c6m));
  }
}
