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
    $('btnEndNext').onclick = () => { g.audio.init(); if (g.chapter >= 8) return; if (g.chapter === 7) g.startChapter8(); else if (g.chapter === 6) g.startChapter7(); else if (g.chapter === 5) g.startChapter6(); else if (g.chapter === 4) g.startChapter5(); else if (g.chapter === 3) g.startChapter4(); else if (g.chapter === 2) g.startChapter3(); else g.startChapter2(); };
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
    const ch2 = mapChapter() === 2, ch3 = mapChapter() === 3, ch4 = mapChapter() === 4, ch5 = mapChapter() === 5, ch6 = mapChapter() === 6, ch7 = mapChapter() === 7;
    for (const el of document.querySelectorAll('.map-tab')) {
      const fid = FLOORS[+el.dataset.floor].id;
      el.classList.toggle('active', fid === mv.floor);
      el.classList.toggle('hidden', ((ch2 || ch6 || ch7) && fid !== 'up') || (ch4 && fid !== 'up' && fid !== 'roof') || (ch3 && fid !== 'up' && fid !== 'lo') || (ch5 && fid !== 'up' && fid !== 'up2'));
      el.textContent = ch7 ? 'Catacumbas · Linha Velha · Sob a Pedra' : ch6 ? 'Museu — O Acervo' : ch5 ? (fid === 'up2' ? 'Mezanino · passarela' : 'Canais · casa de bombas') : ch4 ? (fid === 'roof' ? 'Torre — casa das máquinas' : 'Centro antigo') : ch2 ? 'Bairro Operário' : ch3 ? (fid === 'lo' ? 'Arquivos' : 'Sede — térreo') : FLOORS[+el.dataset.floor].name;
    }
    const r = roomAt(g.player.pos);
    $('mapWhere').textContent = 'Você está em: ' + (r ? r.name : 'lugar nenhum que conste na planta');
    $('mapPlan').textContent = mapChapter() === 7 ? 'Catacumbas e Linha Velha: sem planta — só aparece o que você já percorreu.' : ch6 ? 'Museu de Ciências Proibidas: sem planta — só aparece o que você já percorreu.' : ch5 ? 'Estação de bombeamento: sem planta — só aparece o que você já percorreu.' : ch4 ? 'Centro antigo de Véspera: sem planta — só aparece o que você já percorreu.' : ch2 ? 'Bairro Operário: sem planta — só aparece o que você já percorreu.' : ch3 ? 'Sede da Confraria: sem planta — só aparece o que você já percorreu.' : g.quest.has('hasMapPlan') ? 'Planta do hospital: alas não visitadas em tracejado.' : 'Sem a planta: só aparece o que você já percorreu.';
    const notes = collectNotes(g);
    $('mapNotes').innerHTML = notes.length ? notes.map((t) => `<div class="inv-item small">• ${t}</div>`).join('') : '<div class="inv-item small">Nada anotado</div>';
  }
  showChapterEnd(stats) {
    const t = Math.floor(stats.time), ch = stats.chapter || 1;
    const docsCh = Object.values(DOCUMENTS).filter((d) => (d.ch || 1) === ch).length;
    const docsHave = stats.docsList ? stats.docsList.filter((id) => (DOCUMENTS[id]?.ch || 1) === ch).length : stats.docs;
    $('stats').innerHTML = `Tempo: ${Math.floor(t / 60)}min ${t % 60}s · Inimigos abatidos: ${stats.kills} · Dano recebido: ${Math.round(stats.damageTaken)} · Documentos: ${Math.min(docsHave, docsCh)}/${docsCh}`
      + (ch === 1 ? `<br>Revelação RN 0: ${stats.rn0 ? 'vista' : 'não encontrada'}`
        : ch >= 5 ? `<br>Caderno do comporteiro: ${stats.diario ? 'lido' : 'não lido'} · Ficha de remessa: ${stats.ficha ? 'lida' : 'não lida'}`
        : ch >= 4 ? `<br>Bilhete de Inês: ${stats.note ? 'lido' : 'ficou preso na engrenagem'} · Livro de rondas: ${stats.rounds ? 'lido' : 'não lido'}`
        : ch === 3 ? `<br>Fita de Inês: ${stats.ribbon ? 'com Elias' : 'ficou no altar da cripta'} · Ordem de transferência: ${stats.order ? 'lida' : 'não lida'}`
          : `<br>Passe da Linha 4: ${stats.pass ? 'com Elias' : 'ficou na grelha da fornalha'}`);
    const next = $('btnEndNext');
    if (ch >= 7) {
      $('stats').innerHTML = $('stats').innerHTML.replace(/<br>Caderno do comporteiro.*$/, '')
        + `<br>Ata da Confraria: ${stats.ata ? 'lida' : 'ficou no atril'} · Guia de remoção: ${stats.guia ? 'lida' : 'não lida'}`;
      $('endTitle').textContent = 'Fim do Capítulo 7 — Sob a Pedra';
      $('endText').textContent = 'O Vigia Caiado cai de joelhos diante da parede de onde saiu, e a cal do corpo se esfarela até sobrar só o chapéu e o gancho. O lampião frio apaga — de vez, agora. A escada de serviço sobe para fora da pedra: lá em cima, o zumbido dos fios da Usina de Véspera.';
      $('endNote').textContent = 'Seu progresso foi salvo. A escada de serviço sobe até o pátio de carvão da Usina de Véspera — siga para o Capítulo 8.';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.ata
        ? 'A <b>Primeira Cinza</b> dormia Sob a Pedra desde 1912 — e foi <b>acordada</b>. Inês foi levada no último trem para a <b>torre de transmissão da Usina</b>, onde <b>Vernet</b> espera: "a voz dela vai pelos fios para todas as casas". Na margem, a letra dela: <b>"Eu ainda estou aqui."</b>'
        : '<span class="small">No atril diante da parede de cal havia um livro de atas aberto. A tinta da última página ainda borrava.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 8 — A Última Chama'; }
      this.show('chapterEnd');
      return;
    }
    if (ch >= 6) {
      $('stats').innerHTML = $('stats').innerHTML.replace(/<br>Caderno do comporteiro.*$/, '')
        + `<br>Relicário do Colecionador: ${stats.relic ? 'aberto' : 'ficou no peito dele'} · Catálogo do Colecionador: ${stats.catalogo ? 'lido' : 'não lido'}`;
      $('endTitle').textContent = 'Fim do Capítulo 6 — O Acervo';
      $('endText').textContent = 'O Colecionador fica de joelhos no próprio pedestal, em pose, como a última peça da Galeria. Na reserva técnica, atrás das estantes de "peças a catalogar", o alçapão de serviço desce para as galerias de pedra sob o Museu — rumo às catacumbas e à linha antiga do metrô, onde levaram Inês.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 7 — Sob a Pedra: as catacumbas sob o Museu, a linha antiga do metrô e a estação que não está no mapa.';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.relic || stats.catalogo
        ? 'Inês, a <b>peça 31</b>, está <b>viva</b>: "não é peça de exposição, é <b>oferenda</b>" — levada para baixo, <b>onde a Primeira Cinza foi enterrada</b>. Elias é a <b>peça 32</b>. A estação riscada no mapa: <b>Sob a Pedra</b>.'
        : '<span class="small">No peito do Colecionador havia um relicário, e na reserva técnica, um catálogo aberto. Alguém anotou para onde Inês foi.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 7 — Sob a Pedra'; }
      this.show('chapterEnd');
      return;
    }
    if (ch >= 5) {
      $('endTitle').textContent = 'Fim do Capítulo 5 — Águas Negras';
      $('endText').textContent = 'A Afogada afunda pela última vez no poço das turbinas e a água fica parada. Pela galeria de descarga, Elias chega à grade do rio: lá embaixo, a esteira de uma barcaça ainda balança na água preta, rio abaixo, rumo ao Museu.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 6 — O Acervo: o Museu de Ciências Proibidas e a Galeria do Colecionador.';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.ficha
        ? 'A ficha da <b>remessa nº 31</b> não deixa dúvida: "peça viva, fita vermelha", rio abaixo, para <b>O Acervo</b>. ' + (stats.diario ? 'E a guardiã da comporta tinha nome: <b>Lurdes</b>, a mulher do comporteiro Anselmo.' : 'Alguém deu nome à guardiã da comporta.')
        : '<span class="small">Sobre um caixote na galeria de descarga havia uma ficha com o lacre da Confraria.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 6 — O Acervo'; }
      this.show('chapterEnd');
      return;
    }
    if (ch >= 4) {
      $('endTitle').textContent = 'Fim do Capítulo 4 — Cidade Morta';
      $('endText').textContent = 'O lampião do Vigia se parte entre as engrenagens e a luz fria se apaga de vez. Às 3h07 o martelo bate, o sino toca três vezes e a chapa de ferro da casa das máquinas desce. A passagem do Relógio afunda na pedra, úmida, rumo ao barulho de água corrente sob a cidade.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 5 — Águas Negras: os canais e a estação de bombeamento (primeira parte jogável).';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.note
        ? 'O bilhete de Inês fala de uma <b>estação de bombeamento</b>, dos <b>canais</b> e de alguém que guarda as comportas: <b>a Afogada</b>. "Não confie no relógio. Confie na fita."'
        : '<span class="small">Entre os dentes da engrenagem mais alta havia um papel dobrado. Inês passou por ali.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 5 — Águas Negras'; }
      this.show('chapterEnd');
      return;
    }
    if (ch === 3) {
      $('endTitle').textContent = 'Fim do Capítulo 3 — A Confraria';
      $('endText').textContent = 'O Sacristão cai diante do altar e a chama do relicário se apaga. Pela porta de ferro, as catacumbas sobem em degraus de osso até um bueiro do centro antigo. Lá em cima, Véspera está em silêncio: ruas vazias, vitrines cobertas de cinza e, acima de tudo, o mostrador parado do Relógio.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 4 — Cidade Morta: a Rua do Comércio, a Praça do Relógio e o Vigia (primeira parte jogável).';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.order
        ? 'A ordem do altar não deixa dúvida: Inês segue para a <b>Torre</b>, pela Cidade Morta, e só o <b>Vigia</b> abre a passagem do Relógio. ' + (stats.ribbon ? 'No bolso de Elias, a fita de cabelo dela, ao lado do passe da Linha 4.' : 'A fita vermelha dela ficou presa no prego do altar.')
        : '<span class="small">Sobre o altar havia papéis com o lacre da Confraria. Quem os escreveu sabe para onde Inês foi levada.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 4 — Cidade Morta'; }
      this.show('chapterEnd');
      return;
    }
    if (ch === 2) {
      $('endTitle').textContent = 'Fim do Capítulo 2 — Fumaça';
      $('endText').textContent = 'Brás tomba sobre a grelha e a Garganta engasga. Pela porta de serviço, Elias sai para a Rua da Fundição. O bonde da Linha 4 espera com o motor ligado; o motorneiro olha a fita vermelha, acena e fecha a porta. Os trilhos sobem para o centro, até a Sede da Confraria.';
      $('endNote').textContent = 'Seu progresso foi salvo. Capítulo 3 — A Confraria: o Largo do Véu, a Sede e os arquivos subterrâneos.';
      $('endRn0').classList.remove('hidden');
      $('endRn0').innerHTML = stats.pass
        ? 'No bolso, o passe de latão do motorneiro, amarrado na mesma fita vermelha do dente de leite. Inês foi por ali. Eles sabem o número de Elias — e agora ele sabe o caminho.'
        : '<span class="small">Algo brilhou na grelha da fornalha quando Brás caiu. Inês deixou um sinal para quem viesse atrás.</span>';
      if (next) { next.disabled = false; next.textContent = 'Seguir para o Capítulo 3 — A Confraria'; }
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
