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
      ammo() { return g.inventory.ammoTotal('revolver'); },
      reload() { if (g.inventory.rounds('revolver') < 6 && g.inventory.has('municao_38')) { T.press('KeyT'); T.run(2.6); } },
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
  // --- Elias REV6 (GLB) antes da coleta: carregado, sem machado visível, machado do cenário é a malha real
  await page.waitForFunction(() => __ocdc.player.model.ready || __ocdc.player.model.failed, { timeout: 30000 }).catch(() => {});
  const rev0 = await page.evaluate(() => {
    const g = __ocdc, M = g.player.model, w = g.level.pickupMeshes.axe;
    return { ready: M.ready, failed: M.failed, inScene: !!M.root?.parent && M.root.parent === g.player.rig.body,
      axeVisible: !!M.axe?.visible, possui: M.sistema?.possuiMachado, procHidden: g.player._procMeshes.every((m) => !m.visible),
      worldReal: !!w.getObjectByName('MachadoCenarioREV6'), marker: !!w.getObjectByName('Machado_Coletavel'), itemId: w.userData.itemId,
      bones: !!M.root?.getObjectByName('SocketMachado_Direita') };
  });
  check('Elias REV6 (GLB) carregado no lugar do boneco procedural', rev0.ready && rev0.inScene && rev0.procHidden && rev0.bones, JSON.stringify(rev0));
  check('REV6: começa sem machado visível; machado do cenário é a malha real com marcador', !rev0.axeVisible && rev0.possui === false && rev0.worldReal && rev0.marker && rev0.itemId === 'machado_enferrujado', JSON.stringify(rev0));
  const far = await page.evaluate(() => { const g = __ocdc; T.tp(4.1, 0, 7.3, 0); return { ok: g.player.coletarMachado(g.level.pickupMeshes.axe), vis: g.level.pickupMeshes.axe.visible }; });
  check('REV6: coleta recusada a mais de 1,5 m', far.ok === false && far.vis, JSON.stringify(far));
  // --- Machado
  const axe = await page.evaluate(() => { const g = __ocdc; T.tp(4.1, 0, 8.7, 0); const r = T.interactAt('pick_axe'); return { r, w: !!g.player.weapon, flag: g.quest.has('hasAxe') }; });
  check('machado coletado e equipado', axe.w && axe.flag, JSON.stringify(axe));
  const rev1 = await page.evaluate(() => {
    const g = __ocdc, M = g.player.model; T.run(0.3);
    const idle = M.sistema.atual?.getClip().name;
    g.player.vel?.set?.(0, 0, 0); T.hold('KeyW', 0.6); const walk = M.sistema.atual?.getClip().name;
    const p = g.player.pos.clone(); return { axeVisible: M.axe.visible, world: g.level.pickupMeshes.axe.visible, idle, walk, ser: M.sistema.serializar(),
      tipOnAxe: g.player.models.machado.tip.parent === M.axe, tipWorld: g.player.models.machado.tip.getWorldPosition(p).toArray().map((v) => +v.toFixed(2)) };
  });
  check('REV6: após coletar, Machado_Equipado visível na mão e o do cenário oculto', rev1.axeVisible && !rev1.world && rev1.ser.possuiMachado && rev1.ser.machadoEquipado && rev1.tipOnAxe, JSON.stringify(rev1));
  check('REV6: clipes _Machado com o machado (idle e Walking)', /_Machado$/.test(rev1.idle || '') && rev1.walk === 'Walking_Machado', JSON.stringify({ idle: rev1.idle, walk: rev1.walk }));
  await page.screenshot({ path: SHOTS + '02b-elias-machado.png' });
  // golpe: clipe do REV6 posicionado pela janela do golpe; a ponta da lâmina (hitbox) se move com o clipe
  const swing = await page.evaluate(() => {
    const g = __ocdc, P = g.player, M = P.model; T.run(0.5);
    T.press('Mouse0'); let clip = null; const tips = [];
    for (let i = 0; i < 24; i++) { T.run(1 / 60); if (!clip) clip = M.sistema.atual?.getClip().name; tips.push(P.models.machado.tip.getWorldPosition(P.pos.clone()).y); }
    T.run(1);
    return { clip, state: P.state, dy: Math.max(...tips) - Math.min(...tips) };
  });
  check('REV6: golpe usa clipe de ataque _Machado e move a lâmina (hitbox real)', /Attack_Machado$/.test(swing.clip || '') && swing.dy > 0.3, JSON.stringify(swing));
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
  // outra arma: malha procedural no socket da mão do GLB, machado oculto, dedos fechados (_Machado)
  const swap = await page.evaluate(() => {
    const g = __ocdc, P = g.player, M = P.model; P.setWeapon('martelo'); T.run(0.2);
    const r = { parent: P.models.martelo.group.parent?.name, vis: P.models.martelo.group.visible, axe: M.axe.visible, clip: M.sistema.atual?.getClip().name };
    P.setWeapon('machado'); T.run(0.2); r.back = M.axe.visible; return r;
  });
  check('REV6: martelo/facão/lança/revólver presos ao socket da mão do GLB', swap.parent === 'SocketArmasProcedurais' && swap.vis && !swap.axe && swap.back, JSON.stringify(swap));
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
  // --- 3º andar: ala pediátrica (facão, revólver, Quarto 7, caixinha de música, escada de incêndio)
  const peds = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {}, E = (id) => g.enemies.find((e) => e.id === id);
    const ROOF = 7.3, UP2 = 4, PI = Math.PI;
    const PEDS = ['enf_ped', 'int_brinq', 'ras_berc', 'int_seg'];
    g.enemies.forEach((e) => { if (e.alive && e.pos.y > 3 && !PEDS.includes(e.id) && !['enf_mat', 'int_parto', 'ras_aloj'].includes(e.id)) e.setDeadInstant(); });
    g.player.hp = 100;
    // a porta da escada de incêndio não abre pelo patamar (atalho só por fora)
    T.tp(40.2, UP2, 23.15, PI / 2); out.feInside = T.interactAt('door_fireExit'); T.run(0.3); out.feLockedInside = D.fireExit.locked && !D.fireExit.open;
    // telhado → corredor da pediatria (autosave)
    T.tp(27, ROOF, 27.4, PI); out.pedDoor = T.interactAt('door_pedRoof'); T.run(0.8); out.pedOpen = D.pedRoof.open; out.nearE = g.enemies.filter((e) => e.alive && e.pos.distanceTo(g.player.pos) < 4).map((e) => e.id + ':' + e.state);
    g.cameraCtl.yaw = PI; T.hold('KeyW', 1.2); T.run(0.1);
    out.inPeds = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.entered = g.quest.has('enteredPeds'); out.cp = g.checkpoint;
    // berçário: facão cravado no berço
    T.tp(27, ROOF, 23.2, PI); out.bercDoor = T.interactAt('door_bercario'); T.run(0.8);
    const rb = E('ras_berc'); out.crawlerDormant = rb.dormant;
    T.tp(27, ROOF, 17.0, PI); out.facao = T.interactAt('pick_facao'); out.wFacao = g.player.weapon?.id; out.crawlerWoke = !rb.dormant;
    T.tp(29.4, ROOF, 16.8, PI); out.ficha = T.interactAt('doc_ficha_bercario');
    rb.setDeadInstant();
    // facão em combate real: Enfermeiro da pediatria
    const e = E('enf_ped'); const hp0 = e.hp; let swings = 0, firstDmg = 0;
    for (let i = 0; i < 70 && e.alive; i++) {
      g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 20; k++) T.press('Mouse0');
      T.tp(e.pos.x - 1.1, ROOF, e.pos.z, PI / 2);
      const y = Math.atan2(e.pos.x - g.player.pos.x, e.pos.z - g.player.pos.z); g.player.yaw = y; g.cameraCtl.yaw = y;
      const hb = e.hp; T.press('Mouse0'); swings++; T.run(0.55); if (!firstDmg && e.hp < hb) firstDmg = hb - e.hp;
    }
    out.fight = { alive: e.alive, hp0, swings, firstDmg };
    // desgaste: os golpes gastaram o facão; HUD mostra %; G com kit volta a 100% e gasta o kit
    {
      T.run(0.8); const inv = g.inventory, c0 = inv.condition('facao');
      g.hud.update(1 / 60, g); const hud = document.getElementById('weapon').textContent, bar = !document.getElementById('condTrack').classList.contains('hidden');
      inv.addWear('facao', 40); const worn = inv.condition('facao');
      const dmgWorn = g.player.weapon && inv.condition('facao') < 0.5;
      // sem kit, a pedra de afiar recupera lâminas até 60%
      const noKit = !inv.has('kit_reparo'), stone = inv.has('pedra_afiar'); T.press('KeyG'); const stNo = g.player.state; T.run(1.5); const cStone = inv.condition('facao');
      inv.add('kit_reparo'); T.press('KeyG'); const st = g.player.state; T.run(1.9);
      out.wear = { c0, hud, bar, worn, dmgWorn, noKit, stone, stNo, cStone, st, c1: inv.condition('facao'), kit: inv.count('kit_reparo'), repairs: g.player.repairs || 0, after: g.player.state };
    }
    // posto de enfermagem: chave, munição, livro de registros
    g.player.setWeapon('facao'); g.player.hp = 100;
    T.tp(33.5, ROOF, 23.2, PI); out.postoDoor = T.interactAt('door_postoPed'); T.run(0.8);
    T.tp(34.0, ROOF, 21.0, PI); out.key = T.interactAt('pick_key_seg');
    T.tp(32.7, ROOF, 15.6, -PI / 2); out.ammo1 = T.interactAt('pick_ammo_posto'); out.ammoA = T.ammo();
    T.tp(34.8, ROOF, 15.8, PI); out.book = T.interactAt('book_peds'); out.cpPosto = g.checkpoint;
    // segurança: chave → revólver (+3) e mais munição
    out.segLocked = D.seguranca.locked;
    T.tp(38.5, ROOF, 23.2, PI); out.segDoor = T.interactAt('door_seguranca'); T.run(0.8); out.segOpen = D.seguranca.open && g.quest.has('securityOpen');
    const s = E('int_seg'); out.segDormant = s.dormant;
    T.tp(38.0, ROOF, 19.3, PI); out.rev = T.interactAt('pick_revolver'); out.wRev = g.player.weapon?.id; out.segWoke = !s.dormant;
    T.tp(38.9, ROOF, 20.4, PI); out.ammo2 = T.interactAt('pick_ammo_seg'); out.ammoB = T.ammo();
    // mira manual (segura Q): retícula sem auto-mira; fora do alvo erra, apontando acerta
    {
      s.dormant = true; s._set('idle'); s.pos.set(38.6, ROOF, 15.6); s.yaw = 0; const sHpKeep = s.hp; s.hp = 999;
      T.tp(38.6, ROOF, 19.6, PI); g.player.hp = 100;
      g.input.down.add('KeyQ'); T.run(0.5);
      const aimSt = g.player.state, aimK = +g.cameraCtl.aimK.toFixed(2);
      g.hud.update(1 / 60, g); const reticle = document.getElementById('crosshair').classList.contains('aiming');
      const tgt = { x: s.pos.x, y: s.pos.y + 1.1, z: s.pos.z };
      g.cameraCtl.aimAt(tgt, g.player.pos); g.cameraCtl.yaw += 0.45;
      const h0 = s.hp, a0 = T.ammo(); g.player.lastShot = null; T.press('Mouse0'); T.run(0.9);
      const miss = { shot: g.player.lastShot, hp: s.hp === h0, ammo: a0 - T.ammo() };
      g.cameraCtl.aimAt(tgt, g.player.pos); T.run(0.05); g.cameraCtl.aimAt(tgt, g.player.pos);
      const h1 = s.hp; g.player.lastShot = null; T.press('Mouse0'); T.run(0.9);
      const hit = { shot: g.player.lastShot, dmg: h1 - s.hp, state: g.player.state };
      g.input.down.delete('KeyQ'); T.run(0.3);
      out.manual = { aimSt, aimK, reticle, miss, hit, back: g.player.state };
      s.dormant = false; s.alerted = true; s.hp = sHpKeep;
      // recarga (T): reserva → tambor, uma bala por vez
      const r0 = g.inventory.rounds('revolver'), t0 = T.ammo(); g.player.hp = 100; T.press('KeyT'); const st = g.player.state; T.run(2.8);
      out.reload = { st, r0, r1: g.inventory.rounds('revolver'), t0, t1: T.ammo(), after: g.player.state };
    }
    // tiro: botão direito acerta o Interno e gasta 1 bala
    let shots = 0; const sHp0 = s.hp; let firstShot = null;
    for (let i = 0; i < 5 && s.alive; i++) {
      g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 20; k++) T.press('Mouse0');
      const px = s.pos.x - 2.6, pz = s.pos.z + 0.4; T.tp(Math.max(36.6, Math.min(40.4, px)), ROOF, Math.max(14.6, Math.min(21.4, pz + 1.5)), 0);
      const y = Math.atan2(s.pos.x - g.player.pos.x, s.pos.z - g.player.pos.z); g.player.yaw = y; g.cameraCtl.yaw = y;
      if (!g.inventory.rounds('revolver')) T.reload();
      const a0 = T.ammo(), h0 = s.hp; T.press('Mouse2'); T.run(0.9); shots++;
      if (!firstShot) firstShot = { ammo: [a0, T.ammo()], hp: [h0, s.hp] };
    }
    out.shot = { alive: s.alive, sHp0, shots, firstShot, ammo: T.ammo() };
    out.cyl = { loaded: g.inventory.rounds('revolver'), reserve: g.inventory.count('municao_38') };
    // R troca de arma em ciclo
    out.weapons = [...g.inventory.weapons];
    const cyc = []; for (let i = 0; i < 4; i++) { T.press('KeyR'); cyc.push(g.player.weapon?.id); T.run(0.1); } out.cycle = cyc;
    T.tp(38.5, ROOF, 18.8, PI); out.ordem = T.interactAt('doc_ordem_seguranca');
    // escada de incêndio: porta externa no 3º, desce e abre o atalho para o patamar do 2º
    T.tp(39.8, ROOF, 15.1, PI / 2); out.feTop = T.interactAt('door_fireExitTop'); T.run(0.8);
    g.cameraCtl.yaw = PI / 2; T.hold('KeyW', 1.3); out.feOut = g.player.pos.toArray().map((v) => +v.toFixed(2));
    T.tp(42.2, ROOF, 15.4, 0); g.cameraCtl.yaw = 0; T.hold('KeyW', 4.5); T.run(0.2);
    out.feBottom = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.feReached = g.quest.has('reachedFireEscape'); out.cpFe = g.checkpoint;
    T.tp(42.1, UP2, 23.3, -PI / 2); out.feDoor = T.interactAt('door_fireExit'); T.run(0.8);
    out.feOpen = D.fireExit.open && !D.fireExit.locked && g.quest.has('fireExitShortcut');
    T.tp(41.9, UP2, 23.2, -PI / 2); g.cameraCtl.yaw = -PI / 2; T.hold('KeyW', 1.0); out.feIn = g.player.pos.toArray().map((v) => +v.toFixed(2));
    // caixinha de música: o barulho atrai um inimigo do andar (jogador longe, no 2º andar)
    const pp = g.player.pos.clone();
    T.tp(19.5, ROOF, 23.2, PI); out.brDoor = T.interactAt('door_brinq'); T.run(0.8);
    const noises = []; const pn = g.perception.noise.bind(g.perception); g.perception.noise = (at, r, k) => { noises.push(k); return pn(at, r, k); };
    T.tp(22.1, ROOF, 15.9, PI); out.music = T.interactAt('musicbox'); out.musicFlag = g.quest.has('musicBoxUsed');
    T.tp(pp.x, pp.y, pp.z, -PI / 2); T.run(0.2);
    const ib = E('int_brinq'); ib.dormant = false; ib.alerted = false; ib._set('idle'); ib.pos.set(27, ROOF, 24.2); ib.yaw = 0;
    const d0 = Math.hypot(ib.pos.x - 22.1, ib.pos.z - 14.7);
    const trail = []; for (let i = 0; i < 9; i++) { T.run(1); trail.push([+ib.pos.x.toFixed(1), +ib.pos.z.toFixed(1)]); }
    out.lure = { trail, state: ib.state, d0: +d0.toFixed(2), d1: +Math.hypot(ib.pos.x - 22.1, ib.pos.z - 14.7).toFixed(2), lk: ib.lastKnown && [+ib.lastKnown.x.toFixed(1), +ib.lastKnown.z.toFixed(1)], music: noises.filter((k) => k === 'music').length };
    g.perception.noise = pn; ib.setDeadInstant();
    T.run(9);
    // segredo: desenho → teatrinho → cadeado (só bala) → Quarto 7
    g.player.hp = 100;
    T.tp(19.5, ROOF, 17.6, PI); out.drawing = T.interactAt('doc_desenho_crianca'); T.run(0.1); out.readDrawing = g.quest.has('readChildDrawing');
    out.q7Hidden = !g.interact.list.find((i) => i.id === 'door_quarto7').enabled();
    T.tp(17.9, ROOF, 18.0, -PI / 2); out.theater = T.interactAt('theater'); T.run(1.2);
    out.moved = g.quest.has('theaterMoved'); out.theaterZ = +g.level.theater.collider.min.z.toFixed(2);
    g.player.setWeapon('facao'); T.tp(17.0, ROOF, 18.25, -PI / 2); g.cameraCtl.yaw = -PI / 2; T.press('Mouse0'); T.run(0.7);
    out.lockAfterMelee = !g.quest.has('lockBroken');
    g.player.setWeapon('revolver'); g.inventory.add('municao_38', 1); T.reload(); const la = T.ammo();
    T.tp(18.6, ROOF, 18.25, -PI / 2); g.cameraCtl.yaw = -PI / 2; g.player.yaw = -PI / 2; T.press('Mouse2'); T.run(0.9);
    out.lockShot = { broken: g.quest.has('lockBroken'), ammo: [la, T.ammo()], unlocked: !D.quarto7.locked };
    T.tp(17.0, ROOF, 18.0, -PI / 2); out.q7Door = T.interactAt('door_quarto7'); T.run(0.8);
    T.tp(17.2, ROOF, 18.4, -PI / 2); g.cameraCtl.yaw = -PI / 2; T.hold('KeyW', 1.2); T.run(0.1);
    out.q7Pos = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.found = g.quest.has('foundQuarto7');
    const am0 = T.ammo();
    T.tp(13.0, ROOF, 20.0, 0); out.amulet = T.interactAt('pick_amulet'); out.maxSt = g.player.maxSt; out.amuletAmmo = T.ammo() - am0;
    T.tp(13.6, ROOF, 15.7, -PI / 2); out.diary = T.interactAt('doc_diario_menino');
    // tambor vazio: clique seco, nada muda
    const keep = g.inventory.count('municao_38'), keepL = g.inventory.rounds('revolver'); g.inventory.items.municao_38 = 0; g.inventory.loaded.revolver = 0;
    const dry0 = g.player.dryFires || 0; T.press('Mouse2'); T.run(0.8); out.dry = (g.player.dryFires || 0) - dry0; out.dryAmmo = T.ammo();
    g.inventory.items.municao_38 = keep; g.inventory.loaded.revolver = keepL;
    g.hud.update(1 / 60, g); out.hud = document.getElementById('weapon')?.textContent || '';
    g.saveGame('postoPed');
    const sv = JSON.parse(localStorage.getItem('ocdc_save'));
    out.saved = { weapons: sv.inventory.weapons, ammo: (sv.inventory.items.municao_38 || 0) + (sv.inventory.loaded?.revolver || 0), loaded: sv.inventory.loaded?.revolver, wear: sv.inventory.wear, lock: sv.flags.lockBroken, theater: sv.flags.theaterMoved, amulet: sv.flags.hasAmulet, fe: sv.flags.fireExitShortcut, feDoor: sv.doors.fireExit?.open };
    T.key('KeyM'); T.key('Digit4'); out.mapRooms = g.menus.lastMap?.rooms; T.key('KeyM');
    g.player.setWeapon('machado');
    return out;
  });
  check('escada de incêndio trancada pelo patamar do 2º', peds.feInside === 'ok' && peds.feLockedInside, JSON.stringify(peds));
  check('ala pediátrica: porta pelo telhado e autosave', peds.pedDoor === 'ok' && peds.entered && peds.cp === 'peds' && peds.inPeds[2] < 25.6, JSON.stringify({ p: peds.inPeds, d: peds.pedDoor, o: peds.pedOpen, e: peds.nearE, c: peds.cp }));
  check('facão: coleta no berço, equipa e acorda o Rastejador', peds.facao === 'ok' && peds.wFacao === 'facao' && peds.crawlerDormant && peds.crawlerWoke && peds.ficha === 'ok', JSON.stringify(peds));
  check('facão mata o Enfermeiro da pediatria', !peds.fight.alive && peds.fight.firstDmg >= 15, JSON.stringify(peds.fight));
  check('desgaste: golpes gastam o facão, HUD mostra %, pedra (G) leva a 60%, kit a 100%', peds.wear.c0 < 1 && /%/.test(peds.wear.hud) && peds.wear.bar && peds.wear.worn < 0.5 && peds.wear.noKit && peds.wear.stone && peds.wear.stNo === 'repair' && Math.abs(peds.wear.cStone - 0.6) < 1e-6 && peds.wear.st === 'repair' && peds.wear.c1 === 1 && peds.wear.kit === 0 && peds.wear.repairs >= 2 && peds.wear.after === 'free', JSON.stringify(peds.wear));
  check('posto: chave da segurança, munição ×2 e livro de registros', peds.key === 'ok' && peds.ammo1 === 'ok' && peds.ammoA === 2 && peds.cpPosto === 'postoPed', JSON.stringify(peds));
  check('chave abre a segurança; revólver (+3) e munição (+3)', peds.segLocked && peds.segDoor === 'ok' && peds.segOpen && peds.rev === 'ok' && peds.wRev === 'revolver' && peds.segWoke && peds.ammoB === peds.ammoA + 6, JSON.stringify(peds));
  check('mira manual (Q): retícula, fora do alvo erra, apontada acerta (sem auto-mira)', peds.manual.aimSt === 'aim' && peds.manual.aimK > 0.8 && peds.manual.reticle && peds.manual.miss.shot?.manual && !peds.manual.miss.shot.hit && peds.manual.miss.hp && peds.manual.miss.ammo === 1 && peds.manual.hit.shot?.manual && peds.manual.hit.shot.hit === 'int_seg' && peds.manual.hit.dmg > 0 && peds.manual.hit.state === 'aim' && peds.manual.back === 'free', JSON.stringify(peds.manual));
  check('recarga (T): reserva vai para o tambor sem perder balas', peds.reload.st === 'reload' && peds.reload.r1 === Math.min(6, peds.reload.r0 + (peds.reload.t0 - peds.reload.r0)) && peds.reload.r1 > peds.reload.r0 && peds.reload.t1 === peds.reload.t0 && peds.reload.after === 'free', JSON.stringify({ r: peds.reload, c: peds.cyl }));
  check('tiro do revólver fere o Interno e gasta 1 bala', peds.shot.firstShot && peds.shot.firstShot.ammo[1] === peds.shot.firstShot.ammo[0] - 1 && peds.shot.firstShot.hp[1] < peds.shot.firstShot.hp[0] && !peds.shot.alive, JSON.stringify(peds.shot));
  check('R alterna entre as 4 armas', peds.weapons.length === 4 && new Set(peds.cycle).size === 4, JSON.stringify({ w: peds.weapons, c: peds.cycle }));
  check('escada de incêndio desce ao 2º e abre o atalho por fora (autosave)', peds.feTop === 'ok' && peds.feOut[0] > 41.2 && peds.feBottom[1] < 4.5 && peds.feBottom[2] > 21.4 && peds.feReached && peds.feDoor === 'ok' && peds.feOpen && peds.feIn[0] < 40.6, JSON.stringify({ o: peds.feOut, b: peds.feBottom, i: peds.feIn, cp: peds.cpFe }));
  check('caixinha de música faz barulho e atrai inimigo', peds.music === 'ok' && peds.musicFlag && peds.lure.music >= 2 && peds.lure.lk && Math.hypot(peds.lure.lk[0] - 22.1, peds.lure.lk[1] - 14.7) < 0.5 && peds.lure.d1 < peds.lure.d0 - 3 && peds.lure.trail.at(-1)[1] < 22, JSON.stringify(peds.lure));
  check('teatrinho só se move após o desenho e revela o cadeado', peds.drawing === 'ok' && peds.readDrawing && peds.q7Hidden && peds.theater === 'ok' && peds.moved && peds.theaterZ > 19, JSON.stringify(peds));
  check('cadeado resiste ao facão e quebra com bala', peds.lockAfterMelee && peds.lockShot.broken && peds.lockShot.unlocked && peds.lockShot.ammo[1] === peds.lockShot.ammo[0] - 1, JSON.stringify(peds.lockShot));
  check('Quarto 7 (segredo): amuleto (fôlego +25) e 4 balas', peds.q7Door === 'ok' && peds.q7Pos[0] < 15.8 && peds.found && peds.amulet === 'ok' && peds.maxSt === 125 && peds.amuletAmmo === 4 && peds.diary === 'ok', JSON.stringify(peds));
  check('tambor vazio: clique seco sem efeito', peds.dry >= 1 && peds.dryAmmo === 0, JSON.stringify({ d: peds.dry, a: peds.dryAmmo }));
  check('HUD mostra tambor e reserva do revólver', /\d\/6/.test(peds.hud) && /reserva/i.test(peds.hud), peds.hud);
  check('save guarda armas, munição, cadeado, teatrinho, amuleto e atalho', peds.saved.weapons?.length === 4 && peds.saved.ammo > 0 && peds.saved.lock && peds.saved.theater && peds.saved.amulet && peds.saved.fe && peds.saved.feDoor, JSON.stringify(peds.saved));
  check('mapa do 3º andar mostra a pediatria', peds.mapRooms >= 6, String(peds.mapRooms));
  await page.screenshot({ path: SHOTS + '09-pediatria.png' });
  // --- Maternidade (2º andar), lança improvisada, arquivo morto (subsolo) e sala de batismo (segredo)
  const mat = await page.evaluate(() => {
    const g = __ocdc, D = g.level.doors, out = {}, E = (id) => g.enemies.find((e) => e.id === id);
    const ROOF = 7.3, UP2 = 4, LO = -5, PI = Math.PI;
    const MAT = ['enf_mat', 'int_parto', 'ras_aloj', 'int_morto', 'ras_morto'];
    g.enemies.forEach((e) => { if (e.alive && e.pos.y > 3 && !MAT.includes(e.id)) e.setDeadInstant(); });
    out.spawns = MAT.map((id) => !!E(id)?.alive);
    E('enf_mat').setDeadInstant();
    g.player.hp = 100; g.player.setWeapon('machado');
    // porta da maternidade trancada sem a chave
    T.tp(18.6, UP2, 15.2, PI); out.lockedTry = T.interactAt('door_maternity'); T.run(0.3); out.lockedStill = D.maternity.locked && !D.maternity.open;
    // chave no quadro da segurança (3º andar)
    T.tp(40.0, ROOF, 17.0, PI / 2); out.keyMat = T.interactAt('pick_key_mat'); out.hasKey = g.inventory.has('chave_maternidade');
    T.tp(18.6, UP2, 15.2, PI); out.matDoor = T.interactAt('door_maternity'); T.run(0.8);
    out.matOpen = D.maternity.open && !D.maternity.locked && g.quest.has('maternityOpen') && !g.inventory.has('chave_maternidade');
    g.cameraCtl.yaw = PI; T.hold('KeyW', 1.0); T.run(0.1);
    out.inMat = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.entered = g.quest.has('enteredMaternity'); out.cp = g.checkpoint;
    // sala de parto: lança no suporte de soro
    T.tp(18.0, UP2, 12.3, PI); out.partoDoor = T.interactAt('door_salaParto'); T.run(0.8);
    const ip = E('int_parto'); out.partoDormant = ip.dormant;
    T.tp(20.6, UP2, 6.7, PI); out.lanca = T.interactAt('pick_lanca'); out.wLanca = g.player.weapon?.id; out.partoWoke = !ip.dormant;
    out.lanceHidden = !g.level.pickupMeshes.lanca.visible;
    // lança em combate real: estocadas a ~1,5 m
    const hp0 = ip.hp; let thrusts = 0, firstDmg = 0, firstDist = 0;
    for (let i = 0; i < 70 && ip.alive; i++) {
      g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 20; k++) T.press('Mouse0');
      let dx = 18 - ip.pos.x, dz = 6.5 - ip.pos.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      T.tp(ip.pos.x + dx * 1.5, UP2, ip.pos.z + dz * 1.5, 0);
      const y = Math.atan2(ip.pos.x - g.player.pos.x, ip.pos.z - g.player.pos.z); g.player.yaw = y; g.cameraCtl.yaw = y;
      const hb = ip.hp, d = Math.hypot(ip.pos.x - g.player.pos.x, ip.pos.z - g.player.pos.z);
      T.press('Mouse0'); thrusts++; T.run(0.75); if (!firstDmg && ip.hp < hb) { firstDmg = hb - ip.hp; firstDist = +d.toFixed(2); }
    }
    out.fight = { alive: ip.alive, hp0, thrusts, firstDmg, firstDist };
    // R alterna entre as 5 armas
    out.weapons = [...g.inventory.weapons];
    const cyc = []; for (let i = 0; i < 5; i++) { T.press('KeyR'); cyc.push(g.player.weapon?.id); T.run(0.1); } out.cycle = cyc;
    g.player.setWeapon('lanca'); g.player.hp = 100;
    T.tp(16.5, UP2, 8.6, -PI / 2); out.prontuario = T.interactAt('doc_prontuario_parto');
    // alojamento: manivela, carta, bandagem
    T.tp(26.5, UP2, 12.3, PI); out.alojDoor = T.interactAt('door_alojamento'); T.run(0.8);
    const ra = E('ras_aloj'); out.alojDormant = ra.dormant;
    T.tp(23.6, UP2, 5.3, PI); out.crank = T.interactAt('pick_manivela'); out.alojWoke = !ra.dormant; out.hasCrank = g.inventory.has('manivela');
    ra.setDeadInstant();
    T.tp(26.5, UP2, 4.9, PI); out.carta = T.interactAt('doc_carta_mae');
    const b0 = g.inventory.count('bandagem');
    T.tp(29.4, UP2, 4.9, PI); out.band = T.interactAt('pick_band_mat'); out.bandDiff = g.inventory.count('bandagem') - b0;
    const k0 = g.inventory.count('kit_reparo');
    T.tp(29.9, UP2, 4.9, PI); out.kit = T.interactAt('pick_kit_mat'); out.kitDiff = g.inventory.count('kit_reparo') - k0;
    // posto obstétrico: chave do arquivo morto, livro de partos, munição, livro de registros
    T.tp(34.5, UP2, 12.3, PI); out.postoDoor = T.interactAt('door_postoObst'); T.run(0.8);
    T.tp(36.9, UP2, 6.0, PI / 2); out.keyArq = T.interactAt('pick_key_arqm');
    T.tp(32.9, UP2, 5.5, -PI / 2); out.livro = T.interactAt('doc_livro_partos'); T.run(0.1); out.readBook = g.quest.has('readBirthBook');
    const a0 = g.inventory.count('municao_38');
    T.tp(32.9, UP2, 7.8, -PI / 2); out.ammo = T.interactAt('pick_ammo_mat'); out.ammoDiff = g.inventory.count('municao_38') - a0;
    T.tp(36.6, UP2, 3.9, PI); out.book = T.interactAt('book_mat'); out.cpBook = g.checkpoint;
    // arquivo morto: porta de ferro no fundo do Arquivo (subsolo)
    g.player.hp = 100;
    T.tp(35.2, LO, 8.8, PI / 2); out.daDoor = T.interactAt('door_deadArchive'); T.run(0.8);
    out.daOpen = D.deadArchive.open && g.quest.has('deadArchiveOpen') && !g.inventory.has('chave_arquivo_morto');
    g.cameraCtl.yaw = PI / 2; T.hold('KeyW', 0.9); T.run(0.1);
    out.inDa = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.daEntered = g.quest.has('enteredDeadArchive'); out.cpDa = g.checkpoint;
    E('int_morto').setDeadInstant();
    T.tp(45.0, LO, 8.0, 0); out.rn0 = T.interactAt('doc_prontuario_rn0');
    // arquivo deslizante: sem manivela só examina; com ela, desliza e revela o vão
    g.inventory.remove('manivela');
    T.tp(42.9, LO, -1.5, PI); out.crankNo = T.interactAt('crank_shelf'); T.run(0.2);
    out.noteRolling = g.quest.has('note_rolling') && !g.quest.has('shelfMoved');
    T.tp(41, LO, -1.6, PI); g.cameraCtl.yaw = PI; T.hold('KeyW', 0.8); out.blockedZ = +g.player.pos.z.toFixed(2);
    g.inventory.add('manivela');
    const rm = E('ras_morto'); out.rmDormant = rm.dormant;
    T.tp(42.9, LO, -1.5, PI); out.crankYes = T.interactAt('crank_shelf'); T.run(2.0);
    out.shelf = { moved: g.quest.has('shelfMoved'), minX: +g.level.rolling.collider.min.x.toFixed(2), gx: +(g.level.rolling.group.position.x - g.level.rolling.x).toFixed(2), crankGone: !g.inventory.has('manivela'), rmWoke: !rm.dormant };
    rm.setDeadInstant();
    g.player.hp = 100;
    T.tp(41, LO, -1.6, PI); g.cameraCtl.yaw = PI; T.hold('KeyW', 1.3); T.run(0.1);
    out.inBt = g.player.pos.toArray().map((v) => +v.toFixed(2)); out.found = g.quest.has('foundBatismo');
    // pia sem a pulseira: só examina (pista "o zero e o sete"), sem cena
    T.tp(42.7, LO, -4.6, PI); out.fontNo = T.interactAt('font_rite'); out.fontNoState = g.state; out.fontNote = g.quest.has('note_font');
    const am0 = g.inventory.count('municao_38'), bb0 = g.inventory.count('bandagem');
    T.tp(38.8, LO, -4.5, PI); out.bracelet = T.interactAt('pick_pulseira');
    out.reward = { ammo: g.inventory.count('municao_38') - am0, band: g.inventory.count('bandagem') - bb0, heal: g.player.healAmount, item: g.inventory.has('pulseira_recem_nascido') };
    T.tp(41.4, LO, -3.7, PI); out.ata = T.interactAt('doc_ata_batismo');
    // revelação RN 0: dente (Quarto 7) + pulseira (altar) na cinza da pia → cena curta
    g.player.hp = 40;
    out.riteItems = g.inventory.has('amuleto_menino') && g.inventory.has('pulseira_recem_nascido');
    T.tp(42.7, LO, -4.6, PI); out.ritePrompt = g.interact.list.find((i) => i.id === 'font_rite').prompt();
    out.rite = T.interactAt('font_rite'); out.csState = g.state; out.cap1 = g.cutscene?.caption;
    T.run(4.6);
    out.cap2 = g.cutscene?.caption; out.csHudHidden = document.getElementById('hud').classList.contains('hidden');
    out.csOverlay = !document.getElementById('cutscene').classList.contains('hidden');
    out.camAway = +g.camera.position.distanceTo(g.player.pos).toFixed(2);
    return out;
  });
  await page.screenshot({ path: SHOTS + '11-revelacao.png' });
  Object.assign(mat, await page.evaluate(() => {
    const g = __ocdc, LO = -5, out = {};
    out.csStill = g.state === 'cutscene';
    T.press('KeyE'); out.afterSkip = g.state; out.readingDoc = document.getElementById('reader') && !document.getElementById('reader').classList.contains('hidden');
    out.skipped = g.script.rn0Skipped;
    if (g.state === 'reading') g.closeOverlay();
    T.run(0.2);
    out.rn0r = { flag: g.quest.has('rn0Revealed'), doc: g.inventory.documents.includes('contagem_confraria'), hp: g.player.hp === g.player.maxHp, cp: g.checkpoint, state: g.state,
      ash: g.level.fontAsh.userData.settled === true, overlay: document.getElementById('cutscene').classList.contains('hidden'), hud: !document.getElementById('hud').classList.contains('hidden'),
      gone: !g.interact.list.find((i) => i.id === 'font_rite').enabled(), cs: g.cutscene };
    const PI = Math.PI;
    g.saveGame('deadArchive');
    const sv = JSON.parse(localStorage.getItem('ocdc_save'));
    out.saved = { weapons: sv.inventory.weapons, shelf: sv.flags.shelfMoved, br: sv.flags.hasBracelet, mat: sv.doors.maternity?.open, da: sv.doors.deadArchive?.open };
    g.player.setWeapon('machado');
    return out;
  }));
  check('maternidade: porta trancada sem chave; chave no quadro da segurança', mat.spawns.every(Boolean) && mat.lockedTry === 'ok' && mat.lockedStill && mat.keyMat === 'ok' && mat.hasKey, JSON.stringify(mat));
  check('chave abre a maternidade pela secretaria (autosave)', mat.matDoor === 'ok' && mat.matOpen && mat.entered && mat.cp === 'maternity' && mat.inMat[2] < 13.9, JSON.stringify(mat.inMat));
  check('lança improvisada: coleta, equipa e acorda o Interno', mat.partoDoor === 'ok' && mat.lanca === 'ok' && mat.wLanca === 'lanca' && mat.partoDormant && mat.partoWoke && mat.lanceHidden, JSON.stringify(mat));
  check('lança mata o Interno da sala de parto à distância', !mat.fight.alive && mat.fight.firstDmg >= 15 && mat.fight.firstDist >= 1.2, JSON.stringify(mat.fight));
  check('R alterna entre as 5 armas (com a lança)', mat.weapons.length === 5 && mat.weapons.includes('lanca') && new Set(mat.cycle).size === 5, JSON.stringify({ w: mat.weapons, c: mat.cycle }));
  check('alojamento: manivela acorda o Rastejador; carta e bandagem', mat.alojDoor === 'ok' && mat.crank === 'ok' && mat.hasCrank && mat.alojDormant && mat.alojWoke && mat.carta === 'ok' && mat.band === 'ok' && mat.bandDiff === 1 && mat.prontuario === 'ok', JSON.stringify(mat));
  check('posto obstétrico: chave do arquivo morto, livro de partos, munição ×2 e save', mat.postoDoor === 'ok' && mat.keyArq === 'ok' && mat.livro === 'ok' && mat.readBook && mat.ammo === 'ok' && mat.ammoDiff === 2 && mat.cpBook === 'maternity', JSON.stringify(mat));
  check('arquivo morto: porta de ferro abre com a chave (autosave)', mat.daDoor === 'ok' && mat.daOpen && mat.daEntered && mat.cpDa === 'deadArchive' && mat.inDa[0] > 36.6 && mat.rn0 === 'ok', JSON.stringify(mat));
  check('arquivo deslizante: sem manivela só examina e bloqueia o vão', mat.crankNo === 'ok' && mat.noteRolling && mat.blockedZ > -2.3, JSON.stringify(mat));
  check('manivela desliza o arquivo e acorda o Rastejador', mat.crankYes === 'ok' && mat.shelf.moved && Math.abs(mat.shelf.minX - 36.8) < 0.05 && Math.abs(mat.shelf.gx + 2.8) < 0.05 && mat.shelf.crankGone && mat.rmDormant && mat.shelf.rmWoke, JSON.stringify(mat.shelf));
  check('Sala de batismo (segredo): pulseira (bandagem +65), 3 balas e bandagem', mat.inBt[2] < -3.1 && mat.found && mat.bracelet === 'ok' && mat.reward.ammo === 3 && mat.reward.band === 1 && mat.reward.heal === 65 && mat.reward.item && mat.ata === 'ok', JSON.stringify({ p: mat.inBt, r: mat.reward, b: mat.bracelet, a: mat.ata }));
  check('kit de reparo na maternidade', mat.kit === 'ok' && mat.kitDiff === 1, JSON.stringify({ k: mat.kit, d: mat.kitDiff }));
  check('pia de batismo sem a pulseira: só a pista "o zero e o sete"', mat.fontNo === 'ok' && mat.fontNoState === 'playing' && mat.fontNote, JSON.stringify({ f: mat.fontNo, s: mat.fontNoState, n: mat.fontNote }));
  check('revelação RN 0: dente + pulseira na cinza abrem a cena (HUD oculto, câmera própria, falas)', mat.riteItems && /dente/.test(mat.ritePrompt) && mat.rite === 'ok' && mat.csState === 'cutscene' && /cinza/.test(mat.cap1 || '') && /zero/.test(mat.cap2 || '') && mat.csHudHidden && mat.csOverlay && mat.camAway > 0.5 && mat.csStill, JSON.stringify({ p: mat.ritePrompt, r: mat.rite, s: mat.csState, c1: mat.cap1, c2: mat.cap2, h: mat.csHudHidden, o: mat.csOverlay, cam: mat.camAway }));
  check('fim da revelação: pula com E, documento final, vida cheia, cinza assentada e autosave', mat.skipped && mat.afterSkip === 'reading' && mat.readingDoc && mat.rn0r.flag && mat.rn0r.doc && mat.rn0r.hp && mat.rn0r.cp === 'deadArchive' && mat.rn0r.state === 'playing' && mat.rn0r.ash && mat.rn0r.overlay && mat.rn0r.hud && mat.rn0r.gone && !mat.rn0r.cs, JSON.stringify({ a: mat.afterSkip, r: mat.readingDoc, s: mat.skipped, rn0: mat.rn0r }));
  check('save guarda lança, portas, arquivo deslizante e pulseira', mat.saved.weapons?.length === 5 && mat.saved.shelf && mat.saved.br && mat.saved.mat && mat.saved.da, JSON.stringify(mat.saved));
  const grabHud = await page.evaluate(() => { const g = __ocdc; g.hud.update(1 / 60, g); const el = document.getElementById('struggle'); return { st: g.player.state, hidden: !el || el.classList.contains('hidden') || getComputedStyle(el).display === 'none' }; });
  check('HUD sem "AGARRADO!" fora do agarrão', grabHud.st !== 'grabbed' && grabHud.hidden, JSON.stringify(grabHud));
  await page.screenshot({ path: SHOTS + '10-maternidade.png' });
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
    const e = document.getElementById('endRn0'); out.endRn0 = e && !e.classList.contains('hidden') ? e.textContent : '';
    out.endStats = document.getElementById('chapterEnd')?.textContent || '';
    return out;
  });
  check('portão de serviço abre e permite passagem', end.x > 37, JSON.stringify(end));
  check('fim do capítulo exibido', end.state === 'end', JSON.stringify(end));
  check('fim do capítulo reconhece a revelação RN 0', /Davi|zero|sete/.test(end.endRn0) && /RN 0: vista/.test(end.endStats), JSON.stringify({ r: end.endRn0, s: end.endStats.slice(0, 300) }));
  await page.screenshot({ path: SHOTS + '05-fim.png' });
  // --- Save persistente e "Continuar"
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const cont = await page.evaluate(() => ({ visible: !document.getElementById('btnContinue').classList.contains('hidden'), save: JSON.parse(localStorage.getItem('ocdc_save')) }));
  check('save versionado com progresso persistido', cont.visible && cont.save.version === 2 && cont.save.inventory.possuiMachado === true && cont.save.flags.bossDead && cont.save.deadEnemies.length >= 2, JSON.stringify({ v: cont.save.version, cp: cont.save.checkpoint, dead: cont.save.deadEnemies }));
  // --- Continuar de um save pré-chefe e morte → recarregar
  const death = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ocdc_save')); s.flags = { ...s.flags, bossDead: false, gateOpen: false, chapterDone: false }; s.checkpoint = 'pre_boss';
    localStorage.setItem('ocdc_save', JSON.stringify(s));
    document.getElementById('btnContinue').click();
    const g = __ocdc; const r = { state: g.state, pos: g.player.pos.toArray(), weapons: [...g.inventory.weapons], wall: !g.level.crackedWall.panel.visible && g.level.expurgoGate.open, sharp: g.player.sharpened, tank: !g.level.tanks.o2_cor.group.visible, hammerHidden: !g.level.pickupMeshes.hammer.visible, lock: !g.level.padlock.chain.visible, theater: g.level.theater.collider.min.z > 19, maxSt: g.player.maxSt, fe: g.level.doors.fireExit.open, ammo: g.inventory.count('municao_38'), lance: !g.level.pickupMeshes.lanca.visible, shelf: Math.abs(g.level.rolling.group.position.x - g.level.rolling.x + 2.8) < 0.05 && g.level.rolling.collider.min.x < 37, heal: g.player.healAmount, matDoor: g.level.doors.maternity.open, rn0: g.quest.has('rn0Revealed') && g.level.fontAsh.userData.settled === true && !g.interact.list.find((i) => i.id === 'font_rite').enabled(), wear: { ...g.inventory.wear }, loaded: g.inventory.rounds('revolver'), kitGone: !g.level.pickupMeshes.kit_mat.visible };
    g.player.takeHit({ dmg: 999, from: { x: 0, y: 0, z: 0 }, blockable: false });
    T.run?.(0);
    return r;
  });
  // o tempo de jogo avança pelo requestAnimationFrame (lento no render por software): espera até 30 s
  await page.waitForFunction(() => !document.getElementById('dead').classList.contains('hidden'), { timeout: 30000 }).catch(() => {});
  const deadScr = await page.$eval('#dead', (e) => !e.classList.contains('hidden'));
  const dinfo = await page.evaluate(() => ({ st: __ocdc.state, hp: __ocdc.player.hp, alive: __ocdc.player.alive, pst: __ocdc.player.state, dy: __ocdc.dyingT }));
  check('continuar carrega checkpoint pré-chefe', death.state === 'playing' && Math.abs(death.pos[1] + 5) < 0.1, JSON.stringify(death));
  check('carregar save restaura armas, parede derrubada, afiação e cilindro', death.weapons.length === 5 && death.wall && death.sharp && death.tank && death.hammerHidden, JSON.stringify(death));
  check('carregar save restaura pediatria (cadeado, teatrinho, amuleto, atalho, munição)', death.lock && death.theater && death.maxSt === 125 && death.fe && death.ammo > 0, JSON.stringify(death));
  check('carregar save restaura maternidade e arquivo morto (lança, porta, arquivo deslizante, pulseira)', death.lance && death.shelf && death.heal === 65 && death.matDoor, JSON.stringify(death));
  check('carregar save restaura revelação RN 0, desgaste, tambor e kit coletado', death.rn0 && Object.keys(death.wear).length > 0 && death.loaded > 0 && death.kitGone, JSON.stringify({ r: death.rn0, w: death.wear, l: death.loaded, k: death.kitGone }));
  check('morte mostra tela e permite recarregar', deadScr, JSON.stringify(dinfo));
  await page.click('#btnRetry'); await new Promise((r) => setTimeout(r, 500));
  check('recarregar após morte', await page.evaluate(() => __ocdc.state === 'playing' && __ocdc.player.hp > 0));
  await page.waitForFunction(() => __ocdc.player.model.ready, { timeout: 15000 }).catch(() => {});
  const revLoad = await page.evaluate(() => { const g = __ocdc, M = g.player.model; return { ready: M.ready, possui: M.sistema?.possuiMachado, axe: M.axe?.visible, weapon: g.player.weapon?.id, world: g.level.pickupMeshes.axe.visible }; });
  check('REV6: save carregado restaura posse/arma do machado', revLoad.ready && revLoad.possui && revLoad.axe === (revLoad.weapon === 'machado') && !revLoad.world, JSON.stringify(revLoad));
  const glb = await page.evaluate(async () => { const r = await fetch('./models/elias_rev6.glb'); const b = await r.arrayBuffer(); return { status: r.status, size: b.byteLength, magic: new TextDecoder().decode(new Uint8Array(b, 0, 4)) }; });
  check('GLB do Elias servido pelo build (./models/elias_rev6.glb)', glb.status === 200 && glb.magic === 'glTF' && glb.size > 5e6, JSON.stringify(glb));
  // --- desempenho aproximado (render real, swiftshader)
  const fps = await page.evaluate(() => new Promise((res) => { const g = __ocdc; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / 3, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, lights: (() => { let k = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) k++; }); return k; })(), allLights: (() => { let k = 0; g.scene.traverse((o) => { if (o.isLight) k++; }); return k; })(), meshes: (() => { let k = 0; g.scene.traverse((o) => { if (o.isMesh) k++; }); return k; })() }); }; requestAnimationFrame(f); }));
  check('orçamento de luzes limita luzes ativas', fps.lights <= fps.allLights - 16, 'visíveis: ' + fps.lights + ' de ' + fps.allLights);
  check('renderização contínua', fps.fps > 2, fps.fps.toFixed(1) + ' fps (software, sem GPU) ' + JSON.stringify(fps));
  await page.screenshot({ path: SHOTS + '06-continuar.png' });
  // --- Capítulo 2 — Fumaça (prévia jogável): passagem real pelo fim do Capítulo 1
  await page.evaluate(() => { const g = __ocdc; g.quest.set('chapterDone'); g.endChapter(); });
  await new Promise((r) => setTimeout(r, 300));
  const endBtn = await page.$eval('#btnEndNext', (e) => ({ text: e.textContent, visible: !!e.offsetParent }));
  await page.click('#btnEndNext'); await new Promise((r) => setTimeout(r, 400));
  await inject();
  const c2a = await page.evaluate(() => {
    const g = __ocdc, out = {}, S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    const s0 = S(); out.start = { st: g.state, ch: g.chapter, sch: s0.chapter, cp: s0.checkpoint, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), obj: g.quest.current(), fuse: g.inventory.has('fusivel'), axe: g.inventory.weapons.includes('machado'), docs: g.inventory.documents.length, enemies: g.enemies.map((e) => e.type), boss: !!g.boss };
    T.run(0.3);
    // colisão no muro do hospital (oeste)
    T.tp(1.6, 0, 4, -Math.PI / 2); T.hold('KeyW', 1.0); out.wallX = +g.player.pos.x.toFixed(2);
    // caçador da rua investiga um barulho
    const c = g.enemies.find((e) => e.id === 'cac_rua'); T.tp(3, 0, 4, Math.PI / 2);
    g.perception.noise({ x: c.pos.x - 3, y: 0, z: c.pos.z }, 5, 'test'); T.run(0.4); out.cacState = c.state;
    // beco: jornal (objetivo opcional) e bandagem
    out.sideBefore = g.quest.side().length;
    T.tp(11.4, 0, 13.6, 0); out.paper = T.interactAt('doc_jornal_vespera'); T.run(0.1);
    out.readPaper = g.quest.has('c2_readPaper');
    // porta do depósito
    T.tp(24, 0, 6, 0); out.door = T.interact('door_c2_depot'); T.run(0.8); out.doorOpen = g.level.doors.c2_depot.open;
    T.tp(24, 0, 10.5, 0); T.run(0.3); out.inDepot = g.quest.has('c2_inDepot'); out.depSave = S().checkpoint; out.obj2 = g.quest.current();
    // porta de carga emperrada
    T.tp(38.4, 0, 14, Math.PI / 2); out.shut1 = T.interact('door_c2_shutter'); out.shutLocked = g.level.doors.c2_shutter.locked && g.quest.has('note_c2_shutter');
    // escritório: porta, manivela (acorda o caçador do depósito), bilhete e livro de registros
    T.tp(37, 0, 16.6, 0); out.office = T.interact('door_c2_office'); T.run(0.8); out.officeOpen = g.level.doors.c2_office.open;
    const d = g.enemies.find((e) => e.id === 'cac_dep'); out.depDormant0 = d.dormant;
    T.tp(38.7, 0, 19.4, 0); out.crank = T.interactAt('pick_c2_crank'); out.hasCrank = g.inventory.has('manivela_carga'); out.depDormant1 = d.dormant;
    d.setDeadInstant();
    T.tp(35.5, 0, 22.0, 0); out.note = T.interactAt('doc_bilhete_capataz'); T.run(0.1); out.readNote = g.quest.has('c2_readNote');
    T.tp(38.6, 0, 22.2, 0); out.book = T.interactAt('c2_book'); const s1 = S(); out.bookSave = { cp: s1.checkpoint, ch: s1.chapter, dead: s1.deadEnemies };
    // porta de carga com a manivela + passagem para o pátio
    T.tp(38.4, 0, 14, Math.PI / 2); out.shut2 = T.interact('door_c2_shutter'); T.run(1.5);
    out.shutOpen = g.level.doors.c2_shutter.open && g.quest.has('c2_shutterOpen') && !g.inventory.has('manivela_carga');
    T.tp(38.8, 0, 14, Math.PI / 2); T.hold('KeyW', 1.2); out.yardX = +g.player.pos.x.toFixed(2);
    // ponto do bonde: o bonde não vem e o portão dos trilhos se abre
    out.gate0 = g.level.doors.c2_yardgate.locked;
    T.tp(43, 0, 25.6, 0); out.tram = T.interactAt('c2_tram'); const s2 = S(); out.tramSave = { cp: s2.checkpoint, slice: s2.flags.c2_sliceDone };
    out.objEnd = g.quest.current(); T.run(1.2); out.gateOpen = g.level.doors.c2_yardgate.open && !g.level.doors.c2_yardgate.locked;
    T.key('KeyM'); out.mapState = g.state; out.map = g.menus.lastMap;
    out.tabs = [...document.querySelectorAll('.map-tab')].filter((e) => !e.classList.contains('hidden')).map((e) => e.textContent);
    out.where = document.getElementById('mapWhere').textContent;
    g.closeOverlay();
    out.lights = (() => { let k = 0, v = 0; g.scene.traverse((o) => { if (o.isLight) { k++; if (o.visible) v++; } }); return { k, v }; })();
    return out;
  });
  check('Cap. 2: botão do fim do Cap. 1 leva ao Capítulo 2', /Capítulo 2/.test(endBtn.text) && endBtn.visible, JSON.stringify(endBtn));
  check('Cap. 2: Bairro Operário carregado com save do Cap. 2 (sem itens-chave, com machado)', c2a.start.st === 'playing' && c2a.start.ch === 2 && c2a.start.sch === 2 && c2a.start.cp === 'c2_gate' && Math.abs(c2a.start.pos[0] - 3) < 0.3 && !c2a.start.fuse && c2a.start.axe && c2a.start.boss && c2a.start.enemies.filter((t) => t === 'cacador').length === 4 && c2a.start.enemies.filter((t) => t === 'carvoeiro').length === 3 && /depósito/.test(c2a.start.obj), JSON.stringify(c2a.start));
  check('Cap. 2: colisão no muro do hospital', c2a.wallX > 1.1 && c2a.wallX < 1.8, 'x=' + c2a.wallX);
  check('Cap. 2: caçador vai atrás do barulho', c2a.cacState === 'investigate', c2a.cacState);
  check('Cap. 2: jornal do beco conclui objetivo opcional', c2a.paper === 'ok' && c2a.readPaper && c2a.sideBefore >= 1, JSON.stringify({ p: c2a.paper, r: c2a.readPaper }));
  check('Cap. 2: porta do depósito abre e entrada faz autosave', c2a.door === 'ok' && c2a.doorOpen && c2a.inDepot && c2a.depSave === 'c2_depot' && /manivela/.test(c2a.obj2), JSON.stringify({ d: c2a.door, s: c2a.depSave, o: c2a.obj2 }));
  check('Cap. 2: porta de carga emperrada sem manivela', c2a.shut1 === 'ok' && c2a.shutLocked, c2a.shut1);
  check('Cap. 2: manivela no escritório desperta o caçador do depósito', c2a.office === 'ok' && c2a.officeOpen && c2a.crank === 'ok' && c2a.hasCrank && c2a.depDormant0 && !c2a.depDormant1, JSON.stringify({ o: c2a.office, c: c2a.crank, d0: c2a.depDormant0, d1: c2a.depDormant1 }));
  check('Cap. 2: bilhete do capataz e livro de registros (save)', c2a.note === 'ok' && c2a.readNote && c2a.book === 'ok' && c2a.bookSave.cp === 'c2_office' && c2a.bookSave.ch === 2 && c2a.bookSave.dead.includes('cac_dep'), JSON.stringify({ n: c2a.note, b: c2a.book, s: c2a.bookSave }));
  check('Cap. 2: manivela abre a porta de carga e o pátio é alcançável', c2a.shut2 === 'ok' && c2a.shutOpen && c2a.yardX > 40.6, JSON.stringify({ s: c2a.shut2, o: c2a.shutOpen, x: c2a.yardX }));
  check('Cap. 2: ponto do bonde salva e abre o portão para a Rua do Carvão', c2a.gate0 && c2a.tram === 'ok' && c2a.tramSave.cp === 'c2_yard' && c2a.tramSave.slice && c2a.gateOpen && /Rua do Carvão/.test(c2a.objEnd), JSON.stringify({ g: c2a.gate0, t: c2a.tram, s: c2a.tramSave, o: c2a.objEnd, open: c2a.gateOpen }));
  check('Cap. 2: mapa mostra só o Bairro Operário', c2a.mapState === 'map' && c2a.tabs.length === 1 && c2a.tabs[0] === 'Bairro Operário' && c2a.map?.rooms >= 3 && /pátio|Pátio/i.test(c2a.where), JSON.stringify({ t: c2a.tabs, m: c2a.map, w: c2a.where }));
  check('Cap. 2: orçamento de luzes', c2a.lights.v <= 16, JSON.stringify(c2a.lights));
  await page.screenshot({ path: SHOTS + '12-bairro-patio.png' });

  // --- Rua do Carvão → carvoaria → fábrica de fumaça
  const c2c = await page.evaluate(() => {
    const g = __ocdc, out = {}, S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    const E = (id) => g.enemies.find((e) => e.id === id);
    const lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    let maxL = 0; const L = () => { maxL = Math.max(maxL, lights()); };
    T.tp(43, 0, 28.6, 0); T.hold('KeyW', 1.4); out.coalZ = +g.player.pos.z.toFixed(2); T.run(0.1);
    out.inCoal = g.quest.has('c2_inCoal'); out.coalSave = S().checkpoint; out.obj = g.quest.current(); L();
    // carvoeiro: lento, resistente e sofre dano do machado
    const cv = E('carv_rua'); out.carv = { hp: cv.hp, speed: cv.def.runSpeed ?? cv.def.speed, type: cv.type };
    cv.wake(); T.tp(cv.pos.x, 0, cv.pos.z - 1.3, 0); T.run(0.05); T.press('Mouse0'); T.run(0.7); out.carvHurt = cv.hp < out.carv.hp;
    cv.setDeadInstant(); E('cac_coal').setDeadInstant();
    T.tp(43, 0, 40, 0); T.run(0.3); L();
    // carvoaria: porta, chave (acorda o Quintino), escala e livro
    T.tp(39.0, 0, 43, -Math.PI / 2); out.carvDoor = T.interact('door_c2_carv'); T.run(0.9); out.carvOpen = g.level.doors.c2_carv.open;
    T.tp(35.5, 0, 43, 0); T.run(0.2); out.inCarv = g.quest.has('c2_inCarv'); L();
    const q = E('carv_quintino'); out.qDormant0 = q.dormant;
    T.tp(36.6, 0, 45.9, 0); out.key = T.interactAt('pick_c2_factory_key'); out.hasKey = g.inventory.has('chave_fabrica'); out.qDormant1 = q.dormant;
    q.setDeadInstant();
    T.tp(35.6, 0, 45.9, 0); out.roster = T.interactAt('doc_escala_turno'); T.run(0.1); out.readRoster = g.quest.has('c2_readRoster');
    T.tp(35.7, 0, 41.0, Math.PI); out.cbook = T.interactAt('c2_carv_book'); out.cbookSave = S().checkpoint;
    // portão da fábrica com a chave
    T.tp(43, 0, 58.2, 0); out.fdoor = T.interact('door_c2_factory'); T.run(1.6);
    out.fOpen = g.level.doors.c2_factory.open && g.quest.has('c2_factoryOpen') && !g.inventory.has('chave_fabrica');
    T.tp(43, 0, 58.8, 0); T.hold('KeyW', 1.4); out.fZ = +g.player.pos.z.toFixed(2); T.run(0.1);
    out.inFactory = g.quest.has('c2_inFactory'); out.fSave = S().checkpoint; L();
    E('cac_fab').setDeadInstant();
    // casa das fornalhas travada até as duas válvulas
    T.tp(45, 0, 76.6, 0); out.arena0 = T.interact('door_c2_arena'); out.arenaLocked0 = g.level.doors.c2_arena.locked;
    const w = E('carv_fab'); out.wDormant0 = w.dormant;
    T.tp(37.6, 0, 75.0, -Math.PI / 2); out.vA = T.interactAt('c2_valveA'); out.wDormant1 = w.dormant; out.valves1 = g.quest.has('c2_valves');
    w.setDeadInstant();
    T.tp(54.9, 0, 63.6, Math.PI / 2); out.vB = T.interactAt('c2_valveB'); T.run(0.5);
    out.valves = g.quest.has('c2_valves') && !g.level.doors.c2_arena.locked; out.wheelSpun = g.level.valveB.wheel.rotation.z !== 0;
    T.tp(52.6, 0, 62.4, Math.PI); out.diary = T.interactAt('doc_diario_fornalheiro'); T.run(0.1); out.readDiary = g.quest.has('c2_readDiary');
    T.tp(47.7, 0, 76.0, 0); out.pbook = T.interactAt('c2_preboss_book'); out.pbookSave = S().checkpoint;
    T.tp(45, 0, 64, 0); T.run(0.4); L();
    out.maxLights = maxL; out.obj2 = g.quest.current();
    T.key('KeyM'); out.map = g.menus.lastMap; out.where = document.getElementById('mapWhere').textContent; g.closeOverlay();
    T.tp(43, 0, 40, 0); T.run(0.4);
    return out;
  });
  check('Cap. 2: portão do pátio leva à Rua do Carvão (autosave)', c2c.coalZ > 30.6 && c2c.inCoal && c2c.coalSave === 'c2_coal' && /carvoaria|Carvoaria/i.test(c2c.obj), JSON.stringify({ z: c2c.coalZ, s: c2c.coalSave, o: c2c.obj }));
  check('Cap. 2: carvoeiro é robusto e sofre dano do machado', c2c.carv.type === 'carvoeiro' && c2c.carv.hp >= 120 && c2c.carvHurt, JSON.stringify(c2c.carv));
  check('Cap. 2: carvoaria — porta, chave da fábrica acorda Quintino, escala e livro', c2c.carvDoor === 'ok' && c2c.carvOpen && c2c.inCarv && c2c.key === 'ok' && c2c.hasKey && c2c.qDormant0 && !c2c.qDormant1 && c2c.roster === 'ok' && c2c.readRoster && c2c.cbook === 'ok' && c2c.cbookSave === 'c2_carv', JSON.stringify(c2c));
  check('Cap. 2: chave abre o portão da fábrica e o salão faz autosave', c2c.fdoor === 'ok' && c2c.fOpen && c2c.fZ > 60.5 && c2c.inFactory && c2c.fSave === 'c2_factory', JSON.stringify({ d: c2c.fdoor, o: c2c.fOpen, z: c2c.fZ, s: c2c.fSave }));
  check('Cap. 2: duas válvulas destravam a casa das fornalhas (a 1ª acorda o carvoeiro)', c2c.arena0 === 'ok' && c2c.arenaLocked0 && c2c.vA === 'ok' && c2c.wDormant0 && !c2c.wDormant1 && !c2c.valves1 && c2c.vB === 'ok' && c2c.valves && c2c.wheelSpun, JSON.stringify({ a: c2c.arena0, vA: c2c.vA, vB: c2c.vB, v: c2c.valves }));
  check('Cap. 2: diário do fornalheiro e livro pré-chefe', c2c.diary === 'ok' && c2c.readDiary && c2c.pbook === 'ok' && c2c.pbookSave === 'c2_preboss' && /fornalhas|Garganta/.test(c2c.obj2), JSON.stringify({ d: c2c.diary, b: c2c.pbook, s: c2c.pbookSave, o: c2c.obj2 }));
  check('Cap. 2: mapa cobre Rua do Carvão e fábrica', c2c.map?.rooms >= 7, JSON.stringify({ m: c2c.map, w: c2c.where }));
  check('Cap. 2: orçamento de luzes na rua/fábrica (≤ 16 visíveis)', c2c.maxLights <= 16, 'max=' + c2c.maxLights);
  await page.screenshot({ path: SHOTS + '13-rua-do-carvao.png' });
  await page.evaluate(() => { T.tp(45, 0, 61.5, 0); T.run(0.4); });
  await page.screenshot({ path: SHOTS + '14-fabrica.png' });

  // --- Chefe do Cap. 2: Brás, o Guardião da Garganta (3 fases)
  const c2boss = await page.evaluate(() => {
    const g = __ocdc, b = g.boss, out = {};
    g.level.doors.c2_arena.setOpen(true, true);
    T.tp(45, 0, 79.5, 0); T.run(0.2); out.idle = !g.script.bossActive;
    T.tp(45, 0, 81.2, 0); T.run(0.2);
    out.active = g.script.bossActive; out.locked = g.level.doors.c2_arena.locked && !g.level.doors.c2_arena.open;
    out.name = document.getElementById('bossName')?.textContent; out.bossId = b.id; out.hpStart = b.hp;
    T.run(2.5);
    let lv = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) lv++; }); out.lights = lv;
    return out;
  });
  await page.screenshot({ path: SHOTS + '15-bras-chefe.png' });
  const c2fight = await page.evaluate(() => {
    const g = __ocdc, b = g.boss, out = {};
    const pillars = [[38.5, 82.5], [51.5, 82.5], [38.5, 89.5], [51.5, 89.5]];
    let guard = 0, stunned = 0, phases = new Set([b.phase]), wasStunned = false, minHp = 100, hits = 0;
    while (b.alive && guard++ < 700) {
      minHp = Math.min(minHp, g.player.hp); g.player.hp = 100;
      if (g.player.state === 'grabbed') for (let k = 0; k < 25; k++) T.press('Mouse0');
      if (b.phase >= 3 && !out.ventTried && b.state === 'stalk') {
        // fase 3: perto demais, o chão brilha e o anel de fogo explode (dano não bloqueável)
        out.ventTried = true; 
        let hp0 = 100;
        for (let k = 0; k < 90 && !b.ventN; k++) {
          if (g.player.state === 'grabbed') for (let j = 0; j < 25; j++) T.press('Mouse0');
          g.player.hp = 100; hp0 = 100;
          if (b.state !== 'vent') { const ax = Math.sin(b.yaw), az = Math.cos(b.yaw); T.tp(b.pos.x + ax * 2.4, 0, b.pos.z + az * 2.4, b.yaw + Math.PI); }
          T.run(0.1);
        }
        out.ventDmg = hp0 - g.player.hp;
        T.run(1.0); out.ventHit = b.ventHits || 0; out.ventDbg = { st: g.player.state, d: +Math.hypot(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z).toFixed(2), bs: b.state, r: b.ventLast }; minHp = Math.min(minHp, g.player.hp); continue;
      }
      if (b.phase >= 3 && !out.ventTried && b.state !== 'stalk') {
        const cs = [[35.4, 79.4], [54.6, 79.4], [35.4, 91], [54.6, 91]].sort((u, v) => Math.hypot(v[0] - b.pos.x, v[1] - b.pos.z) - Math.hypot(u[0] - b.pos.x, u[1] - b.pos.z))[0];
        T.tp(cs[0], 0, cs[1], 0); T.run(0.25); continue;
      }
      if (b.state === 'stunned') {
        if (!wasStunned) stunned++; wasStunned = true;
        const bx = Math.sin(b.yaw), bz = Math.cos(b.yaw);
        T.tp(b.pos.x - bx * 1.0, 0, b.pos.z - bz * 1.0, Math.atan2(bx, bz));
        T.press('Mouse2'); T.run(1.1);
      } else {
        wasStunned = false;
        if (b.state !== 'chargeWind' && b.state !== 'charge') {
          // atrás do pilar oposto ao chefe, com distância suficiente para a investida
          let best = null, bd = -1;
          for (const [x, z] of pillars) {
            const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz) || 1;
            const sx = x + dx / d * 1.25, sz = z + dz / d * 1.25;
            if (sx < 34.6 || sx > 55.4 || sz < 78.6 || sz > 91.4) continue;
            if (d > bd) { bd = d; best = [sx, sz]; }
          }
          if (best) T.tp(best[0], 0, best[1], Math.atan2(b.pos.x - best[0], b.pos.z - best[1]));
        }
        T.run(0.5);
      }
      phases.add(b.phase);
    }
    out.guard = guard; out.alive = b.alive; out.hp = b.hp; out.stunned = stunned; out.phases = [...phases];
    out.thrown = b.thrownN || 0; out.vent = b.ventN || 0; out.weakHits = b.weakHits || 0; out.minHp = minHp;
    T.run(1.5);
    out.dead = g.quest.has('c2_bossDead'); out.unlocked = !g.level.doors.c2_arena.locked; out.bossBar = !document.getElementById('boss').classList.contains('hidden');
    out.obj = g.quest.current();
    // passe do bonde na grelha e a saída
    // sem o passe, o motorneiro não leva ninguém: a saída recusa
    T.tp(54.4, 0, 87, Math.PI / 2); out.exitNoPass = T.interactAt('c2_exit'); out.stNoPass = g.state; out.cpNoPass = JSON.parse(localStorage.getItem('ocdc_save')).checkpoint;
    T.tp(45, 0, 90.4, 0); out.pass = T.interactAt('pick_c2_pass'); out.hasPass = g.quest.has('c2_hasPass');
    T.tp(54.4, 0, 87, Math.PI / 2); out.exit = T.interactAt('c2_exit');
    const s = JSON.parse(localStorage.getItem('ocdc_save'));
    out.save = { cp: s.checkpoint, ch: s.chapter, done: s.flags.c2_chapterDone, bossDead: s.flags.c2_bossDead };
    out.state = g.state;
    return out;
  });
  await new Promise((r) => setTimeout(r, 300));
  const end2 = await page.evaluate(() => ({ title: document.getElementById('endTitle')?.textContent, note: document.getElementById('endNote')?.textContent, btn: document.getElementById('btnEndNext').textContent, dis: document.getElementById('btnEndNext').disabled, vis: !!document.getElementById('chapterEnd')?.offsetParent || !document.getElementById('chapterEnd')?.classList.contains('hidden') }));
  check('Cap. 2: casa das fornalhas tranca e desperta Brás', c2boss.idle && c2boss.active && c2boss.locked && /BRÁS/.test(c2boss.name || '') && c2boss.bossId === 'bras' && c2boss.hpStart >= 500, JSON.stringify(c2boss));
  check('Cap. 2: orçamento de luzes na arena (≤ 16)', c2boss.lights <= 16, 'v=' + c2boss.lights);
  check('Cap. 2: combate real — pilares atordoam, fole nas costas, 3 fases', !c2fight.alive && c2fight.stunned >= 2 && c2fight.phases.includes(2) && c2fight.phases.includes(3) && c2fight.weakHits >= 2, JSON.stringify(c2fight));
  check('Cap. 2: Brás usa carvão em brasa (fase 2+) e o anel de fogo (fase 3)', c2fight.thrown >= 1 && c2fight.vent >= 1 && c2fight.ventHit >= 1 && c2fight.ventDmg >= 20 && c2fight.minHp < 100, JSON.stringify({ t: c2fight.thrown, v: c2fight.vent, h: c2fight.ventHit, dmg: c2fight.ventDmg, m: c2fight.minHp, dbg: c2fight.ventDbg }));
  check('Cap. 2: derrota destrava a arena e esconde a barra', c2fight.dead && c2fight.unlocked && !c2fight.bossBar && /porta de serviço/.test(c2fight.obj), JSON.stringify({ d: c2fight.dead, u: c2fight.unlocked, b: c2fight.bossBar, o: c2fight.obj }));
  check('Cap. 2: passe do bonde e saída encerram o capítulo com save', c2fight.pass === 'ok' && c2fight.hasPass && c2fight.exit === 'ok' && c2fight.state === 'end' && c2fight.save.cp === 'c2_end' && c2fight.save.ch === 2 && c2fight.save.done && c2fight.save.bossDead, JSON.stringify(c2fight.save) + ' ' + c2fight.state + ' ' + c2fight.pass + ' ' + c2fight.exit);
  check('Cap. 2: saída recusada sem o passe do bonde', c2fight.exitNoPass === 'ok' && c2fight.stNoPass === 'playing' && c2fight.cpNoPass !== 'c2_end', JSON.stringify({ e: c2fight.exitNoPass, s: c2fight.stNoPass, c: c2fight.cpNoPass }));
  check('Cap. 2: tela de fim libera o Capítulo 3 (passe do bonde)', /Fim do Capítulo 2/.test(end2.title || '') && /Seguir para o Capítulo 3/.test(end2.btn) && !end2.dis && end2.vis, JSON.stringify(end2));
  await page.screenshot({ path: SHOTS + '16-fim-cap2.png' });
  // recarregar a página e "Continuar" volta ao Capítulo 2 com o estado salvo
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const c2b = await page.evaluate(() => {
    document.getElementById('btnContinue').click();
    const g = __ocdc; T.run(0.3);
    const r = { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), shut: g.level.doors.c2_shutter.open, dep: g.level.doors.c2_depot.open, crankHidden: !g.level.pickupMeshes.c2_crank.visible, dead: !g.enemies.find((e) => e.id === 'cac_dep').alive, sharp: g.player.sharpened, maxSt: g.player.maxSt, heal: g.player.healAmount, maxHp: g.player.maxHp,
      bossDead: !g.boss.alive, fac: g.level.doors.c2_factory.open, gate: g.level.doors.c2_yardgate.open, arenaFree: !g.level.doors.c2_arena.locked, pass: g.inventory.has('passe_bonde'), active: g.script.bossActive };
    // vista da rua para o screenshot
    T.tp(8, 0, 4, Math.PI / 2); T.run(0.5);
    return r;
  });
  check('Cap. 2: continuar restaura o Bairro Operário (portas, coleta, inimigo morto, melhorias)', c2b.st === 'playing' && c2b.ch === 2 && Math.abs(c2b.pos[0] - 53) < 0.6 && Math.abs(c2b.pos[2] - 87) < 0.6 && c2b.bossDead && c2b.fac && c2b.gate && c2b.arenaFree && c2b.pass && !c2b.active && c2b.shut && c2b.dep && c2b.crankHidden && c2b.dead && c2b.maxSt === 125 && c2b.heal === 65 && c2b.sharp, JSON.stringify(c2b));
  await page.screenshot({ path: SHOTS + '12-bairro-rua.png' });
  // ---------------- Capítulo 3 — A Confraria: o passe do Brás leva à Sede ----------------
  const c3go = await page.evaluate(() => {
    const g = __ocdc;
    T.tp(54.4, 0, 87, Math.PI / 2); const ex = T.interactAt('c2_exit');
    return { ex, st: g.state };
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.click('#btnEndNext');
  await new Promise((r) => setTimeout(r, 800));
  await inject();
  const c3a = await page.evaluate(() => {
    const g = __ocdc, S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    T.run(0.3);
    const s0 = S();
    const lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    const out = { start: { st: g.state, ch: g.chapter, sch: s0.chapter, cp: s0.checkpoint, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), pass: g.inventory.has('passe_bonde'),
      noKeys: !g.inventory.has('manivela_carga') && !g.inventory.has('chave_fabrica'), axe: g.inventory.weapons.includes('machado'), docs: g.inventory.documents.length,
      enemies: g.enemies.map((e) => e.type), obj: g.quest.current(), mainLocked: g.level.doors.c3_main.locked, wicketLocked: g.level.doors.c3_wicket.locked, crypt: g.level.doors.c3_crypt.locked } };
    out.lights0 = lights();
    // portas de bronze: trancadas por fora
    T.tp(12, 0, 10.6, 0); out.mainOut = T.interactAt('door_c3_main'); out.mainStill = g.level.doors.c3_main.locked;
    // postigo sem o passe: recusa
    T.tp(22.7, 0, 8, Math.PI / 2);
    const had = g.inventory.count('passe_bonde'); g.inventory.remove('passe_bonde', had); const hf = g.quest.flags.c2_hasPass; delete g.quest.flags.c2_hasPass;
    out.wNo = T.interactAt('door_c3_wicket'); out.wNoLocked = g.level.doors.c3_wicket.locked;
    g.inventory.add('passe_bonde', had); g.quest.flags.c2_hasPass = hf;
    out.wYes = T.interactAt('door_c3_wicket'); T.run(1.2); out.wOpen = g.level.doors.c3_wicket.open && !g.level.doors.c3_wicket.locked && g.quest.has('c3_wicketOpen');
    out.obj1 = g.quest.current();
    T.tp(4, 0, 4.5, Math.PI * 0.62); T.run(0.4);
    return out;
  });
  await page.screenshot({ path: SHOTS + '17-largo-veu.png' });
  check('Cap. 3: saída do Cap. 2 com o passe → botão leva à Sede (save do Cap. 3)', c3go.ex === 'ok' && c3a.start.st === 'playing' && c3a.start.ch === 3 && c3a.start.sch === 3 && c3a.start.cp === 'c3_tram' && Math.abs(c3a.start.pos[0] - 6) < 0.4 && c3a.start.pass && c3a.start.noKeys && c3a.start.axe && /postigo/.test(c3a.start.obj), JSON.stringify(c3a.start));
  check('Cap. 3: acólitos e rastejador na Sede', c3a.start.enemies.filter((t) => t === 'acolito').length === 5 && c3a.start.enemies.includes('rastejador'), JSON.stringify(c3a.start.enemies));
  check('Cap. 3: portas de bronze trancadas por fora; postigo recusa sem passe e abre com ele', c3a.mainStill && c3a.wNo === 'ok' && c3a.wNoLocked && c3a.wYes === 'ok' && c3a.wOpen && /salão/.test(c3a.obj1), JSON.stringify(c3a));
  check('Cap. 3: orçamento de luzes no largo (≤ 16)', c3a.lights0 <= 16, 'v=' + c3a.lights0);
  const c3b = await page.evaluate(() => {
    const g = __ocdc, S = () => JSON.parse(localStorage.getItem('ocdc_save')), E = (id) => g.enemies.find((e) => e.id === id);
    const out = {};
    const ac = E('aco_hall'); out.aco = { hp: ac.hp, type: ac.type, veil: !!ac.rig?.root };
    // atravessa a portaria até o salão nobre: autosave
    T.tp(25.5, 0, 8, Math.PI / 2); T.hold('KeyW', 0.8); out.lodgeX = +g.player.pos.x.toFixed(2);
    T.tp(29.2, 0, 9.6, 0); out.book = T.interactAt('c3_lodge_book'); out.bookCp = S().checkpoint;
    T.tp(28.2, 0, 6.6, Math.PI); out.portaria = T.interactAt('doc_livro_portaria');
    T.tp(27, 0, 11, 0); T.interactAt('door_c3_lodge'); T.run(1.0); T.hold('KeyW', 1.2); T.run(0.2);
    out.hall = g.quest.has('c3_inHall'); out.hallCp = S().checkpoint; out.hallZ = +g.player.pos.z.toFixed(2);
    ['aco_largo', 'aco_hall', 'aco_porteiro'].forEach((id) => E(id).setDeadInstant()); g.player.hp = g.player.maxHp;
    // tranca das portas de bronze por dentro
    T.tp(12, 0, 13.4, Math.PI); out.bar = T.interactAt('door_c3_main'); T.run(1.2);
    out.mainOpen = g.level.doors.c3_main.open && g.quest.has('c3_mainOpen') && !g.level.mainBar.visible;
    // alavanca com a ordem errada: o sino toca e os discos voltam
    T.tp(26.3, 0, 28.6, 0); out.lever0 = T.interactAt('c3_lever'); T.run(0.3);
    out.bell = g.quest.has('c3_bellRung') && g.level.doors.c3_vault.locked && g.level.dials.every((d) => d.value === 3);
    out.secDormant = E('aco_sec').dormant;
    // secretaria: o Regimento acorda o escrivão
    T.tp(10, 0, 28.6, 0); out.sec = T.interactAt('door_c3_secret'); T.run(1.2);
    T.tp(10.1, 0, 36.6, 0); out.reg = T.interactAt('doc_regimento_arquivo'); T.run(0.1);
    out.regFlag = g.quest.has('c3_readRegimento'); out.secAwake = !E('aco_sec').dormant;
    E('aco_sec').setDeadInstant(); g.player.hp = g.player.maxHp;
    T.tp(7.9, 0, 33.4, 0); out.ammo = T.interactAt('pick_c3_ammo_sec');
    // discos: CINZA · OLHO · VÉU e alavanca
    const turn = (i, n) => { T.tp(g.level.dials[i].x, 0, 28.7, 0); for (let k = 0; k < n; k++) { const r = T.interactAt('c3_dial' + i); if (r !== 'ok') return r; } return 'ok'; };
    out.d0 = turn(0, 1); out.d1 = turn(1, 2); out.d2 = turn(2, 3);
    out.vals = g.level.dials.map((d) => d.value);
    T.tp(26.3, 0, 28.6, 0); out.lever1 = T.interactAt('c3_lever'); T.run(2.0);
    out.vault = g.level.doors.c3_vault.open && g.quest.has('c3_vaultOpen');
    out.obj = g.quest.current();
    T.tp(24, 0, 25, 0); T.run(0.4);
    return out;
  });
  await page.screenshot({ path: SHOTS + '18-portao-arquivo.png' });
  check('Cap. 3: portaria, livro de registros e autosave no salão nobre', c3b.book === 'ok' && c3b.bookCp === 'c3_lodge' && c3b.portaria === 'ok' && c3b.hall && c3b.hallCp === 'c3_hall' && c3b.aco.hp === 95, JSON.stringify(c3b));
  check('Cap. 3: tranca interna abre as portas de bronze (atalho)', c3b.bar === 'ok' && c3b.mainOpen, JSON.stringify({ b: c3b.bar, m: c3b.mainOpen }));
  check('Cap. 3: ordem errada toca o sino e reinicia os discos', c3b.lever0 === 'ok' && c3b.bell && c3b.secDormant, JSON.stringify({ l: c3b.lever0, b: c3b.bell }));
  check('Cap. 3: Regimento na secretaria (escrivão desperta)', c3b.sec === 'ok' && c3b.reg === 'ok' && c3b.regFlag && c3b.secAwake && c3b.ammo === 'ok', JSON.stringify({ s: c3b.sec, r: c3b.reg, f: c3b.regFlag, a: c3b.secAwake, m: c3b.ammo }));
  check('Cap. 3: discos CINZA·OLHO·VÉU abrem o portão do arquivo', c3b.d0 === 'ok' && c3b.d1 === 'ok' && c3b.d2 === 'ok' && c3b.vals.join() === '0,1,2' && c3b.lever1 === 'ok' && c3b.vault && /escada/.test(c3b.obj), JSON.stringify({ d: [c3b.d0, c3b.d1, c3b.d2], v: c3b.vals, l: c3b.lever1, o: c3b.obj }));
  const c3c = await page.evaluate(() => {
    const g = __ocdc, S = () => JSON.parse(localStorage.getItem('ocdc_save')), E = (id) => g.enemies.find((e) => e.id === id);
    const lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    const out = {};
    // desce a escada andando
    T.tp(24, 0, 30.8, 0); T.hold('KeyW', 4.5); T.run(0.2);
    out.stairY = +g.player.pos.y.toFixed(2); out.stairZ = +g.player.pos.z.toFixed(2);
    if (g.player.pos.y > -4) T.tp(24, -4.5, 41.8, 0);
    T.run(0.2);
    out.arch = g.quest.has('c3_inArchive'); out.archCp = S().checkpoint;
    E('aco_arq').setDeadInstant(); g.player.hp = g.player.maxHp;
    T.tp(25.8, -4.5, 44.6, Math.PI / 2); out.ficha = T.interactAt('doc_ficha_ines'); T.run(0.1); out.fichaFlag = g.quest.has('c3_readFicha');
    out.rasDormant = E('ras_arq').dormant;
    T.tp(33.1, -4.5, 56, Math.PI / 2); out.dos = T.interactAt('pick_c3_dossier'); T.run(0.1);
    out.dossier = g.quest.has('c3_hasDossier') && g.inventory.has('dossie_elias') && g.inventory.documents.includes('dossie_elias');
    out.rasAwake = !E('ras_arq').dormant;
    E('ras_arq').setDeadInstant(); g.player.hp = g.player.maxHp;
    T.tp(25, -4.5, 56.6, 0); out.crypt = T.interactAt('door_c3_crypt'); out.cryptLocked = g.level.doors.c3_crypt.locked;
    // o sarilho da grade recusa sem o sinete da CHAMA
    T.tp(23.4, -4.5, 56.4, 0); out.winch = T.interactAt('c3_winch'); out.winchNote = g.quest.has('note_c3_winch');
    out.cryptLocked2 = g.level.doors.c3_crypt.locked && !g.quest.has('c3_cryptOpen') && g.level.grate.position.y < 0.01;
    out.obj = g.quest.current();
    out.lights = lights();
    T.key('KeyM'); out.mapState = g.state; out.map = g.menus.lastMap;
    out.tabs = [...document.querySelectorAll('.map-tab')].filter((e) => !e.classList.contains('hidden')).map((e) => e.textContent);
    g.closeOverlay();
    T.tp(15.6, -4.5, 40.6, 0); out.book = T.interactAt('c3_arq_book'); const s = S();
    out.save = { cp: s.checkpoint, ch: s.chapter, dos: s.flags.c3_hasDossier, vault: s.flags.c3_vaultOpen, dead: s.deadEnemies.length };
    T.tp(24.5, -4.5, 42.5, 0); T.run(0.5);
    return out;
  });
  await page.screenshot({ path: SHOTS + '19-arquivos.png' });
  check('Cap. 3: escada desce aos arquivos e autosave', c3c.stairY < -3.5 && c3c.arch && c3c.archCp === 'c3_archive', JSON.stringify({ y: c3c.stairY, z: c3c.stairZ, a: c3c.arch, c: c3c.archCp }));
  check('Cap. 3: ficha de Inês e dossiê de Elias (rastejador desperta)', c3c.ficha === 'ok' && c3c.fichaFlag && c3c.rasDormant && c3c.dos === 'ok' && c3c.dossier && c3c.rasAwake, JSON.stringify(c3c));
  check('Cap. 3: grade da cripta trancada; o sarilho recusa sem o sinete da CHAMA', c3c.crypt === 'ok' && c3c.cryptLocked && c3c.winch === 'ok' && c3c.winchNote && c3c.cryptLocked2 && /sinete/.test(c3c.obj), JSON.stringify({ w: c3c.winch, o: c3c.obj }));
  check('Cap. 3: mapa com térreo e arquivos', c3c.mapState === 'map' && c3c.tabs.length === 2 && c3c.tabs.includes('Arquivos') && c3c.map?.rooms >= 2, JSON.stringify({ t: c3c.tabs, m: c3c.map }));
  check('Cap. 3: orçamento de luzes nos arquivos (≤ 16)', c3c.lights <= 16, 'v=' + c3c.lights);
  check('Cap. 3: livro do arquivo salva com o dossiê', c3c.book === 'ok' && c3c.save.cp === 'c3_archive' && c3c.save.ch === 3 && c3c.save.dos && c3c.save.vault && c3c.save.dead >= 6, JSON.stringify(c3c.save));
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const c3r = await page.evaluate(() => {
    document.getElementById('btnContinue').click();
    const g = __ocdc; T.run(0.3);
    return { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), vault: g.level.doors.c3_vault.open, wicket: g.level.doors.c3_wicket.open, main: g.level.doors.c3_main.open, bar: g.level.mainBar.visible,
      dos: g.inventory.has('dossie_elias'), hidden: !g.level.pickupMeshes.c3_dossier.visible, dead: g.enemies.filter((e) => !e.alive).length, crypt: g.level.doors.c3_crypt.locked, obj: g.quest.current(), dials: g.level.dials.map((d) => d.value).join() };
  });
  check('Cap. 3: continuar restaura a Sede (portas, discos, dossiê, inimigos)', c3r.st === 'playing' && c3r.ch === 3 && Math.abs(c3r.pos[1] + 4.5) < 0.3 && Math.abs(c3r.pos[2] - 41.8) < 0.6 && c3r.vault && c3r.wicket && c3r.main && !c3r.bar && c3r.dos && c3r.hidden && c3r.dead >= 6 && c3r.crypt && c3r.dials === '0,1,2', JSON.stringify(c3r));
  // --- Cap. 3: sinete do arquivista → sarilho → cripta → O Sacristão → altar → galeria → fim do capítulo
  const c3d = await page.evaluate(() => {
    const g = __ocdc, S = () => JSON.parse(localStorage.getItem('ocdc_save')), E = (id) => g.enemies.find((e) => e.id === id);
    const lights = () => { let v = 0; g.scene.traverse((o) => { if (o.isLight && o.visible) v++; }); return v; };
    const out = {};
    const a = E('aco_arq');
    out.signetVis = !!g.level.pickupMeshes.c3_signet?.visible;
    T.tp(a.pos.x, -4.5, a.pos.z - 1.0, 0); T.run(0.05);
    out.sig = T.interactAt('pick_c3_signet'); out.hasSig = g.inventory.has('sinete_chama') && g.quest.has('c3_hasSignet');
    out.obj1 = g.quest.current();
    T.tp(23.4, -4.5, 56.4, 0); out.winch = T.interactAt('c3_winch');
    out.used = !g.inventory.has('sinete_chama'); out.lockedMid = g.level.doors.c3_crypt.locked;
    T.run(1.4); out.gyMid = +g.level.grate.position.y.toFixed(2);
    T.run(1.8); out.gy = +g.level.grate.position.y.toFixed(2); out.cryptOpen = !g.level.doors.c3_crypt.locked && g.level.doors.c3_crypt.open;
    // desce a escada da cripta andando
    T.tp(25, -4.5, 57.4, 0); T.hold('KeyW', 5.5); T.run(0.2);
    out.stair = g.player.pos.toArray().map((v) => +v.toFixed(2));
    if (g.player.pos.y > -8) T.tp(25, -8.5, 66.6, 0);
    out.inCrypt = g.quest.has('c3_inCrypt'); out.cp = S().checkpoint; out.saveOpen = S().flags.c3_cryptOpen;
    out.bookId = !!g.interact.list.find((i) => i.id === 'c3_crypt_book');
    out.lights = lights();
    return out;
  });
  check('Cap. 3: sinete da CHAMA no corpo do arquivista', c3d.signetVis && c3d.sig === 'ok' && c3d.hasSig && /sarilho/.test(c3d.obj1), JSON.stringify({ v: c3d.signetVis, s: c3d.sig, o: c3d.obj1 }));
  check('Cap. 3: sinete no selo → sarilho ergue a grade (animada) e libera a cripta', c3d.winch === 'ok' && c3d.used && c3d.lockedMid && c3d.gyMid > 0.2 && c3d.gyMid < 2.4 && c3d.gy >= 2.49 && c3d.cryptOpen, JSON.stringify(c3d));
  check('Cap. 3: escada da cripta e autosave antes do chefe', c3d.stair[1] < -8 && c3d.inCrypt && c3d.cp === 'c3_preboss' && c3d.saveOpen && c3d.bookId, JSON.stringify({ s: c3d.stair, c: c3d.cp }));
  check('Cap. 3: orçamento de luzes na cripta (≤ 16)', c3d.lights <= 16, 'v=' + c3d.lights);
  await page.screenshot({ path: SHOTS + '20-cripta-escada.png' });
  // recarrega no patamar: a grade continua erguida e o chefe dormente
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const c3p = await page.evaluate(() => {
    document.getElementById('btnContinue').click();
    const g = __ocdc; T.run(0.3);
    return { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), gy: g.level.grate.position.y, crypt: !g.level.doors.c3_crypt.locked && g.level.doors.c3_crypt.open,
      winch: !!g.interact.list.find((i) => i.id === 'c3_winch')?.enabled?.(), sig: g.inventory.has('sinete_chama'), boss: g.boss?.id, dormant: g.boss?.state === 'dormant', gallery: g.level.doors.c3_gallery.locked, arena: g.level.doors.c3_arena.open };
  });
  check('Cap. 3: continuar no patamar restaura a grade erguida (save migrado pelas flags)', c3p.st === 'playing' && c3p.ch === 3 && c3p.pos[1] < -8 && c3p.gy >= 2.49 && c3p.crypt && !c3p.winch && !c3p.sig && c3p.boss === 'sacristao' && c3p.dormant && c3p.gallery && c3p.arena, JSON.stringify(c3p));
  const c3e = await page.evaluate(() => {
    const g = __ocdc, S = () => JSON.parse(localStorage.getItem('ocdc_save'));
    const out = {}, B = g.boss;
    out.exitOff = !g.interact.list.find((i) => i.id === 'c3_exit').enabled();
    out.ribbonOff = !g.interact.list.find((i) => i.id === 'pick_c3_ribbon').enabled();
    T.tp(25, -8.5, 66.6, 0); T.hold('KeyW', 2.5); T.run(0.1);
    out.active = g.script.bossActive; out.arena = { open: g.level.doors.c3_arena.open, locked: g.level.doors.c3_arena.locked };
    out.hud = !g.hud.el.boss.classList.contains('hidden');
    out.inTargets = g.targets().includes(B);
    // save durante a luta não deixa a porta da arena trancada
    out.serArena = g.serialize('c3_preboss').doors.c3_arena?.locked;
    const log = { maxAlive: 0, stuns: 0, phases: [] };
    const pillars = [[19, 75], [31, 75], [19, 84], [31, 84]];
    // de perto, o chão acende e o turíbulo varre em área (não bloqueável)
    for (let k = 0; k < 120 && !B.sweepN; k++) {
      if (g.player.state === 'grabbed') for (let j = 0; j < 25; j++) T.press('Mouse0');
      g.player.hp = g.player.maxHp;
      if (B.state !== 'sweep') { const ax = Math.sin(B.yaw), az = Math.cos(B.yaw); T.tp(B.pos.x + ax * 2.0, -8.5, B.pos.z + az * 2.0, B.yaw + Math.PI); }
      T.run(0.1);
    }
    T.run(1.4); log.sweepDmg = g.player.maxHp - g.player.hp;
    let t = 0, wasStunned = false, cloudTest = false;
    g.player.hp = g.player.maxHp;
    while (B.alive && t < 300) {
      g.player.hp = Math.max(g.player.hp, g.player.maxHp * 0.8);
      if (g.player.state === 'grabbed') for (let k = 0; k < 25; k++) T.press('Mouse0');
      log.maxAlive = Math.max(log.maxAlive, B.aliveSummons());
      if (!log.phases.includes(B.phase)) log.phases.push(B.phase);
      // noviços que chegam perto morrem a machadadas
      for (const e of g.enemies) if (e.summoned && e.alive && e.pos.distanceTo(g.player.pos) < 2.6) e.takeHit({ dmg: 999, poise: 99, heavy: true, from: g.player.pos, point: e.pos.clone() });
      // fica dentro de uma nuvem de incenso por 1,2 s
      if (!cloudTest && B.clouds.length && B.clouds[0].t > 1.0) { cloudTest = true; const c = B.clouds[0]; const hp0 = g.player.hp; T.tp(c.x, -8.5, c.z, 0); T.run(1.2); t += 1.2; log.cloudDmg = hp0 - g.player.hp; continue; }
      if (B.state === 'stunned') {
        // golpe forte (botão direito) nas costas: o relicário
        if (!wasStunned) log.stuns++; wasStunned = true;
        const bx = Math.sin(B.yaw), bz = Math.cos(B.yaw);
        T.tp(B.pos.x - bx * 1.0, -8.5, B.pos.z - bz * 1.0, Math.atan2(bx, bz));
        T.press('Mouse2'); T.run(1.1); t += 1.1;
      } else {
        wasStunned = false;
        if (B.state !== 'chargeWind' && B.state !== 'charge' && B.state !== 'incense') {
          // atrás do pilar oposto ao chefe, com distância suficiente para a investida
          let best = null, bd = -1;
          for (const [x, z] of pillars) {
            const dx = x - B.pos.x, dz = z - B.pos.z, d = Math.hypot(dx, dz) || 1;
            const sx = x + dx / d * 1.25, sz = z + dz / d * 1.25;
            if (sx < 14.6 || sx > 35.4 || sz < 69.6 || sz > 87) continue;
            if (d > bd) { bd = d; best = [sx, sz]; }
          }
          if (best) T.tp(best[0], -8.5, best[1], Math.atan2(B.pos.x - best[0], B.pos.z - best[1]));
        }
        T.run(0.5); t += 0.5;
      }
    }
    out.t = t; out.alive = B.alive; out.phase = B.phase; out.log = log;
    out.c = { sweepN: B.sweepN, sweepHits: B.sweepHits, cloudN: B.cloudN, cloudHits: B.cloudHits, summonN: B.summonN, calls: B.summonCalls, weak: B.weakHits };
    T.run(0.6);
    out.dead = g.quest.has('c3_bossDead'); out.gallery = { open: g.level.doors.c3_gallery.open, locked: g.level.doors.c3_gallery.locked };
    out.arenaAfter = g.level.doors.c3_arena.locked; out.cloudsLeft = B.clouds.length;
    out.summonsAlive = g.enemies.filter((e) => e.summoned && e.alive).length;
    out.hudOff = g.hud.el.boss.classList.contains('hidden');
    out.obj = g.quest.current();
    g.player.hp = g.player.maxHp;
    // altar: ordem de transferência (gancho do Cap. 4) e a fita de Inês
    T.tp(24.0, -8.5, 87.15, 0); out.doc = T.interactAt('doc_ordem_transferencia'); T.run(0.1);
    out.docHave = g.inventory.documents.includes('ordem_transferencia') && g.quest.has('c3_readOrdem');
    T.tp(26.2, -8.5, 87.15, 0); out.ribbon = T.interactAt('pick_c3_ribbon'); out.ribbonHave = g.inventory.has('fita_ines');
    // pela galeria até a saída
    T.tp(34.8, -8.5, 86, Math.PI / 2); T.hold('KeyW', 2.0); T.run(0.1);
    out.galPos = g.player.pos.toArray().map((v) => +v.toFixed(2));
    out.exit = T.interactAt('c3_exit');
    out.st = g.state; out.title = document.getElementById('endTitle').textContent; out.note = document.getElementById('endNote').textContent;
    out.rn0 = document.getElementById('endRn0').textContent; out.stats = document.getElementById('stats').textContent;
    out.next = { dis: document.getElementById('btnEndNext').disabled, txt: document.getElementById('btnEndNext').textContent };
    const s = S(); out.save = { cp: s.checkpoint, ch: s.chapter, done: s.flags.c3_chapterDone, boss: s.flags.c3_bossDead, ribbon: (s.inventory?.items || s.items || {}).fita_ines };
    return out;
  });
  await page.screenshot({ path: SHOTS + '21-fim-cap3.png' });
  check('Cap. 3: O Sacristão desperta ao entrar na cripta e tranca a porta', c3e.exitOff && c3e.ribbonOff && c3e.active && !c3e.arena.open && c3e.arena.locked && c3e.inTargets && c3e.serArena === false, JSON.stringify({ a: c3e.active, d: c3e.arena, t: c3e.inTargets, s: c3e.serArena, h: c3e.hud }));
  check('Cap. 3: combate do Sacristão (pilares, relicário, varredura em área, incenso, 3 fases)', !c3e.alive && c3e.phase === 3 && c3e.c.weak >= 5 && c3e.log.stuns >= 2 && c3e.c.sweepN >= 1 && c3e.c.sweepHits >= 1 && c3e.c.cloudN >= 1 && c3e.log.cloudDmg > 0 && c3e.c.cloudHits >= 1, JSON.stringify({ t: c3e.t, c: c3e.c, l: c3e.log }));
  check('Cap. 3: invocação limitada (≤ 2 vivos, ≤ 4 no total)', c3e.c.summonN >= 2 && c3e.c.summonN <= 4 && c3e.log.maxAlive <= 2 && c3e.summonsAlive === 0, JSON.stringify({ n: c3e.c.summonN, calls: c3e.c.calls, max: c3e.log.maxAlive, alive: c3e.summonsAlive }));
  check('Cap. 3: morte do Sacristão libera arena e galeria', c3e.dead && !c3e.gallery.locked && c3e.gallery.open && !c3e.arenaAfter && c3e.cloudsLeft === 0 && c3e.hudOff && /catacumbas/.test(c3e.obj), JSON.stringify({ g: c3e.gallery, a: c3e.arenaAfter, o: c3e.obj }));
  check('Cap. 3: ordem de transferência e fita de Inês no altar', c3e.doc === 'ok' && c3e.docHave && c3e.ribbon === 'ok' && c3e.ribbonHave, JSON.stringify({ d: c3e.doc, r: c3e.ribbon }));
  check('Cap. 3: galeria → tela de fim do Cap. 3 com gancho do Cap. 4', c3e.exit === 'ok' && c3e.st === 'end' && /Capítulo 3/.test(c3e.title) && /Capítulo 4/.test(c3e.note) && /Vigia/.test(c3e.rn0) && /Fita de Inês: com Elias/.test(c3e.stats) && c3e.next.dis && /Capítulo 4/.test(c3e.next.txt), JSON.stringify({ e: c3e.exit, g: c3e.galPos, t: c3e.title, n: c3e.next }));
  check('Cap. 3: save final do capítulo (c3_end)', c3e.save.cp === 'c3_end' && c3e.save.ch === 3 && c3e.save.done && c3e.save.boss, JSON.stringify(c3e.save));
  await page.reload({ waitUntil: 'networkidle0' });
  await inject();
  const c3z = await page.evaluate(() => {
    document.getElementById('btnContinue').click();
    const g = __ocdc; T.run(0.3);
    return { st: g.state, ch: g.chapter, pos: g.player.pos.toArray().map((v) => +v.toFixed(2)), bossDead: !g.boss.alive, gallery: !g.level.doors.c3_gallery.locked, grate: g.level.grate.position.y,
      ribbon: g.inventory.has('fita_ines'), ribbonHidden: !g.level.pickupMeshes.c3_ribbon.visible, exit: g.interact.list.find((i) => i.id === 'c3_exit').enabled() };
  });
  check('Cap. 3: continuar após o fim restaura cripta vencida e saída', c3z.st === 'playing' && c3z.ch === 3 && c3z.pos[0] > 33 && c3z.bossDead && c3z.gallery && c3z.grate >= 2.49 && c3z.ribbon && c3z.ribbonHidden && c3z.exit, JSON.stringify(c3z));
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
