// Teste de fumaça em Chromium headless (puppeteer-core): carrega o build, inicia o jogo e
// percorre o capítulo pelos sistemas reais (via window.__ocdc), validando colisão, portas,
// combate, quebra-cabeça, elevador, chefe, save e fim de capítulo. Gera screenshots em tests/e2e/shots.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const PORT = 4179;
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) res(); });
  server.on('exit', () => rej(new Error('preview saiu')));
  setTimeout(() => rej(new Error('timeout do preview')), 20000);
});

const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? '✔' : '✘'} ${name}${info ? ' — ' + info : ''}`); };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  check('menu visível', await page.$eval('#menu', (e) => !e.classList.contains('hidden')));
  check('"Continuar" oculto sem save', await page.$eval('#btnContinue', (e) => e.classList.contains('hidden')));
  await page.screenshot({ path: SHOTS + '01-menu.png' });

  await page.click('#btnNew');
  await new Promise((r) => setTimeout(r, 1500));
  const st = await page.evaluate(() => ({ state: __ocdc.state, pos: __ocdc.player.pos.toArray(), hud: !document.getElementById('hud').classList.contains('hidden') }));
  check('novo jogo iniciado', st.state === 'playing' && st.hud, JSON.stringify(st));
  check('autosave inicial criado', await page.evaluate(() => !!localStorage.getItem('ocdc_save')));
  await page.screenshot({ path: SHOTS + '02-enfermaria.png' });

  // utilitários executados no contexto da página (reinjetados após reload)
  const inject = () => page.evaluate(() => {
    const g = window.__ocdc;
    window.T = {
      run(sec) { for (let i = 0; i < sec * 60; i++) { g.step(1 / 60); g._updateCamera(1 / 60); } },
      tp(x, y, z, yaw) { g.player.spawn({ x, y, z }, yaw ?? g.player.yaw); g.cameraCtl.yaw = yaw ?? g.cameraCtl.yaw; },
      hold(code, sec) { g.input.down.add(code); g.input.pressed.add(code); T.run(sec); g.input.down.delete(code); },
      press(code) { g.input.pressed.add(code); g.step(1 / 60); g.input.endFrame(); },
      interact(id) { const it = g.interact.list.find((i) => i.id === id); if (!it) throw new Error('sem ' + id); T.tp(it.pos.x - Math.sin(g.player.yaw) * 0.6, g.player.pos.y, it.pos.z - Math.cos(g.player.yaw) * 0.6); g.step(1 / 60); const cur = g.currentInteractable; if (!cur || cur.id !== id) return 'interagível não focado: ' + (cur && cur.id); g.tryInteract(); return 'ok'; },
      // mira o jogador para um ponto e interage com o objeto mais próximo
      interactAt(id) {
        const it = g.interact.list.find((i) => i.id === id);
        const p = g.player.pos;
        const yaw = Math.atan2(it.pos.x - p.x, it.pos.z - p.z);
        g.player.yaw = yaw; g.step(1 / 60);
        const cur = g.currentInteractable; if (!cur || cur.id !== id) return 'focado: ' + (cur && cur.id);
        g.tryInteract(); if (g.state === 'reading') g.closeOverlay(); return 'ok';
      },
    };
  });
  await inject();

  const locks0 = await page.evaluate(() => { const D = __ocdc.level.doors; return { east: D.eastWard.locked, morgue: D.morgue.locked, cold: D.coldRoom.locked, landing: D.eastLanding.locked }; });
  check('Ala Leste, necrotério e câmara fria começam trancados', locks0.east && locks0.morgue && locks0.cold && locks0.landing, JSON.stringify(locks0));
  // --- Colisão: andar contra a parede oeste da enfermaria
  const col = await page.evaluate(() => { const g = __ocdc; T.tp(0.8, 0, 6, -Math.PI / 2); g.cameraCtl.yaw = -Math.PI / 2; T.hold('KeyW', 2); return g.player.pos.x; });
  check('colisão com parede (x ≥ raio)', col >= 0.3 && col < 0.6, 'x=' + col.toFixed(3));
  // --- Porta fechada bloqueia; aberta deixa passar
  const door = await page.evaluate(() => {
    const g = __ocdc; T.tp(6, 0, 8.6, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 1.5);
    const blocked = g.player.pos.z;
    T.tp(6, 0, 8.6, 0); const r = T.interactAt('door_ward'); T.run(0.7);
    T.tp(5.6, 0, 8.6, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 2.5);
    return { blocked, after: g.player.pos.z, r, open: g.level.doors.ward.open };
  });
  check('porta fechada bloqueia', door.blocked < 9.85, 'z=' + door.blocked.toFixed(2));
  check('porta aberta permite passagem', door.open && door.after > 10.3, JSON.stringify(door));
  // --- Machado
  const axe = await page.evaluate(() => { const g = __ocdc; T.tp(4.1, 0, 8.7, 0); const r = T.interactAt('pick_axe'); return { r, w: !!g.player.weapon, flag: g.quest.has('hasAxe') }; });
  check('machado coletado e equipado', axe.w && axe.flag, JSON.stringify(axe));
  // --- Combate: matar o Interno do corredor com golpes reais (hitbox varrida)
  const fight = await page.evaluate(() => {
    const g = __ocdc; const e = g.enemies.find((x) => x.id === 'int_cor');
    g.player.hp = 100;
    T.tp(e.pos.x - 1.3, 0, e.pos.z, Math.PI / 2); g.cameraCtl.yaw = Math.PI / 2;
    let swings = 0; const hp0 = e.hp;
    for (let i = 0; i < 40 && e.alive; i++) {
      g.player.yaw = Math.atan2(e.pos.x - g.player.pos.x, e.pos.z - g.player.pos.z);
      g.player.hp = Math.max(g.player.hp, 60);
      if (g.player.state === 'grabbed') { for (let k = 0; k < 20; k++) T.press('Mouse0'); }
      T.press('Mouse0'); swings++; T.run(0.7);
    }
    return { alive: e.alive, hp0, hp: e.hp, swings, kills: g.player.stats.kills };
  });
  check('Interno morto por golpes do machado', !fight.alive && fight.kills >= 1, JSON.stringify(fight));
  await page.screenshot({ path: SHOTS + '03-corredor.png' });
  // --- Enfermeiro: percepção (vê o jogador) e morte
  const nurse = await page.evaluate(() => {
    const g = __ocdc; const e = g.enemies.find((x) => x.id === 'enf_lh');
    // posiciona diante dele no subsolo
    T.tp(e.pos.x + Math.sin(e.yaw) * 4, -5, e.pos.z + Math.cos(e.yaw) * 4, e.yaw + Math.PI);
    T.run(1.2);
    const st = e.state;
    let n = 0;
    for (; n < 60 && e.alive; n++) {
      g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 20; k++) T.press('Mouse0');
      g.player.yaw = Math.atan2(e.pos.x - g.player.pos.x, e.pos.z - g.player.pos.z);
      T.press(n % 3 === 2 ? 'Mouse2' : 'Mouse0'); T.run(0.8);
    }
    return { sawState: st, alive: e.alive, n };
  });
  check('Enfermeiro percebe o jogador', ['chase', 'attack', 'investigate'].includes(nurse.sawState), nurse.sawState);
  check('Enfermeiro morto', !nurse.alive, JSON.stringify(nurse));
  // --- Quebra-cabeça elétrico
  const puzzle = await page.evaluate(() => {
    const g = __ocdc; const out = {};
    g.enemies.forEach((e) => { if (e.alive && e.pos.y > -1 && !e.id.endsWith('_east')) e.setDeadInstant(); });
    T.tp(19, 0, 20.3, 0); out.fuse = T.interactAt('pick_fuse');
    T.tp(36.6, 0, 16, Math.PI / 2); out.panel = T.interactAt('fusepanel');
    T.tp(36.7, 0, 18, Math.PI / 2); out.wrong = T.interactAt('breaker0'); out.afterWrong = g.script.breakerSeq.length; g.player.hp = 100; T.run(1);
    for (const i of [1, 2, 0]) { T.tp(36.7, 0, 18 + i, Math.PI / 2); T.run(0.1); out['b' + i] = T.interactAt('breaker' + i); }
    out.ok = g.quest.has('breakersOk');
    T.tp(36.5, 0, 22.05, Math.PI / 2); out.lever = T.interactAt('lever');
    out.power = g.quest.has('power');
    return out;
  });
  check('ordem errada reinicia disjuntores', puzzle.afterWrong === 0, JSON.stringify(puzzle));
  check('energia restaurada (fusível + II→III→I + alavanca)', puzzle.power, JSON.stringify(puzzle));
  // --- Elevador
  const elev = await page.evaluate(() => {
    const g = __ocdc; const E = g.level.elevator;
    T.tp(38.6, 0, 12.6, Math.PI / 2); const c = T.interactAt('call_upper'); T.run(1);
    const openU = g.level.doors.elevUp.open;
    T.tp(42, 0, 12, Math.PI / 2); T.run(0.2); const r = T.interactAt('elev_panel');
    T.run(6);
    return { c, openU, r, y: E.y, py: g.player.pos.y, level: E.level, lower: g.quest.has('reachedLower'), openL: g.level.doors.elevLo.open };
  });
  check('elevador desce ao subsolo com o jogador', elev.level === 'lower' && elev.py < -4.5 && elev.lower, JSON.stringify(elev));
  // --- Atalho: subir a escada e destrancar a porta lateral
  const sc = await page.evaluate(() => {
    const g = __ocdc; T.tp(14, -5, 11.5, Math.PI); g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 6);
    const yTop = g.player.pos.y; const z = g.player.pos.z;
    T.tp(12.8, 0, -1.5, -Math.PI / 2); const r = T.interactAt('door_shortcut');
    return { yTop, z, r, unlocked: !g.level.doors.shortcut.locked, open: g.level.doors.shortcut.open };
  });
  check('escada sobe ao térreo', sc.yTop > -0.2, JSON.stringify(sc));
  check('atalho destrancado por dentro', sc.unlocked && sc.open, JSON.stringify(sc));
  // --- Ala Leste: porta liberada pela energia, atalho para o patamar, chave e prontuário
  const east = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {};
    out.unlockedByPower = !D.eastWard.locked;
    T.tp(24, 0, 11.3, Math.PI); out.door = T.interactAt('door_eastWard'); T.run(0.8);
    g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 1.4); out.z = g.player.pos.z; T.run(0.1);
    out.entered = g.quest.has('enteredEast');
    g.enemies.forEach((e) => { if (e.alive && e.id === 'enf_east') e.setDeadInstant(); });
    T.tp(17.2, 0, -1.5, -Math.PI / 2); out.landing = T.interactAt('door_eastLanding');
    out.landingOpen = D.eastLanding.open && g.quest.has('eastShortcutOpen');
    const w = g.enemies.find((e) => e.id === 'int_east'); out.dormantBefore = w.dormant;
    T.tp(33.2, 0, -1.3, Math.PI); out.key = T.interactAt('pick_morgue_key');
    out.hasKey = g.inventory.has('chave_necroterio'); out.wokeIso = !w.dormant;
    w.setDeadInstant(); g.player.hp = 100;
    T.tp(29.2, 0, -1.4, Math.PI); out.doc = T.interactAt('doc_prontuario_leste'); T.run(0.1);
    out.chart = g.quest.has('readEastChart');
    T.tp(34.6, 0, -1.4, Math.PI); out.book = T.interactAt('book_east'); out.cp = g.checkpoint;
    return out;
  });
  check('energia libera a porta da Ala Leste', east.unlockedByPower && east.door === 'ok' && east.z < 9.6 && east.entered, JSON.stringify(east));
  check('atalho Ala Leste → patamar destrancado por dentro', east.landing === 'ok' && east.landingOpen, JSON.stringify(east));
  check('chave do necrotério coletada (acorda o isolado)', east.hasKey && east.dormantBefore && east.wokeIso, JSON.stringify(east));
  check('prontuário lido e livro de registro da Ala Leste', east.chart && east.cp === 'east_ward', JSON.stringify(east));
  await page.screenshot({ path: SHOTS + '05-ala-leste.png' });
  // --- Necrotério: chave, gavetas, Rastejador, câmara fria secreta
  const morgue = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {};
    g.player.hp = 100;
    T.tp(20, -5, 11.3, Math.PI); out.door = T.interactAt('door_morgue'); T.run(0.8);
    out.open = D.morgue.open && !D.morgue.locked; out.keyUsed = !g.inventory.has('chave_necroterio');
    g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 1.2); T.run(0.1);
    out.entered = g.quest.has('enteredMorgue'); out.cp = g.checkpoint;
    const im = g.enemies.find((e) => e.id === 'int_morgue'); im.setDeadInstant();
    const c = g.enemies.find((e) => e.id === 'ras_morgue'); out.crawlerDormant = c.dormant;
    const sl = g.level.drawerSlots[13];
    T.tp(sl.x, -5, 1.7, Math.PI); out.d13 = T.interactAt('drawer_13'); T.run(0.8);
    out.d13open = g.level.drawers[13].open; out.crawlerWoke = !c.dormant;
    out.coldBefore = D.coldRoom.locked;
    const aim = () => { T.tp(c.pos.x - 1.1, -5, c.pos.z + 0.6, 0); const y = Math.atan2(c.pos.x - g.player.pos.x, c.pos.z - g.player.pos.z); g.player.yaw = y; g.cameraCtl.yaw = y; };
    // golpe leve (horizontal) passa por cima do Rastejador
    g.player.hp = 100; aim(); const hpL = c.hp; T.press('Mouse0'); T.run(0.9); out.lightDmg = hpL - c.hp;
    // Rastejador: golpes fortes (de cima para baixo)
    let swings = 0; const hp0 = c.hp;
    for (let i = 0; i < 40 && c.alive; i++) {
      aim();
      g.player.hp = 100; if (g.player.state === 'grabbed') { for (let k = 0; k < 20; k++) T.press('Mouse0'); }
      // como um jogador faria: espera a garra passar (fora do alcance) e golpeia na recuperação
      for (let k = 0; k < 120 && c.alive && (c.state === 'attack' || c.state === 'grabbing' || g.player.state !== 'free'); k++) { T.tp(c.pos.x - 2.6, -5, c.pos.z + 1.2, 0); T.run(1 / 60); g.player.hp = 100; }
      aim(); T.press('Mouse2'); swings++; T.run(1.1);
    }
    out.crawler = { alive: c.alive, hp0, hp: c.hp, swings };
    g.player.hp = 100;
    T.tp(sl.x, -5, 1.7, Math.PI); out.push = T.interactAt('drawer_13'); T.run(1.5);
    out.coldOpen = D.coldRoom.open && g.quest.has('coldRoomOpen');
    // a câmara fria é alcançável pela navegação e pelo corpo do jogador
    T.tp(21.5, -5, 0.9, Math.PI); g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 1.2); out.coldZ = g.player.pos.z;
    const b0 = g.inventory.items.bandagem || 0;
    T.tp(23.3, -5, -1.5, Math.PI); out.band = T.interactAt('pick_band_cold');
    T.tp(22.6, -5, -1.55, Math.PI); out.letter = T.interactAt('doc_carta_helena');
    out.bandGain = (g.inventory.items.bandagem || 0) - b0; out.hasLetter = g.inventory.documents.includes('carta_helena');
    const s20 = g.level.drawerSlots[20];
    T.tp(s20.x, -5, 2.0, Math.PI); out.hidden20 = T.interactAt('pick_band_morgue') !== 'ok';
    out.d20 = T.interactAt('drawer_20'); T.run(1); out.band20 = T.interactAt('pick_band_morgue');
    T.tp(16.8, -5, 3.1, Math.PI); out.reg = T.interactAt('doc_registro_necroterio');
    g.saveGame('morgue');
    const sv = JSON.parse(localStorage.getItem('ocdc_save'));
    out.saved = { cold: sv.doors.coldRoom, morgue: sv.doors.morgue, d13: sv.flags.drawer_13, docs: sv.documents?.length };
    return out;
  });
  check('chave abre o necrotério e autosave na entrada', morgue.door === 'ok' && morgue.open && morgue.keyUsed && morgue.entered, JSON.stringify(morgue));
  check('gaveta rangendo desperta o Rastejador', morgue.d13 === 'ok' && morgue.d13open && morgue.crawlerDormant && morgue.crawlerWoke, JSON.stringify(morgue));
  check('Rastejador morto com golpes fortes', !morgue.crawler.alive, JSON.stringify({ ...morgue.crawler, lightDmg: morgue.lightDmg }));
  check('fundo da gaveta 13 abre a câmara fria (secreta)', morgue.coldBefore && morgue.push === 'ok' && morgue.coldOpen && morgue.coldZ < -0.2, JSON.stringify(morgue));
  check('recompensa secreta: bandagens ×2 + carta', morgue.bandGain === 2 && morgue.hasLetter, JSON.stringify(morgue));
  check('bandagem escondida só aparece com a gaveta 20 aberta', morgue.hidden20 && morgue.d20 === 'ok' && morgue.band20 === 'ok', JSON.stringify(morgue));
  check('portas e gavetas do necrotério persistem no save', morgue.saved.cold?.open && morgue.saved.morgue?.open && morgue.saved.d13, JSON.stringify(morgue.saved));
  await page.screenshot({ path: SHOTS + '06-necroterio.png' });
  // --- Chefe
  const boss = await page.evaluate(() => {
    const g = __ocdc; const b = g.boss;
    T.tp(22, -5, 16, 0); T.run(0.3);
    const pre = g.checkpoint;
    T.tp(22, -5, 22.5, 0); T.run(0.2);
    const active = g.script.bossActive, doorLocked = g.level.doors.arena.locked;
    T.run(3);
    // fase real: investida contra obstáculo → atordoado → golpes no frasco
    let guard = 0, stunnedSeen = false, hpStart = b.hp, weakHits = 0;
    while (b.alive && guard++ < 400) {
      g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 25; k++) T.press('Mouse0');
      if (b.state === 'stunned') {
        stunnedSeen = true;
        const w = b.weakPoint(); const bx = Math.sin(b.yaw), bz = Math.cos(b.yaw);
        // encosta nas costas do chefe (o empurrão de colisão mantém ~1,1 m do centro)
        T.tp(b.pos.x - bx * 1.0, -5, b.pos.z - bz * 1.0, Math.atan2(bx, bz));
        T.press('Mouse2'); T.run(1.1); // golpe forte de cima para baixo alcança o frasco
        if (b.weakHits !== undefined) weakHits = b.weakHits;
      } else {
        // provoca a investida: espera longe, atrás de mesas/pilares, encarando o chefe
        if (b.state !== 'chargeWind' && b.state !== 'charge') {
          const spots = [[16, 30.2], [30, 30.2], [16, 25.6], [30, 25.6], [23, 35.3], [23, 31.2], [12, 28], [34, 28]];
          let best = spots[0], bd = -1;
          for (const [x, z] of spots) { const d = Math.hypot(x - b.pos.x, z - b.pos.z); if (d > bd) { bd = d; best = [x, z]; } }
          T.tp(best[0], -5, best[1], Math.atan2(b.pos.x - best[0], b.pos.z - best[1]));
        }
        T.run(0.5);
      }
    }
    return { pre, active, doorLocked, stunnedSeen, weakHits: b.weakHits || 0, alive: b.alive, hp: b.hp, hpStart, guard };
  });
  check('autosave pré-chefe', boss.pre === 'pre_boss', boss.pre);
  check('luta inicia e tranca a porta', boss.active && boss.doorLocked, JSON.stringify(boss));
  check('chefe atordoado por obstáculo e derrotado', boss.stunnedSeen && !boss.alive, JSON.stringify(boss));
  await page.screenshot({ path: SHOTS + '04-arena.png' });
  const end = await page.evaluate(() => {
    const g = __ocdc; T.run(0.5);
    const out = { bossDead: g.quest.has('bossDead'), doorUnlocked: !g.level.doors.arena.locked };
    T.tp(34.6, -5, 26.4, Math.PI / 2); out.gate = T.interactAt('gate_lever'); T.run(1.2);
    T.tp(34.5, -5, 28, Math.PI / 2); g.cameraCtl.yaw = Math.PI / 2; T.hold('KeyW', 2.2); out.x = g.player.pos.x;
    T.tp(38.6, -5, 26.4, Math.PI); out.book = T.interactAt('book_yard');
    T.tp(44.6, -5, 28, Math.PI / 2); out.exit = T.interactAt('exit');
    out.state = g.state;
    return out;
  });
  check('portão de serviço abre e permite passagem', end.x > 37, JSON.stringify(end));
  check('fim do capítulo exibido', end.state === 'end', JSON.stringify(end));
  await page.screenshot({ path: SHOTS + '05-fim.png' });
  // --- Save persistente e "Continuar"
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const cont = await page.evaluate(() => ({ visible: !document.getElementById('btnContinue').classList.contains('hidden'), save: JSON.parse(localStorage.getItem('ocdc_save')) }));
  check('save versionado com progresso persistido', cont.visible && cont.save.version === 1 && cont.save.flags.bossDead && cont.save.deadEnemies.length >= 2, JSON.stringify({ v: cont.save.version, cp: cont.save.checkpoint, dead: cont.save.deadEnemies }));
  // --- Continuar de um save pré-chefe e morte → recarregar
  const death = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ocdc_save')); s.flags = { ...s.flags, bossDead: false, gateOpen: false, chapterDone: false }; s.checkpoint = 'pre_boss';
    localStorage.setItem('ocdc_save', JSON.stringify(s));
    document.getElementById('btnContinue').click();
    const g = __ocdc; const r = { state: g.state, pos: g.player.pos.toArray() };
    g.player.takeHit({ dmg: 999, from: { x: 0, y: 0, z: 0 }, blockable: false });
    T.run?.(0);
    return r;
  });
  // o tempo de jogo avança pelo requestAnimationFrame (lento no render por software): espera até 30 s
  await page.waitForFunction(() => !document.getElementById('dead').classList.contains('hidden'), { timeout: 30000 }).catch(() => {});
  const deadScr = await page.$eval('#dead', (e) => !e.classList.contains('hidden'));
  const dinfo = await page.evaluate(() => ({ st: __ocdc.state, hp: __ocdc.player.hp, alive: __ocdc.player.alive, pst: __ocdc.player.state, dy: __ocdc.dyingT }));
  check('continuar carrega checkpoint pré-chefe', death.state === 'playing' && Math.abs(death.pos[1] + 5) < 0.1, JSON.stringify(death));
  check('morte mostra tela e permite recarregar', deadScr, JSON.stringify(dinfo));
  await page.click('#btnRetry'); await new Promise((r) => setTimeout(r, 500));
  check('recarregar após morte', await page.evaluate(() => __ocdc.state === 'playing' && __ocdc.player.hp > 0));
  // --- desempenho aproximado (render real, swiftshader)
  const fps = await page.evaluate(() => new Promise((res) => { const g = __ocdc; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
  check('renderização contínua', fps > 3, fps.toFixed(1) + ' fps (software)');
  await page.screenshot({ path: SHOTS + '06-continuar.png' });
  check('sem erros no console', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) {
  check('execução do smoke', false, String(e.stack || e));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
process.exit(failed.length ? 1 : 0);
