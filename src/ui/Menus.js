// Telas: menu principal, opções, pausa, inventário, leitor de documentos, morte e fim de capítulo.
import { DOCUMENTS } from '../data/documents.js';
import { FLOORS, roomAt, mapChapter } from '../data/map.js';
import { collectNotes } from './notes.js';
import { WEAPONS, conditionLabel } from '../data/weapons.js';
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
    $('btnEndNext').onclick = () => { g.audio.init(); g.startChapter2(); };
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
    const ws = (g.inventory.weapons || []).filter((id) => WEAPONS[id]);
    const wHtml = ws.map((id) => { const w = WEAPONS[id], eq = g.player.weapon?.id === id;
      return `<div class="inv-item${eq ? ' equipped' : ''}"><b>${w.name}</b>${eq ? ' — em mãos' : ''}${g.player.sharpened && w.sharpenable ? ' · afiado' : ''}${Menus.condText(w, g.inventory)}<br><span class="small">${w.short || ''}</span></div>`; }).join('')
      + (ws.length > 1 ? '<div class="inv-item small"><b>R</b> (LB): trocar de arma</div>' : '')
      + (ws.some((id) => WEAPONS[id].durability) ? `<div class="inv-item small"><b>G</b> (↓): reparar a arma em mãos — kit de reparo ×${g.inventory.count('kit_reparo')}${g.inventory.has('pedra_afiar') ? ' · pedra de afiar (lâminas até 60%)' : ''}</div>` : '')
      + (ws.includes('revolver') ? '<div class="inv-item small"><b>T</b> (↑): recarregar · <b>Q</b> (LT) segurado: mira manual</div>' : '');
    $('invList').innerHTML = wHtml +
      (items.length ? items.map((i) => `<div class="inv-item"><b>${i.name}</b> ×${i.n}<br><span class="small">${i.desc || ''}</span></div>`).join('') : (ws.length ? '' : '<div class="inv-item small">Vazio</div>'));
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
    const ch2 = mapChapter() === 2;
    for (const el of document.querySelectorAll('.map-tab')) {
      el.classList.toggle('active', FLOORS[+el.dataset.floor].id === mv.floor);
      el.classList.toggle('hidden', ch2 && FLOORS[+el.dataset.floor].id !== 'up');
      el.textContent = ch2 ? 'Bairro Operário' : FLOORS[+el.dataset.floor].name;
    }
    const r = roomAt(g.player.pos);
    $('mapWhere').textContent = 'Você está em: ' + (r ? r.name : 'lugar nenhum que conste na planta');
    $('mapPlan').textContent = ch2 ? 'Bairro Operário: sem planta — só aparece o que você já percorreu.' : g.quest.has('hasMapPlan') ? 'Planta do hospital: alas não visitadas em tracejado.' : 'Sem a planta: só aparece o que você já percorreu.';
    const notes = collectNotes(g);
    $('mapNotes').innerHTML = notes.length ? notes.map((t) => `<div class="inv-item small">• ${t}</div>`).join('') : '<div class="inv-item small">Nada anotado</div>';
  }
  showChapterEnd(stats) {
    const t = Math.floor(stats.time), ch = stats.chapter || 1;
    const docsCh = Object.values(DOCUMENTS).filter((d) => (d.ch || 1) === ch).length;
    const docsHave = stats.docsList ? stats.docsList.filter((id) => (DOCUMENTS[id]?.ch || 1) === ch).length : stats.docs;
    $('stats').innerHTML = `Tempo: ${Math.floor(t / 60)}min ${t % 60}s · Inimigos abatidos: ${stats.kills} · Dano recebido: ${Math.round(stats.damageTaken)} · Documentos: ${Math.min(docsHave, docsCh)}/${docsCh}`
      + (ch === 1 ? `<br>Revelação RN 0: ${stats.rn0 ? 'vista' : 'não encontrada'}` : `<br>Passe da Linha 4: ${stats.pass ? 'com Elias' : 'ficou na grelha da fornalha'}`);
    const next = $('btnEndNext');
    if (ch === 2) {
      $('endTitle').textContent = 'Fim do Capítulo 2 — Fumaça';
      $('endText').textContent = 'Brás tomba sobre a grelha e a Garganta engasga. Pela porta de serviço, Elias sai para a Rua da Fundição: os trilhos da Linha 4 seguem para o centro, onde fica a Sede da Confraria.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 3 — A Confraria: em breve.';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.pass
        ? 'No bolso, o passe de latão do motorneiro, amarrado na mesma fita vermelha do dente de leite. Inês foi por ali. Eles sabem o número de Elias — e agora ele sabe o caminho.'
        : '<span class="small">Algo brilhou na grelha da fornalha quando Brás caiu. Inês deixou um sinal para quem viesse atrás.</span>';
      if (next) { next.disabled = true; next.textContent = 'Capítulo 3 — A Confraria (em breve)'; }
      this.show('chapterEnd');
      return;
    }
    if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 2 — Fumaça'; }
    $('endTitle').textContent = 'Fim do Capítulo 1 — Hospital São Dimas';
    $('endText').textContent = 'Elias atravessa o portão de serviço. Lá fora, a fuligem do Bairro Operário cai como neve suja.';
    $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 2 — Fumaça: Bairro Operário, Rua do Carvão e a fábrica de fumaça.';
    // desfecho: muda se Elias já entendeu quem ele é (rito da pia de batismo, no arquivo morto)
    const p = $('endRn0');
    if (p) {
      p.classList.remove('hidden');
      p.innerHTML = stats.rn0
        ? 'Elias sabe agora o que a Confraria contou: ele é o RN 0, o primeiro batizado na cinza, e voltou como estava escrito. Mas o Quarto 7 está vazio — o sete foi liberado. Na boca, o gosto de cinza; no bolso, um dente de leite preso numa fita vermelha.'
        : '<span class="small">Algo no subsolo ainda espera por Elias. A cinza da pia de batismo não esqueceu o nome dele.</span>';
    }
    this.show('chapterEnd');
  }
  /** conservação no inventário */
  static condText(w, inv) {
    if (w.cylinder) return ` · tambor ${inv.rounds(w.id)}/${w.cylinder} · reserva ${inv.count(w.ammo)}`;
    if (!w.durability) return '';
    const c = inv.condition(w.id);
    return ` · <span class="${c <= 0 ? 'cond-broken' : c < 0.5 ? 'cond-worn' : ''}">${Math.round(c * 100)}% ${conditionLabel(c)}</span>`;
  }
}
