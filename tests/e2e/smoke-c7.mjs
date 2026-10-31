// Smoke só do Capítulo 7 (rápido): novo jogo → save c6_end sintético → bloco do Cap. 7 (Continuar migra para Sob a Pedra).
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { runC7 } from './c7.mjs';

const PORT = 4184;
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
  const raw = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ocdc_save'));
    s.chapter = 6; s.checkpoint = 'c6_end';
    s.flags = { ...s.flags, hasAxe: true, chapterDone: true, ch1Done: true, ch5Done: true, c5_chapterDone: true, c6_sliceDone: true, c6_galleryOpen: true, c6_collectorDead: true, c6_chapterDone: true, ch6Done: true };
    s.inventory = { ...s.inventory, items: { bandagem: 2, municao_38: 12 }, weapon: 'machado', possuiMachado: true, machadoEquipado: true, weapons: ['machado', 'revolver'], loaded: { revolver: 6 } };
    s.documents = ['relicario_colecionador', 'catalogo_colecionador']; s.doors = {}; s.deadEnemies = [];
    return JSON.stringify(s);
  });
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
  await runC7(page, check, inject, SHOTS, raw);
  check('sem erros no console', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) {
  check('execução do smoke', false, String(e.stack || e));
} finally { await browser.close(); server.kill(); }
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
process.exit(failed.length ? 1 : 0);
