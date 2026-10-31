// Smoke só do Capítulo 6 (rápido): novo jogo → save c5_end sintético → Continuar → bloco do Cap. 6.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { runC6 } from './c6.mjs';

const PORT = 4183;
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) res(); });
  server.on('exit', () => rej(new Error('preview saiu')));
  setTimeout(() => rej(new Error('timeout do preview')), 20000);
});
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? '✔' : '✘'} ${name}${info ? ' — ' + info : ''}`); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
const errors = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btnNew'); await new Promise((r) => setTimeout(r, 1500));
  // abertura do Cap. 1 (pt47u) é coberta no smoke principal: aqui pula e desliga as cinemáticas
  await page.evaluate(() => { __ocdc.cutscene?.finish(); __ocdc.settings.set('cinematics', false); });
  const raw = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ocdc_save'));
    s.chapter = 5; s.checkpoint = 'c5_end';
    s.flags = { ...s.flags, hasAxe: true, chapterDone: true, ch1Done: true, c5_chapterDone: true, ch5Done: true, c5_afogadaDead: true };
    s.inventory = { ...s.inventory, items: { bandagem: 2, municao_38: 12, fusivel_ceramico: 1, fita_ines: 1 }, weapon: 'machado', possuiMachado: true, machadoEquipado: true, weapons: ['machado', 'revolver'], loaded: { revolver: 6 } };
    s.documents = ['ficha_remessa']; s.doors = {}; s.deadEnemies = [];
    return JSON.stringify(s);
  });
  await page.evaluate((r) => localStorage.setItem('ocdc_save', r), raw);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => document.getElementById('btnContinue').click());
  await new Promise((r) => setTimeout(r, 800));
  const inject = () => page.evaluate(() => {
    const g = window.__ocdc;
    window.T = {
      run(sec) { for (let i = 0; i < sec * 60; i++) { g.step(1 / 60); g._updateCamera(1 / 60); } },
      tp(x, y, z, yaw) { g.player.spawn({ x, y, z }, yaw ?? g.player.yaw); g.cameraCtl.yaw = yaw ?? g.cameraCtl.yaw; },
      hold(code, sec) { g.input.down.add(code); g.input.pressed.add(code); T.run(sec); g.input.down.delete(code); },
      press(code) { g.input.pressed.add(code); g.step(1 / 60); g.input.endFrame(); },
      ammo() { return g.inventory.ammoTotal('revolver'); },
      key(code) { g.input.pressed.add(code); g._handleMenuKeys(); g.input.endFrame(); },
      interact(id) { const it = g.interact.list.find((i) => i.id === id); if (!it) throw new Error('sem ' + id); T.tp(it.pos.x - Math.sin(g.player.yaw) * 0.6, g.player.pos.y, it.pos.z - Math.cos(g.player.yaw) * 0.6); g.step(1 / 60); const cur = g.currentInteractable; if (!cur || cur.id !== id) return 'interagível não focado: ' + (cur && cur.id); g.tryInteract(); return 'ok'; },
      interactAt(id) { const it = g.interact.list.find((i) => i.id === id); const p = g.player.pos; const yaw = Math.atan2(it.pos.x - p.x, it.pos.z - p.z); g.player.yaw = yaw; g.step(1 / 60); const cur = g.currentInteractable; if (!cur || cur.id !== id) return 'focado: ' + (cur && cur.id); g.tryInteract(); if (g.state === 'reading') g.closeOverlay(); return 'ok'; },
    };
  });
  await runC6(page, check, inject, SHOTS, raw);
  check('sem erros no console', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) {
  check('execução do smoke', false, String(e.stack || e));
} finally { await browser.close(); server.kill(); }
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
process.exit(failed.length ? 1 : 0);
