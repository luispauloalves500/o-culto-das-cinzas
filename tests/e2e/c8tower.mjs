// Smoke do Capítulo 8 — torre de transmissão: escada de marinheiro, casa de máquinas (Helena, manete, faca), monta-cargas,
// Vernet (vapor, ampola), Manifestação da Primeira Cinza (disjuntores, núcleo), Inês, a viagem de Helena, a verdade,
// os três finais, a tela de fim, os créditos e os saves da torre. Continua do estado c8_slice deixado pelo c8.mjs.
// Tudo pelos sistemas reais via window.__ocdc (interagíveis, segurar, cutscenes, chefes, saves).
export async function runC8Tower(page, check, inject, ext, SHOTS) {
  const tools = () => page.evaluate(() => {
    const g = __ocdc;
    window.T.skip = () => { if (g.cutscene) { g.cutscene.skipped = true; g.cutscene.finish(); } };
    window.T.until = (fn, max = 30) => { for (let i = 0; i < max * 60; i++) { if (fn()) return +(i / 60).toFixed(2); T.run(1 / 60); } return -1; };
    window.T.cs = () => (g.cutscene ? g.cutscene.id : null);
    window.T.boss = () => g.boss;
    window.T.weak = (b, dmg) => { const v = b.hurtVolumes().find((h) => h.part === 'weak'); return b.takeHit({ dmg, poise: 10, from: g.player.pos, point: { x: v.x, y: v.y, z: v.z }, volume: v }); };
  });
  await tools();

  // ---------- base: botoeira sem força → escada de marinheiro → casa de máquinas ----------
  // trilha adaptativa (pt45u): mede em tempo real o que o diretor musical agenda e o que sai do analisador
  const probe = async (ms = 2000) => {
    const a = await page.evaluate(() => { const g = __ocdc; if (g.scene && g.boss?.alive && g.state === 'playing' && g.boss.state !== 'dormant') { g.boss.state = 'stunned'; g.boss.stunDur = 9; g.boss.stateT = 0; } if (g.scene && g.player) g.player.hp = g.player.maxHp; g.syncMusic(); return g.audio.musicDebug(); });
    let rms = 0; const t0 = Date.now();
    while (Date.now() - t0 < ms) { await new Promise((r) => setTimeout(r, 120)); rms = Math.max(rms, await page.evaluate(() => __ocdc.audio.director?.rms() || 0)); }
    const b = await page.evaluate(() => { const g = __ocdc; if (g.scene && g.player) g.player.hp = g.player.maxHp; return __ocdc.audio.musicDebug(); });
    if (!a || !b) return { ok: false, a, b };
    const d = (k) => (b.perLayer[k] || 0) - (a.perLayer[k] || 0);
    const kinds = {}; for (const k of Object.keys(b.perKind)) { const v = b.perKind[k] - (a.perKind[k] || 0); if (v > 0) kinds[k] = v; }
    const x = await page.evaluate(() => ({ st: __ocdc.state, cs: __ocdc.cutscene?.id || null, boss: __ocdc.boss ? [__ocdc.boss.id, __ocdc.boss.state, __ocdc.boss.phase] : null }));
    return { ...x, hist: b.history.slice(-4), key: b.key, theme: b.theme, ctx: b.ctx, bpm: b.bpm, notes: b.notes - a.notes, lead: d('lead'), bass: d('bass'), pad: d('pad'), choir: d('choir'), perc: d('perc'), kinds, rms: +rms.toFixed(4), mix: b.mix, voices: b.voices };
  };
  const g1 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    T.heal();
    out.stop0 = L.lift.stop; out.power0 = !!L.liftPower;
    T.tp(9.9, 0, 69.4, -Math.PI / 2); out.lad = T.interactAt('c8_towerLadder'); out.climb = g.player.state;
    g.input.down.add('KeyW'); out.tUp = T.until(() => g.player.state !== 'climb' && g.player.pos.y > 6, 12); g.input.down.delete('KeyW');
    T.hold('KeyW', 0.1); T.run(0.4);
    out.pos = T.P(); out.inMach = q.has('c8_inMachine'); out.cp = T.S().checkpoint; out.zone = g.level.zone;
    out.toast = T.last(); out.obj = q.current(); out.floor = g.menus?.mapView ? null : null;
    T.tp(13, 7, 70.8, Math.PI); out.liftM = T.interactAt('c8_lift_m'); out.liftMT = T.last();
    // cabine sem manete
    T.tp(13.6, 7, 74.1, 0); T.run(0.1); out.cabNo = T.interactAt('c8_cab_up'); out.cabNoT = T.last(); out.liftStill = L.lift.stop;
    out.lights = T.lights();
    return out;
  });
  check('Cap. 8 torre: botoeira sem força, escada de marinheiro pelo alçapão até a casa de máquinas (save c8_machine), cabine sem manete não anda',
    g1.stop0 === 'maq' && !g1.power0 && g1.lad === 'ok' && g1.climb === 'climb' && g1.tUp > 0 && g1.pos[1] > 6.5 && g1.inMach && g1.cp === 'c8_machine' && /Casa de máquinas/.test(g1.toast)
    && /monta-cargas|Sem força|faca/.test(g1.liftMT) && /manete/.test(g1.cabNoT) && g1.liftStill === 'maq' && g1.lights <= 16, JSON.stringify(g1));

  // ---------- Helena, diário, livro, faca ----------
  const g2 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    // o acólito de guarda na casa de máquinas: golpes reais do machado
    const a = T.E('c8_aco4'); out.acoAlive0 = a.alive; out.acoY = +a.pos.y.toFixed(1); let sw = 0;
    while (a.alive && sw < 12) { T.heal(); T.tp(a.pos.x - 1.3, 7, a.pos.z, Math.PI / 2); g.player.yaw = Math.atan2(a.pos.x - g.player.pos.x, a.pos.z - g.player.pos.z); T.press('Mouse0'); T.run(0.9); sw++; }
    out.sw = sw; out.acoDead = !a.alive; T.run(1.5);
    const h = L.helena; out.hMode = h.mode;
    T.tp(h.pos.x + 1.2, 7, h.pos.z, -Math.PI / 2); out.talk = T.interactAt('c8_helena'); out.cs = T.cs(); out.st = g.state;
    out.csT = T.until(() => !g.cutscene, 30); out.st2 = g.state;
    out.met = q.has('c8_metHelena'); out.crank = g.inventory.has('manete_monta_cargas');
    out.talk2 = T.interactAt('c8_helena'); out.talk2T = T.last();
    T.tp(9.6, 7, 75.0, 0); out.diario = T.interactAt('doc_diario_helena'); T.run(0.1); out.readD = q.has('c8_readDiario');
    T.tp(16.0, 7, 71.5, Math.PI / 2); out.book = T.interactAt('c8_mach_book'); out.bookCp = T.S().checkpoint;
    T.tp(16.8, 7, 70.0, Math.PI); out.knife = T.interactAt('c8_knife'); out.power = !!L.liftPower && q.has('c8_liftPower'); out.knifeT = T.last();
    out.obj = q.current();
    return out;
  });
  check('Cap. 8 torre: acólito de guarda na casa de máquinas cai no machado; Helena ferida (cutscene) entrega a manete, Diário de Helena, livro de registros, faca de força fecha (barulho) e liga o monta-cargas',
    g2.acoAlive0 && g2.acoY === 7 && g2.acoDead && /sit/.test(g2.hMode) && g2.talk === 'ok' && g2.cs === 'c8_helena' && g2.st === 'cutscene' && g2.csT > 5 && g2.st2 === 'playing' && g2.met && g2.crank && g2.talk2 === 'ok' && /Helena:/.test(g2.talk2T)
    && g2.diario === 'ok' && g2.readD && g2.book === 'ok' && g2.knife === 'ok' && g2.power && /faca/.test(g2.knifeT), JSON.stringify(g2));

  // ---------- subir na cabine até o topo ----------
  const g3 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    T.tp(13.6, 7, 74.1, 0); T.run(0.1);
    out.up = T.interactAt('c8_cab_up'); out.moving = L.lift.moving;
    out.tTop = T.until(() => !L.lift.moving, 20);
    T.run(0.3);
    out.stop = L.lift.stop; out.py = +g.player.pos.y.toFixed(2); out.atTop = q.has('c8_atTop'); out.cp = T.S().checkpoint; out.toast = T.last();
    out.lockedEarly = !!L.liftLocked; out.bossSt = g.boss?.state; out.bossId = g.boss?.id;
    out.lights = T.lights(); out.obj = q.current();
    return out;
  });
  check('Cap. 8 torre: alavanca da cabine sobe o monta-cargas com Elias dentro até a Sala dos Transmissores (save c8_top), Vernet dormente',
    g3.up === 'ok' && g3.moving && g3.tTop > 2 && g3.stop === 'topo' && g3.py > 13 && g3.atTop && g3.cp === 'c8_top' && /Topo da torre/.test(g3.toast) && !g3.lockedEarly && g3.bossId === 'vernet' && g3.bossSt === 'dormant' && g3.lights <= 16, JSON.stringify(g3));
  await page.screenshot({ path: SHOTS + 'c8-topo.png' });
  const m3 = await probe();
  check('Trilha: exploração do Cap. 8 (frígio dominante) toca de verdade — notas agendadas em tempo real e sinal no analisador',
    m3.ctx === 'running' && /^(explore|tension):c8$/.test(m3.key) && m3.theme === 'c8' && m3.notes >= 3 && m3.rms > 0.0005, JSON.stringify(m3));

  // ---------- Vernet: intro, vapor, ampola, fases → transformação ----------
  const g4 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    T.tp(13, 13.5, 77.6, 0); T.run(0.1); out.cs = T.cs();
    out.musIntro = g.syncMusic()?.key;
    out.csT = T.until(() => !g.cutscene, 30);
    out.mus1 = g.syncMusic()?.key;
    const b = g.boss; out.active = g.script.bossActive; out.bst = b.state;
    // pt47u: modelo procedural do Vernet (luvas, bigode, colete, corrente e relógio, cauda da sobrecasaca, bengala)
    out.vModel = { det: Object.keys(b.details || {}), hands: b.rig.parts?.hands?.length, stache: !!b.rig.root.getObjectByName('bigode'), tail: !!b.coatTail }; out.locked = !!L.liftLocked; out.intro = q.has('c8_vernetIntro');
    out.hud = document.getElementById('bossName')?.textContent || '';
    T.tp(13, 13.5, 77.6, Math.PI); out.lift = T.interactAt('c8_lift_a'); out.liftT = T.last();
    // vapor: Vernet longe, gira o registro oeste (segurar), depois atrai Vernet ao jato
    T.heal(); b.pos.set(19, 13.5, 86); b.state = 'stunned'; b.stunDur = 3; b.stateT = 0;
    T.tp(4.9, 13.5, 73.9, Math.PI); out.steam = T.interactAt('c8_steam_W'); out.hold = !!g.script.tw.hold;
    out.tSteam = T.until(() => !g.script.tw.hold, 4);
    out.charged = g.level.tower.valves.W.charge; const hp0 = b.hp;
    b.pos.set(6.6, 13.5, 76.6); b._set('idle');
    T.tp(4.9, 13.5, 72.6, 0);
    out.tHit = T.until(() => b.state === 'stunned', 3); out.vHit = Math.round(hp0 - b.hp); out.steamHits = b.steamHits;
    // de novo antes de recarregar: o registro recusa
    out.again = T.interactAt('c8_steam_W'); out.againT = T.last();
    // a ampola nas costas: golpes no ponto fraco; o casaco quase não sente o resto
    const hp1 = b.hp; b._set('idle'); b.takeHit({ dmg: 30, from: g.player.pos, volume: { part: 'body' } }); out.bodyDmg = Math.round(hp1 - b.hp);
    let n = 0; while (b.alive && n < 40) { b.stunDur = 5; b.state = 'stunned'; T.weak(b, 30); n++; if (b.phase === 2 && out.p2 === undefined) { out.p2 = n; out.mus2 = g.syncMusic()?.key; } }
    out.n = n; out.phase = b.phase; out.vSt = b.state;
    T.run(0.1); out.cs2 = T.cs(); out.vdown = q.has('c8_vernetDown'); out.musCs = g.syncMusic()?.key;
    out.csT2 = T.until(() => !g.cutscene, 30); out.musM = g.syncMusic()?.key;
    const m = g.boss; out.mId = m.id; out.mSt = m.state; out.cp = T.S().checkpoint; out.mActive = g.script.bossActive; out.locked2 = !!L.liftLocked;
    out.hud2 = document.getElementById('bossName')?.textContent || ''; out.vRig = b.rig.root.visible;
    out.hp = g.player.hp; out.lights = T.lights();
    return out;
  });
  check('Cap. 8 Vernet: intro na Sala dos Transmissores, porta do monta-cargas trava, registro de vapor (segurar) escalda e atordoa, ampola nas costas é o ponto fraco, fases',
    g4.cs === 'c8_vernet' && g4.csT > 5 && g4.active && g4.intro && g4.locked && /VERNET/.test(g4.hud) && /travad/.test(g4.liftT) && g4.steam === 'ok' && g4.hold && g4.tSteam > 1.3
    && g4.tHit > 0 && g4.vHit >= 20 && g4.steamHits === 1 && /recarregar/.test(g4.againT) && g4.bodyDmg <= 10 && g4.p2 > 0 && g4.n < 40, JSON.stringify(g4));
  check('Modelos (pt47u): Vernet com luvas, bigode, colete/corrente/relógio e cauda da sobrecasaca',
    ['stache', 'vest', 'chain', 'watch', 'gloves'].every((k) => g4.vModel.det.includes(k)) && g4.vModel.hands === 2 && g4.vModel.stache && g4.vModel.tail, JSON.stringify(g4.vModel));
  const mdl = await page.evaluate(() => {
    const g = __ocdc, L = g.level, m = g.boss;
    return { he: Object.keys(L.helena.rig.detail || {}), ine: Object.keys(L.ines.rig.detail || {}), heGlasses: !!L.helena.rig.detail?.glasses, heFace: !!L.helena.rig.parts?.face, heHands: L.helena.rig.parts?.hands?.length,
      m: m?.id, mDet: m?.details, crown: !!m?.rig.root.getObjectByName('coroa'), veinOp: m?.veinMat?.opacity, coreNoShadow: !!m?.coreLight?.userData.noShadow };
  });
  check('Modelos (pt47u): Helena (óculos, coque, estetoscópio, botões), Inês (tranças com fita, gola, saia) e Manifestação (coroa de cinza, garras, veias de brasa pulsando)',
    ['glasses', 'bun', 'stethoscope', 'buttons'].every((k) => mdl.he.includes(k)) && mdl.heGlasses && mdl.heFace && mdl.heHands === 2 && ['braids', 'ribbon', 'collar', 'skirt'].every((k) => mdl.ine.includes(k))
    && mdl.m === 'manifestacao' && mdl.mDet.crown >= 6 && mdl.mDet.claws === 8 && mdl.mDet.veins >= 10 && mdl.crown && mdl.veinOp > 0 && mdl.coreNoShadow, JSON.stringify(mdl));
  check('Cap. 8 Vernet cai → cutscene da transformação → Manifestação da Primeira Cinza ativa (save c8_arena), elevador travado',
    g4.vSt === 'dead' && g4.cs2 === 'c8_transform' && g4.vdown && g4.csT2 > 5 && g4.mId === 'manifestacao' && g4.mActive && g4.mSt !== 'dormant' && g4.cp === 'c8_arena' && g4.locked2 && /MANIFESTA/.test(g4.hud2) && !g4.vRig && g4.lights <= 16, JSON.stringify(g4));
  await page.screenshot({ path: SHOTS + 'c8-manifestacao.png' });
  check('Trilha: valsa de Vernet (3/4) entra com a luta e acelera na fase 2; a transformação troca o tema; a Manifestação tem o seu',
    g4.musIntro === 'cutscene:vernet' && g4.mus1 === 'boss:vernet:1' && g4.mus2 === 'boss:vernet:2' && /^cutscene:/.test(g4.musCs) && g4.musM === 'boss:manifestacao:1', JSON.stringify({ i: g4.musIntro, a: g4.mus1, b: g4.mus2, cs: g4.musCs, m: g4.musM }));
  const m4 = await probe();
  check('Trilha: tema da Manifestação toca em tempo real (baixo e pad/coro agendados, sinal no analisador)',
    m4.key === 'boss:manifestacao:1' && m4.notes >= 4 && m4.bass >= 1 && m4.rms > 0.0005, JSON.stringify(m4));

  // ---------- Manifestação: piso de vida pelas bobinas, disjuntores, fase cega, núcleo ----------
  const g5 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {}, m = g.boss;
    out.phase0 = m.phase; out.live0 = m.liveCoils();
    // enquanto as bobinas vivem, o núcleo se refaz (piso de vida)
    let k = 0; while (k < 30) { m.state = 'stunned'; m.stunDur = 5; T.weak(m, 40); k++; } out.floorHp = Math.round(m.hp); out.alive0 = m.alive;
    out.floorHeld = m.seen.floorHeld > 0;
    // soltar o disjuntor no meio (sair do lugar) cancela
    const away = () => { m.pos.set(20, 13.5, 70.5); m.state = 'stunned'; m.stunDur = 4; m.stateT = 0; };
    T.heal(); away();
    T.tp(4.6, 13.5, 81.5, -Math.PI / 2); out.b1 = T.interactAt('c8_breaker_W'); T.run(0.5); T.tp(7, 13.5, 81.5); T.run(0.1); out.cancel = !g.script.tw.hold && L.tower.coils.W.live; out.cancelT = T.last();
    const cut = (id, x, z, yaw) => { T.heal(); away(); T.tp(x, 13.5, z, yaw); const r = T.interactAt('c8_breaker_' + id); const t = T.until(() => !g.script.tw.hold, 4); return { r, t, live: L.tower.coils[id].live, ph: m.phase, st: m.state, toast: T.last(), mus: g.syncMusic()?.key }; };
    out.W = cut('W', 4.6, 81.5, -Math.PI / 2);
    out.E = cut('E', 21.4, 81.5, Math.PI / 2);
    out.N = cut('N', 18.2, 86.4, 0);
    out.live1 = m.liveCoils(); out.phase3 = m.phase; out.blindToast = window.__toasts.some((t) => /SOM/.test(t));
    out.musP2 = out.W.mus; const cu = g.syncMusic(); out.musP3 = cu?.key; out.perc3 = cu?.perc; out.lead3 = cu?.mix.lead;
    return out;
  });
  const m5 = await probe(2400);
  Object.assign(g5, await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {}, m = g.boss;
    T.heal();
    let n = 0; while (m.alive && n < 60) { m.state = 'stunned'; m.stunDur = 5; T.weak(m, 40); n++; }
    out.n = n; out.mSt = m.state;
    T.run(0.2);
    out.dead = q.has('c8_cinzaDead'); out.cp = T.S().checkpoint; out.active = g.script.bossActive; out.unlocked = !L.liftLocked;
    out.coilsOff = ['W', 'E', 'N'].every((id) => !L.tower.coils[id].live); out.toast = T.last(); out.obj = q.current(); out.lights = T.lights();
    out.musAfter = g.syncMusic()?.key;
    return out;
  }));
  check('Trilha: fase cega da Manifestação — só batimento cardíaco, sem melodia (o jogador precisa ouvir); morta, o tema do chefe sai',
    g5.musP2 === 'boss:manifestacao:2' && g5.musP3 === 'boss:manifestacao:3' && /^H\.+H\.+$/.test(g5.perc3 || '') && g5.lead3 === 0
    && m5.key === 'boss:manifestacao:3' && m5.lead === 0 && (m5.kinds.H || 0) >= 1 && Object.keys(m5.kinds).every((k) => k === 'H') && m5.rms > 0.0002 && !/^boss:/.test(g5.musAfter || ''),
    JSON.stringify({ p2: g5.musP2, p3: g5.musP3, perc: g5.perc3, lead: g5.lead3, after: g5.musAfter, m5 }));
  check('Cap. 8 Manifestação: bobinas vivas seguram um piso de vida; soltar o disjuntor cancela; 3 disjuntores (segurar) atordoam e mudam as fases até a fase cega',
    g5.phase0 === 1 && g5.live0 === 3 && g5.alive0 && g5.floorHeld && g5.floorHp > 400 && g5.b1 === 'ok' && g5.cancel && /soltou/.test(g5.cancelT)
    && g5.W.r === 'ok' && !g5.W.live && g5.W.ph === 2 && g5.E.r === 'ok' && !g5.E.live && g5.N.r === 'ok' && !g5.N.live && g5.live1 === 0 && g5.phase3 === 3 && g5.blindToast, JSON.stringify(g5));
  check('Cap. 8 Manifestação cai pelo núcleo → a Primeira Cinza desaba (save c8_free), bobinas mortas, monta-cargas destrava, objetivo Inês',
    g5.mSt === 'dead' && g5.n < 60 && g5.dead && g5.cp === 'c8_free' && !g5.active && g5.unlocked && g5.coilsOff && /cinza fria/.test(g5.toast) && /Inês/.test(g5.obj) && g5.lights <= 16, JSON.stringify(g5));

  // ---------- Inês (segurar), a viagem de Helena, a verdade ----------
  const g6 = await page.evaluate(() => {
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    T.tp(11.2, 13.5, 83.6, -Math.PI / 4); out.ines = T.interactAt('c8_ines'); out.hold = !!g.script.tw.hold;
    out.tH = T.until(() => !!g.cutscene, 4); out.cs = T.cs(); out.csT = T.until(() => !g.cutscene, 20);
    out.free = q.has('c8_inesFree'); out.trip = g.script.tw.trip; out.iMode = L.ines.mode;
    out.tDown = T.until(() => L.lift.stop === 'maq', 20); out.locked = !!L.liftLocked;
    out.tUp = T.until(() => L.lift.stop === 'topo' && g.script.tw.trip === 'out', 20); out.ride = !!L.helena.ride;
    out.tWalk = T.until(() => !!g.cutscene, 30); out.cs2 = T.cs(); out.hPos = [L.helena.pos.x, L.helena.pos.z].map((v) => +v.toFixed(1));
    out.csT2 = T.until(() => !g.cutscene, 40);
    out.up = q.has('c8_helenaUp'); out.choice = q.has('c8_choice'); out.cp = T.S().checkpoint; out.obj = q.current(); out.unlocked = !L.liftLocked;
    out.bulbAlive = g.targets().some((t) => t.id === 'c8_bulb');
    T.tp(21.9, 13.5, 77.4, Math.PI / 2); out.rel = T.interactAt('doc_relatorio_transmissao'); T.run(0.1); out.readRel = q.has('c8_readRelatorio');
    out.raw = localStorage.getItem('ocdc_save');
    return out;
  });
  check('Cap. 8: relatório de transmissão na sala; soltar Inês (segurar) → cutscene; o monta-cargas desce sozinho, Helena sobe nele, anda até a lâmpada e conta a verdade (RN 0) → a decisão (save c8_free)',
    g6.ines === 'ok' && g6.hold && g6.tH > 1.6 && g6.cs === 'c8_ines' && g6.free && g6.trip === 'wait' && g6.iMode === 'stand' && g6.tDown > 0 && g6.tUp > 0 && g6.cs2 === 'c8_truth'
    && Math.hypot(g6.hPos[0] - 15.6, g6.hPos[1] - 84) < 0.6 && g6.up && g6.choice && g6.cp === 'c8_free' && /Decida/.test(g6.obj) && g6.unlocked && g6.bulbAlive && g6.rel === 'ok' && g6.readRel, JSON.stringify({ ...g6, raw: undefined }));
  const freeRaw = g6.raw;

  // ---------- final 1: segurar a chama (guardião) → tela de fim → créditos ----------
  const g7 = await page.evaluate(() => {
    const g = __ocdc, q = g.quest, out = {};
    g.player.hp = g.player.maxHp; out.hp0 = g.player.hp;
    T.tp(13, 13.5, 85.1, 0); out.flame = T.interactAt('c8_flame'); out.hold = !!g.script.tw.hold;
    T.run(2); out.hpMid = g.player.hp;
    out.tCs = T.until(() => !!g.cutscene, 4); out.cs = T.cs(); out.ending = q.flags.c8_ending;
    out.csT = T.until(() => g.state !== 'cutscene', 30);
    out.st = g.state; out.cp = T.S().checkpoint; out.done = q.has('c8_chapterDone') && q.has('ch8Done'); out.hpEnd = g.player.hp;
    const vis = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none'; };
    out.endVis = vis('chapterEnd'); out.title = document.getElementById('endTitle').textContent; out.text = document.getElementById('endText').textContent;
    out.epi = document.querySelectorAll('#endRn0 .epilogue-line').length; out.stats = document.getElementById('stats').textContent;
    out.next = vis('btnEndNext'); out.cred = vis('btnEndCredits'); out.musEnd = g.syncMusic()?.key;
    document.getElementById('btnEndCredits').click();
    out.musCred = g.syncMusic()?.key;
    out.credVis = vis('credits'); out.credN = document.querySelectorAll('#creditsList .credit').length; out.credTxt = document.getElementById('creditsList').textContent;
    document.getElementById('btnCreditsBack').click(); out.back = vis('chapterEnd') && !vis('credits'); out.musBack = g.syncMusic()?.key;
    return out;
  });
  check('Cap. 8 final "guardião": segurar a chama 4 s drena vida → cutscene → fim do jogo (save c8_end), tela de fim com título, epílogo e estatísticas',
    g7.flame === 'ok' && g7.hold && g7.hpMid < g7.hp0 && g7.hpMid >= 8 && g7.cs === 'c8_end_guardiao' && g7.ending === 'guardiao' && g7.cp === 'c8_end' && g7.done && g7.st === 'end'
    && g7.endVis && /Fim/.test(g7.title) && /Guardi/.test(g7.text) && g7.epi >= 2 && /Diário de Helena: lido/.test(g7.stats) && /Final: O Guardi/.test(g7.stats) && /Relatório de transmissão: lido/.test(g7.stats), JSON.stringify(g7));
  check('Cap. 8: créditos a partir da tela de fim (sem "Próximo capítulo"), com o final alcançado, e voltar',
    !g7.next && g7.cred && g7.credVis && g7.credN >= 5 && /Guardi/.test(g7.credTxt) && g7.back, JSON.stringify({ next: g7.next, cred: g7.cred, credVis: g7.credVis, n: g7.credN, back: g7.back }));
  await page.screenshot({ path: SHOTS + 'c8-fim.png' });
  const m7 = await probe(2000);
  check('Trilha: o final "guardião" toca a canção de ninar de Inês em maior; créditos têm tema próprio e voltar restaura o do final',
    g7.musEnd === 'end:guardiao' && g7.musCred === 'credits' && g7.musBack === 'end:guardiao' && m7.key === 'end:guardiao' && m7.theme === 'end_guardiao' && m7.lead >= 2 && m7.rms > 0.0005,
    JSON.stringify({ e: g7.musEnd, c: g7.musCred, b: g7.musBack, m7 }));

  // ---------- Continuar num save c8_end abre a tela de fim ----------
  const reload = async (raw) => {
    if (raw) await page.evaluate((r) => localStorage.setItem('ocdc_save', r), raw);
    await page.reload({ waitUntil: 'networkidle0' });
    await inject(); await ext(); await tools();
    await page.evaluate(() => { window.__toasts = []; document.getElementById('btnContinue').click(); });
    await ext(); await tools();
  };
  // menu: recarregar a página e só clicar no fundo (gesto real) — o tema do menu começa antes de qualquer botão
  await page.reload({ waitUntil: 'networkidle0' });
  await page.mouse.click(8, 8);
  const m8 = await probe(1800);
  const sl = await page.evaluate(() => {
    const el = document.getElementById('optMusic'); el.value = '0.3'; el.dispatchEvent(new Event('input'));
    const s = JSON.parse(localStorage.getItem('ocdc_settings_v1') || '{}');
    const out = { vol: __ocdc.audio.musicVolume, saved: s.musicVolume, label: document.getElementById('optMusicV').textContent };
    el.value = '0.6'; el.dispatchEvent(new Event('input')); return out;
  });
  check('Trilha: menu toca a canção de ninar após o primeiro gesto; opção "Música" ajusta e persiste o volume da trilha',
    m8.ctx === 'running' && m8.key === 'menu' && m8.notes >= 3 && m8.rms > 0.0005 && sl.vol === 0.3 && sl.saved === 0.3 && sl.label === '30%', JSON.stringify({ m8, sl }));
  await reload(null);
  const g8 = await page.evaluate(() => {
    const g = __ocdc; const el = document.getElementById('chapterEnd');
    return { st: g.state, vis: !el.classList.contains('hidden'), title: document.getElementById('endTitle').textContent, text: document.getElementById('endText').textContent };
  });
  check('Cap. 8: Continuar num save c8_end reabre a tela de fim com o final escolhido', g8.st === 'end' && g8.vis && /Fim/.test(g8.title) && /Guardi/.test(g8.text), JSON.stringify(g8));

  // ---------- final 2: entregar a Helena (herdeira), a partir do save da decisão ----------
  await reload(freeRaw);
  const g9 = await page.evaluate(() => {
    T.run(0.3);
    const g = __ocdc, L = g.level, q = g.quest, out = {};
    out.st = g.state; out.choice = q.has('c8_choice'); out.toast = window.__toasts.join(' | '); out.bulb = L.tower.bulb.flame.visible; out.hMode = L.helena.mode;
    out.hPos = [L.helena.pos.x, L.helena.pos.z].map((v) => +v.toFixed(1)); out.inesFree = L.ines.mode === 'stand'; out.boss = g.boss ? g.boss.state : null;
    out.coils = ['W', 'E', 'N'].every((id) => !L.tower.coils[id].live); out.lock = !!L.liftLocked; out.stop = L.lift.stop; out.lights = T.lights();
    T.tp(14.4, 13.5, 83.2, Math.PI / 4); out.give = T.interactAt('c8_helena_give'); out.cs = T.cs();
    T.until(() => g.state !== 'cutscene', 30);
    out.end = g.state; out.ending = q.flags.c8_ending; out.text = document.getElementById('endText').textContent;
    out.epi = [...document.querySelectorAll('#endRn0 .epilogue-line')].map((e) => e.textContent).join(' ');
    return out;
  });
  check('Cap. 8: recarregar c8_free (decisão) restaura Inês livre, Helena junto à lâmpada, bobinas mortas e a brasa; final "herdeira" (entregar a Helena)',
    g9.st === 'playing' && g9.choice && /Transmissores/.test(g9.toast) && g9.bulb && !/sit/.test(g9.hMode) && Math.hypot(g9.hPos[0] - 15.6, g9.hPos[1] - 84) < 0.8 && g9.inesFree && g9.coils && !g9.lock && g9.stop === 'topo'
    && g9.give === 'ok' && g9.cs === 'c8_end_herdeira' && g9.end === 'end' && g9.ending === 'herdeira' && /Herdeira/i.test(g9.text) && g9.epi.length > 40 && g9.lights <= 16, JSON.stringify(g9));

  // ---------- final 3: quebrar a lâmpada (cinzas) com golpes reais do machado ----------
  await reload(freeRaw);
  const g10 = await page.evaluate(() => {
    T.run(0.3);
    const g = __ocdc, q = g.quest, out = {};
    out.w = g.player.weapon?.id || g.inventory.weapon;
    let hits = 0;
    for (let i = 0; i < 10 && !g.cutscene; i++) { T.heal(); T.tp(13, 13.5, 85.0, 0); g.cameraCtl.pitch = -0.1; T.press('Mouse0'); T.run(1.0); hits = i + 1; }
    out.hits = hits; out.cs = T.cs(); out.toasts = window.__toasts.filter((t) => /vidro/i.test(t)).length;
    T.until(() => g.state !== 'cutscene', 30);
    out.end = g.state; out.ending = q.flags.c8_ending; out.text = document.getElementById('endText').textContent;
    out.gone = g.level.tower.bulb.gone; out.epi = document.getElementById('endRn0').textContent;
    return out;
  });
  check('Cap. 8: final "cinzas" — golpes reais do machado trincam e quebram a lâmpada → cutscene → tela de fim',
    g10.cs === 'c8_end_cinzas' && g10.hits <= 8 && g10.toasts >= 1 && g10.end === 'end' && g10.ending === 'cinzas' && /Cinzas/i.test(g10.text) && g10.gone && /Valeu a pena/.test(g10.epi) /* o relatório foi lido depois do save c8_free: o eco do epílogo é o outro */, JSON.stringify(g10));

  return { freeRaw };
}
