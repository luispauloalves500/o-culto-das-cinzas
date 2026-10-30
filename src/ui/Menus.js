// Telas: menu principal, opções, pausa, inventário, leitor de documentos, morte e fim de capítulo.
import { DOCUMENTS } from '../data/documents.js';
import { FLOORS, roomAt } from '../data/map.js';
import { collectNotes } from './notes.js';
import { MapView } from './MapView.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'options', 'pause', 'inventory', 'map', 'reader', 'dead', 'chapterEnd', 'loading', 'clickToPlay'];

export class Menus {
  constructor(game) {
    this.game = game;
    this.optionsReturn = 'menu';
    const g = game, s = g.settings;
    $('btnNew').onclick = () => { g.audio.init(); g.newGame(); };
    $('btnContinue').onclick = () => { g.audio.init(); g.continueGame(); };
    $('btnOptions').onclick = () => this.openOptions('menu');
    $('btnOptBack').onclick = () => this.show(this.optionsReturn);
    $('btnResume').onclick = () => g.resume();
    $('btnPauseOptions').onclick = () => this.openOptions('pause');
    $('btnQuit').onclick = () => g.toMenu();
    $('btnDocClose').onclick = () => g.closeOverlay();
    $('btnRetry').onclick = () => g.continueGame();
    $('btnDeadMenu').onclick = () => g.toMenu();
    $('btnEndMenu').onclick = () => g.toMenu();
    $('clickToPlay').onclick = () => g.resume();
    this.mapView = new MapView($('mapCanvas'));
    for (const el of document.querySelectorAll('.map-tab')) el.onclick = () => this.mapFloor(+el.dataset.floor);
    // opções ligadas às Settings (persistidas)
    const sens = $('optSens'), inv = $('optInvert'), vol = $('optVol'), scale = $('optScale'), fov = $('optFov'), shake = $('optShake'), fps = $('optFps');
    sens.value = s.get('sensitivity'); $('optSensV').textContent = (+s.get('sensitivity')).toFixed(1);
    inv.checked = s.get('invertY'); vol.value = s.get('volume'); scale.value = String(s.get('renderScale'));
    fov.value = s.get('fov'); $('optFovV').textContent = s.get('fov'); shake.checked = s.get('shake'); fps.checked = s.get('showFps');
    sens.oninput = () => { s.set('sensitivity', +sens.value); $('optSensV').textContent = (+sens.value).toFixed(1); };
    inv.onchange = () => s.set('invertY', inv.checked);
    vol.oninput = () => { s.set('volume', +vol.value); g.audio.setVolume(+vol.value); };
    scale.onchange = () => { s.set('renderScale', +scale.value); g.resize(); };
    fov.oninput = () => { s.set('fov', +fov.value); $('optFovV').textContent = fov.value; g.camera.fov = +fov.value; g.camera.updateProjectionMatrix(); };
    shake.onchange = () => s.set('shake', shake.checked);
    fps.onchange = () => s.set('showFps', fps.checked);
  }
  show(name) {
    for (const id of SCREENS) $(id).classList.toggle('hidden', id !== name);
    if (name === 'menu') $('btnContinue').classList.toggle('hidden', !this.game.saves.hasSave());
  }
  hideAll() { this.show(null); }
  openOptions(from) { this.optionsReturn = from; this.show('options'); }
  showDocument(id) {
    const d = DOCUMENTS[id];
    $('docTitle').textContent = d.title; $('docBody').innerHTML = d.body;
    this.show('reader');
  }
  showInventory() {
    const g = this.game;
    const items = g.inventory.list();
    $('invList').innerHTML = (g.player.weapon ? '<div class="inv-item"><b>Machado de incêndio</b> — golpe rápido / forte</div>' : '') +
      (items.length ? items.map((i) => `<div class="inv-item"><b>${i.name}</b> ×${i.n}<br><span class="small">${i.desc || ''}</span></div>`).join('') : (g.player.weapon ? '' : '<div class="inv-item small">Vazio</div>'));
    // anotações: pistas opcionais + portas trancadas já tentadas (e ainda trancadas)
    const notes = collectNotes(g);
    $('noteList').innerHTML = notes.length ? notes.map((t) => `<div class="inv-item small">• ${t}</div>`).join('') : '<div class="inv-item small">Nada anotado</div>';
    const docs = g.inventory.documents;
    $('docList').innerHTML = docs.length ? docs.map((id) => `<div class="doc-item" data-doc="${id}">▸ ${DOCUMENTS[id].title}</div>`).join('') : '<div class="inv-item small">Nenhum documento</div>';
    for (const el of document.querySelectorAll('.doc-item')) el.onclick = () => { g.openDocument(el.dataset.doc, 'inventory'); };
    this.show('inventory');
  }
  showMap() {
    this.mapView.open(this.game);
    this.show('map');
    this.drawMap();
  }
  mapCycle(dir) { this.mapView.cycle(dir); this.drawMap(); }
  mapFloor(i) { this.mapView.setFloor(i); this.drawMap(); }
  drawMap() {
    const g = this.game, mv = this.mapView;
    this.lastMap = mv.draw(g);
    for (const el of document.querySelectorAll('.map-tab')) el.classList.toggle('active', FLOORS[+el.dataset.floor].id === mv.floor);
    const r = roomAt(g.player.pos);
    $('mapWhere').textContent = 'Você está em: ' + (r ? r.name : 'lugar nenhum que conste na planta');
    $('mapPlan').textContent = g.quest.has('hasMapPlan') ? 'Planta do hospital: alas não visitadas em tracejado.' : 'Sem a planta: só aparece o que você já percorreu.';
    const notes = collectNotes(g);
    $('mapNotes').innerHTML = notes.length ? notes.map((t) => `<div class="inv-item small">• ${t}</div>`).join('') : '<div class="inv-item small">Nada anotado</div>';
  }
  showChapterEnd(stats) {
    const t = Math.floor(stats.time);
    $('stats').innerHTML = `Tempo: ${Math.floor(t / 60)}min ${t % 60}s · Inimigos abatidos: ${stats.kills} · Dano recebido: ${Math.round(stats.damageTaken)} · Documentos: ${stats.docs}/${Object.keys(DOCUMENTS).length}`;
    this.show('chapterEnd');
  }
}
