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
      // tecla de menu (tratada fora do passo de simulação)
      key(code) { g.input.pressed.add(code); g._handleMenuKeys(); g.input.endFrame(); },
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
    g.enemies.forEach((e) => { if (e.alive && e.pos.y > -1 && !e.id.endsWith('_east') && e.pos.y < 3 && e.id !== 'int_chapel') e.setDeadInstant(); });
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
    let aimK = 0; const AIM = [[-1.1, 0.6], [-1.2, -0.3], [-0.6, 1.1], [-1.25, 0]]; const aim = () => { const [ox, oz] = AIM[aimK % AIM.length]; T.tp(c.pos.x + ox, -5, c.pos.z + oz, 0); const y = Math.atan2(c.pos.x - g.player.pos.x, c.pos.z - g.player.pos.z); g.player.yaw = y; g.cameraCtl.yaw = y; };
    // golpe leve (horizontal) passa por cima do Rastejador
    g.player.hp = 100; aim(); const hpL = c.hp; T.press('Mouse0'); T.run(0.9); out.lightDmg = hpL - c.hp;
    // Rastejador: golpes fortes (de cima para baixo)
    let swings = 0; const hp0 = c.hp;
    for (let i = 0; i < 40 && c.alive; i++) {
      aim();
      g.player.hp = 100; if (g.player.state === 'grabbed') { for (let k = 0; k < 20; k++) T.press('Mouse0'); }
      // como um jogador faria: espera a garra passar (fora do alcance) e golpeia na recuperação
      for (let k = 0; k < 120 && c.alive && (c.state === 'attack' || c.state === 'grabbing' || g.player.state !== 'free'); k++) { T.tp(c.pos.x - 2.6, -5, c.pos.z + 1.2, 0); T.run(1 / 60); g.player.hp = 100; }
      const hpB = c.hp; aim(); T.press('Mouse2'); swings++; T.run(1.1); if (c.hp === hpB) aimK++;
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
  // --- Lavanderia, incinerador, escada de serviço, administração, capela, mapa
  const annex = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {}, E = (id) => g.enemies.find((e) => e.id === id);
    const LO = -5, UP2 = 4;
    g.player.hp = 100;
    T.tp(13.0, LO, 12, -Math.PI / 2); out.lavDoor = T.interactAt('door_laundry'); T.run(0.8);
    g.cameraCtl.yaw = -Math.PI / 2; T.hold('KeyW', 1.2); T.run(0.3);
    out.laundry = g.quest.has('enteredLaundry'); out.cpLav = g.checkpoint;
    // calor: o jogador e inimigos diante da boca acesa se queimam
    E('int_forno').setDeadInstant();
    const lav = E('enf_lav'); out.lavDormant = lav.dormant;
    T.tp(3.6, LO, 17, -Math.PI / 2); g.player.hp = 100; T.run(1.1); out.heatHp = g.player.hp;
    g.player.hp = 100; T.tp(3.6, LO, 17, -Math.PI / 2); out.look = T.interactAt('furnace_look'); out.saw = g.quest.has('sawFurnaceKey');
    out.keyBlocked = !g.interact.list.find((i) => i.id === 'pick_stair_key').enabled();
    // registro de gás
    T.tp(3.4, LO, 12.5, -Math.PI / 2); out.valve = T.interactAt('gas_valve');
    out.off = g.quest.has('furnaceOff') && !g.level.furnace.lit; out.lavWoke = !lav.dormant;
    lav.setDeadInstant();
    T.tp(3.6, LO, 17, -Math.PI / 2); g.player.hp = 100; T.run(1.1); out.coolHp = g.player.hp;
    out.key = T.interactAt('pick_stair_key'); out.hasKey = g.inventory.has('chave_escada');
    T.tp(9.2, LO, 16.0, Math.PI); out.diary = T.interactAt('doc_diario_forneiro');
    // escada de serviço → 2º andar
    T.tp(26, 0, 12.9, 0); out.ssDoor = T.interactAt('door_serviceStair'); T.run(0.8);
    out.ssOpen = D.serviceStair.open && !D.serviceStair.locked && !g.inventory.has('chave_escada');
    E('enf_admin').setDeadInstant(); E('int_sec').setDeadInstant();
    T.tp(26, 0, 15.2, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 4.5); T.run(0.3);
    out.top = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.admin = g.quest.has('reachedAdmin'); out.cpAdmin = g.checkpoint;
    T.tp(33, UP2, 23.3, Math.PI); out.dirDoor = T.interactAt('door_diretoria'); T.run(0.8);
    T.tp(33.1, UP2, 16.9, Math.PI); out.plan = T.interactAt('pick_planta_hospital');
    T.tp(31.9, UP2, 16.9, Math.PI); out.memo = T.interactAt('doc_memorando_diretoria');
    T.tp(36.6, UP2, 16.6, Math.PI); out.book = T.interactAt('book_admin'); out.cpDir = g.checkpoint;
    T.tp(19, UP2, 23.3, Math.PI); out.secDoor = T.interactAt('door_secretaria'); T.run(0.8);
    T.tp(21.3, UP2, 17.1, Math.PI); out.list = T.interactAt('doc_lista_transferencia');
    // coro → escada da capela
    T.tp(13.2, UP2, 23, -Math.PI / 2); g.cameraCtl.yaw = -Math.PI / 2; T.hold('KeyW', 1.4);
    out.coroX = +g.player.pos.x.toFixed(2);
    T.tp(11, UP2, 22.6, Math.PI); g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 4); T.run(0.3);
    out.bottom = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.chapel = g.quest.has('enteredChapel'); out.cpChapel = g.checkpoint;
    T.tp(3.0, 0, 20.5, 0); out.hymn = T.interactAt('doc_hino_capela'); T.run(0.1); out.readHymn = g.quest.has('readHymn');
    // vela errada: apaga tudo e acorda o fiel
    const fiel = E('int_chapel'); out.fielDormant = fiel.dormant;
    T.tp(1.7, 0, 15.6, -Math.PI / 2); out.wrong = T.interactAt('candle_luzia');
    out.fielWoke = !fiel.dormant; out.noneLit = Object.values(g.level.candles).every((c) => !c.lit);
    fiel.setDeadInstant(); g.player.hp = 100;
    const seq = [['bras', 8.1, 0, 15.7, Math.PI], ['luzia', 1.7, 0, 15.6, -Math.PI / 2], ['roque', 1.7, 0, 21.2, -Math.PI / 2], ['dimas', 3.3, 0.2, 22.3, 0]];
    out.seq = seq.map(([id, x, y, z, yaw]) => { T.tp(x, y, z, yaw); return T.interactAt('candle_' + id); });
    out.relicOpen = g.quest.has('relicOpen'); T.run(1);
    T.tp(6, 0.2, 22.3, 0); out.relic = T.interactAt('pick_relic'); out.maxHp = g.player.maxHp; out.hp = g.player.hp;
    T.tp(6, 0, 15.1, Math.PI); out.bolt = T.interactAt('door_chapel'); T.run(0.8);
    out.shortcut = D.chapel.open && !D.chapel.locked && g.quest.has('chapelShortcut');
    T.tp(6, 0, 15.6, Math.PI); g.cameraCtl.yaw = Math.PI; T.hold('KeyW', 1.5); out.outZ = +g.player.pos.z.toFixed(2);
    g.saveGame('chapel');
    const sv = JSON.parse(localStorage.getItem('ocdc_save'));
    out.saved = { ss: sv.doors.serviceStair?.open, ch: sv.doors.chapel?.open, relic: sv.flags.relicOpen, hpUp: sv.flags.maxHpUp, off: sv.flags.furnaceOff, seen: Object.keys(sv.flags).filter((k) => k.startsWith('seen_')).length };
    // mapa (M)
    T.key('KeyM'); out.mapState = g.state; out.map1 = g.menus.lastMap;
    T.key('Digit3'); out.map3 = g.menus.lastMap; out.mapFloor = g.menus.mapView.floor;
    T.key('Digit1'); out.map0 = g.menus.lastMap;
    out.mapNotes = document.getElementById('mapNotes').children.length;
    return out;
  });
  check('lavanderia: porta, autosave na entrada', annex.lavDoor === 'ok' && annex.laundry && annex.cpLav === 'laundry', JSON.stringify(annex));
  check('incinerador aceso queima e esconde a chave', annex.heatHp < 100 && annex.look === 'ok' && annex.saw && annex.keyBlocked, JSON.stringify({ hp: annex.heatHp, look: annex.look }));
  check('registro de gás apaga o fogo e acorda a enfermeira', annex.valve === 'ok' && annex.off && annex.lavDormant && annex.lavWoke && annex.coolHp === 100, JSON.stringify(annex));
  check('chave de ferro nas cinzas abre a escada de serviço', annex.key === 'ok' && annex.hasKey && annex.ssDoor === 'ok' && annex.ssOpen, JSON.stringify(annex));
  check('escada de serviço sobe ao 2º andar (autosave)', annex.top[1] > 3.5 && annex.admin && annex.cpAdmin === 'admin', JSON.stringify(annex.top));
  check('diretoria: planta, memorando e livro de registros', annex.dirDoor === 'ok' && annex.plan === 'ok' && annex.memo === 'ok' && annex.book === 'ok' && annex.cpDir === 'diretoria' && annex.list === 'ok', JSON.stringify(annex));
  check('coro desce à capela pela escada', annex.coroX < 12 && annex.bottom[1] < 0.5 && annex.bottom[2] < 16.5 && annex.chapel, JSON.stringify(annex.bottom));
  check('velas: ordem errada apaga tudo e acorda o fiel', annex.hymn === 'ok' && annex.readHymn && annex.wrong === 'ok' && annex.fielDormant && annex.fielWoke && annex.noneLit, JSON.stringify(annex));
  check('velas na ordem do hino abrem o relicário (+vida máxima)', annex.seq.every((r) => r === 'ok') && annex.relicOpen && annex.relic === 'ok' && annex.maxHp === 125 && annex.hp === 125, JSON.stringify({ seq: annex.seq, maxHp: annex.maxHp }));
  check('tranca da capela vira atalho para o corredor', annex.bolt === 'ok' && annex.shortcut && annex.outZ < 13.6, JSON.stringify(annex));
  check('estado dos anexos persiste no save', annex.saved.ss && annex.saved.ch && annex.saved.relic && annex.saved.hpUp && annex.saved.off && annex.saved.seen >= 10, JSON.stringify(annex.saved));
  check('mapa (M) mostra cômodos por andar', annex.mapState === 'map' && annex.map1?.rooms >= 5 && annex.mapFloor === 'up2' && annex.map3?.rooms >= 4 && annex.map0?.rooms >= 6, JSON.stringify({ m1: annex.map1, m3: annex.map3, m0: annex.map0 }));
  await page.screenshot({ path: SHOTS + '07-mapa.png' });
  await page.evaluate(() => { T.key('KeyM'); });
  check('mapa fecha com M', await page.evaluate(() => __ocdc.state === 'playing'));
  // --- Ala cirúrgica superior, telhado, martelo, parede do expurgo e cilindros de oxigênio
  const wing = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {}, E = (id) => g.enemies.find((e) => e.id === id), q = g.quest;
    const UP2 = 4, ROOF = 7.3;
    g.player.hp = g.player.maxHp;
    // atalho: ferrolho da escada principal pelo térreo
    out.msLocked = D.mainStair.locked;
    T.tp(39.5, 0, 15.0, Math.PI); out.msDoor = T.interactAt('door_mainStair'); T.run(0.8);
    out.msOpen = D.mainStair.open && !D.mainStair.locked && q.has('mainStairShortcut');
    T.tp(39.5, 0, 14.8, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 4); T.run(0.3);
    out.msTop = g.player.pos.toArray().map((v) => +v.toFixed(2));
    T.tp(39.5, UP2, 23.15, -Math.PI / 2); g.cameraCtl.yaw = -Math.PI / 2; T.hold('KeyW', 1.5);
    out.msOut = g.player.pos.toArray().map((v) => +v.toFixed(2));
    // porta da ala (corredor da administração) → autosave
    for (const id of ['enf_wing', 'int_roof']) E(id).setDeadInstant();
    T.tp(26, UP2, 24.9, 0); out.wingDoor = T.interactAt('door_wing'); T.run(0.8);
    T.tp(26, UP2, 25.2, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 1.0); T.run(0.2);
    out.entered = q.has('enteredWing'); out.cpWing = g.checkpoint;
    // cilindro de oxigênio: golpe real explode e fere o inimigo ao lado
    const vic = E('ras_ster'); const vicHp0 = vic.hp;
    vic.pos.set(24.3, UP2, 28.3); vic.dormant = true;
    g.player.hp = g.player.maxHp; g.player.st = 100;
    T.tp(22.0, UP2, 28.55, Math.PI / 2); g.cameraCtl.yaw = Math.PI / 2;
    for (let i = 0; i < 4 && !q.has('exploded_o2_cor'); i++) { g.player.yaw = Math.PI / 2; T.press('Mouse0'); T.run(0.8); }
    T.run(0.5);
    out.blast = q.has('exploded_o2_cor'); out.vicHp = [vicHp0, vic.hp, vic.alive]; out.playerHp = g.player.hp;
    out.tankCol = g.level.tanks.o2_cor.collider.enabled;
    if (vic.alive) vic.setDeadInstant();
    // esterilização: registro cirúrgico (pista do segredo)
    g.player.hp = g.player.maxHp;
    T.tp(20, UP2, 28.0, 0); out.sterDoor = T.interactAt('door_sterile'); T.run(0.8);
    T.tp(22.2, UP2, 32.9, 0); out.log = T.interactAt('doc_registro_cirurgico'); T.run(0.1); out.readLog = q.has('readSurgLog');
    // sala 2: a parede rachada não cede ao machado
    T.tp(27.5, UP2, 28.0, 0); out.s2Door = T.interactAt('door_surgery2'); T.run(0.8);
    const s2 = E('int_s2'); out.s2Dormant = s2.dormant; s2.setDeadInstant();
    g.player.setWeapon('machado'); g.player.st = 100;
    T.tp(27.5, UP2, 35.1, 0); g.cameraCtl.yaw = 0; T.press('Mouse0'); T.run(0.9);
    out.axeImmune = !q.has('wallBroken') && q.has('wallTried') && g.level.crackedWall.collider.enabled;
    // telhado pela escada dos fundos
    T.tp(17.3, UP2, 27.5, -Math.PI / 2); out.rsDoor = T.interactAt('door_roofStair'); T.run(0.8);
    T.tp(14.7, UP2, 27.3, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 4.5); T.run(0.2);
    out.rsTop = g.player.pos.toArray().map((v) => +v.toFixed(2));
    T.tp(15.5, ROOF, 36.9, Math.PI / 2); out.roofDoor = T.interactAt('door_roofDoor'); T.run(0.8);
    T.tp(15.5, ROOF, 36.9, Math.PI / 2); g.cameraCtl.yaw = Math.PI / 2; T.hold('KeyW', 1.5); T.run(0.2);
    out.roof = q.has('reachedRoof'); out.cpRoof = g.checkpoint; out.roofPos = g.player.pos.toArray().map((v) => +v.toFixed(2));
    // barracão: martelo industrial e bilhete
    T.tp(29.6, ROOF, 35.2, Math.PI / 2); g.cameraCtl.yaw = Math.PI / 2; T.hold('KeyW', 1.0);
    out.inShed = g.script.room;
    T.tp(33.9, ROOF, 36.6, 0); out.hammer = T.interactAt('pick_hammer');
    out.weapon = g.player.weapon?.id; out.weapons = [...g.inventory.weapons];
    T.tp(34.6, ROOF, 36.6, 0); out.note = T.interactAt('doc_bilhete_zelador');
    // R troca de arma
    T.press('KeyR'); out.swap1 = g.player.weapon?.id; T.run(0.1);
    T.press('KeyR'); out.swap2 = g.player.weapon?.id; T.run(0.1);
    // golpe leve do martelo não basta; o forte derruba a parede
    g.player.st = 100; g.player.hp = g.player.maxHp;
    T.tp(27.5, UP2, 35.1, 0); g.cameraCtl.yaw = 0; g.player.yaw = 0; T.press('Mouse0'); T.run(1.0);
    out.lightKept = !q.has('wallBroken');
    g.player.st = 100; g.player.yaw = 0; T.press('Mouse2'); T.run(1.6);
    out.broken = q.has('wallBroken') && !g.level.crackedWall.collider.enabled && g.level.expurgoGate.open;
    T.tp(27.5, UP2, 35.2, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 1.0); T.run(0.2);
    out.expurgo = g.script.room; out.expZ = +g.player.pos.z.toFixed(2);
    T.tp(27.2, UP2, 36.9, 0); out.stone = T.interactAt('pick_whetstone'); out.sharp = g.player.sharpened;
    T.tp(28.1, UP2, 36.9, 0); out.last = T.interactAt('doc_ultimo_bilhete');
    const b0 = g.inventory.items.bandagem || 0; T.tp(25.0, UP2, 36.9, 0); out.band = T.interactAt('pick_band_exp'); out.bandGain = (g.inventory.items.bandagem || 0) - b0;
    // recuperação: livro de registros
    T.tp(33.5, UP2, 28.0, 0); out.recDoor = T.interactAt('door_recovery'); T.run(0.8);
    T.tp(35.3, UP2, 36.5, 0); out.book = T.interactAt('book_wing'); out.cpRec = g.checkpoint;
    // dano do machado afiado
    g.player.setWeapon('machado');
    g.hud.update(1 / 60, g); out.hud = document.getElementById('weapon')?.textContent || '';
    const sv = JSON.parse(localStorage.getItem('ocdc_save'));
    out.saved = { weapons: sv.inventory.weapons, wall: sv.flags.wallBroken, sharp: sv.flags.sharpened, tank: sv.flags.exploded_o2_cor, ms: sv.doors.mainStair?.open, hammer: sv.flags.hasHammer };
    // mapa: aba do telhado
    T.key('KeyM'); T.key('Digit4'); out.mapRoof = g.menus.mapView.floor; out.mapRoofRooms = g.menus.lastMap?.rooms; T.key('KeyM');
    return out;
  });
  check('escada principal: ferrolho pelo térreo vira atalho até o 2º andar', wing.msLocked && wing.msDoor === 'ok' && wing.msOpen && wing.msTop[1] > 3.8 && wing.msTop[2] > 22.4 && wing.msOut[0] < 37.5 && wing.msOut[1] > 3.8, JSON.stringify({ t: wing.msTop, o: wing.msOut }));
  check('ala cirúrgica superior: porta pela administração e autosave', wing.wingDoor === 'ok' && wing.entered && wing.cpWing === 'wing', JSON.stringify(wing));
  check('cilindro de oxigênio explode com golpe e fere inimigo próximo', wing.blast && !wing.tankCol && (!wing.vicHp[2] || wing.vicHp[1] <= wing.vicHp[0] - 40), JSON.stringify({ b: wing.blast, hp: wing.vicHp, php: wing.playerHp }));
  check('parede rachada resiste ao machado', wing.sterDoor === 'ok' && wing.log === 'ok' && wing.readLog && wing.s2Door === 'ok' && wing.s2Dormant && wing.axeImmune, JSON.stringify(wing));
  check('escada dos fundos sobe ao telhado (autosave)', wing.rsDoor === 'ok' && wing.rsTop[1] > 7 && wing.roofDoor === 'ok' && wing.roof && wing.cpRoof === 'roof' && wing.roofPos[0] > 17, JSON.stringify({ t: wing.rsTop, r: wing.roofPos }));
  check('martelo industrial: coleta, equipa e R troca de arma', wing.inShed === 'shed' && wing.hammer === 'ok' && wing.weapon === 'martelo' && wing.weapons.length === 2 && wing.swap1 === 'machado' && wing.swap2 === 'martelo' && wing.note === 'ok', JSON.stringify(wing));
  check('golpe forte do martelo derruba a parede do expurgo (segredo)', wing.lightKept && wing.broken && wing.expurgo === 'expurgo' && wing.expZ > 36.3, JSON.stringify(wing));
  check('recompensa do expurgo: pedra de afiar (+30% machado), bandagens e bilhete', wing.stone === 'ok' && wing.sharp && wing.bandGain === 2 && wing.last === 'ok', JSON.stringify(wing));
  check('HUD indica machado afiado', /afiado/.test(wing.hud), wing.hud);
  check('livro da recuperação e save com armas/parede/afiação/cilindro', wing.book === 'ok' && wing.cpRec === 'recovery' && wing.saved.weapons?.length === 2 && wing.saved.wall && wing.saved.sharp && wing.saved.tank && wing.saved.ms && wing.saved.hammer, JSON.stringify(wing.saved));
  check('mapa: aba Telhado', wing.mapRoof === 'roof' && wing.mapRoofRooms >= 2, JSON.stringify({ f: wing.mapRoof, n: wing.mapRoofRooms }));
  await page.screenshot({ path: SHOTS + '08-ala-cirurgica.png' });
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
    const g = __ocdc; const r = { state: g.state, pos: g.player.pos.toArray(), weapons: [...g.inventory.weapons], wall: !g.level.crackedWall.panel.visible && g.level.expurgoGate.open, sharp: g.player.sharpened, tank: !g.level.tanks.o2_cor.group.visible, hammerHidden: !g.level.pickupMeshes.hammer.visible };
    g.player.takeHit({ dmg: 999, from: { x: 0, y: 0, z: 0 }, blockable: false });
    T.run?.(0);
    return r;
  });
  // o tempo de jogo avança pelo requestAnimationFrame (lento no render por software): espera até 30 s
  await page.waitForFunction(() => !document.getElementById('dead').classList.contains('hidden'), { timeout: 30000 }).catch(() => {});
  const deadScr = await page.$eval('#dead', (e) => !e.classList.contains('hidden'));
  const dinfo = await page.evaluate(() => ({ st: __ocdc.state, hp: __ocdc.player.hp, alive: __ocdc.player.alive, pst: __ocdc.player.state, dy: __ocdc.dyingT }));
  check('continuar carrega checkpoint pré-chefe', death.state === 'playing' && Math.abs(death.pos[1] + 5) < 0.1, JSON.stringify(death));
  check('carregar save restaura armas, parede derrubada, afiação e cilindro', death.weapons.length === 2 && death.wall && death.sharp && death.tank && death.hammerHidden, JSON.stringify(death));
  check('morte mostra tela e permite recarregar', deadScr, JSON.stringify(dinfo));
  await page.click('#btnRetry'); await new Promise((r) => setTimeout(r, 500));
  check('recarregar após morte', await page.evaluate(() => __ocdc.state === 'playing' && __ocdc.player.hp > 0));
  // --- desempenho aproximado (render real, swiftshader)
  const fps = await page.evaluate(() => new Promise((res) => { const g = __ocdc; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / 3, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, lights: (() => { let k = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) k++; }); return k; })(), allLights: (() => { let k = 0; g.scene.traverse((o) => { if (o.isLight) k++; }); return k; })(), meshes: (() => { let k = 0; g.scene.traverse((o) => { if (o.isMesh) k++; }); return k; })() }); }; requestAnimationFrame(f); }));
  check('orçamento de luzes limita luzes ativas', fps.lights <= fps.allLights - 16, 'visíveis: ' + fps.lights + ' de ' + fps.allLights);
  check('renderização contínua', fps.fps > 2, fps.fps.toFixed(1) + ' fps (software, sem GPU) ' + JSON.stringify(fps));
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
