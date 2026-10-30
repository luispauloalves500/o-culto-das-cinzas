// Lógica do arquivo morto (subsolo): porta de ferro (chave do posto obstétrico), autosave, ficha arquivada de Elias
// e o segredo: o arquivo deslizante só anda com a manivela da maternidade e revela a Sala de batismo.
import * as THREE from 'three';
import { LO, ROLLING, CRANK_SOCKET, FONT, DEAD_ARCHIVE_DOORS } from './HospitalDeadArchive.js';
import { wakeEnemy, ammoMesh } from './HospitalPedsScript.js';

export { DEAD_ARCHIVE_DOORS };

export const DEAD_ARCHIVE_SPAWNS = [
  { id: 'int_morto', type: 'interno', x: 44.6, y: LO, z: 6.5, patrol: [{ x: 44.6, y: LO, z: 7.6 }, { x: 44.6, y: LO, z: -1.6 }] },
  { id: 'ras_morto', type: 'rastejador', x: 42.2, y: LO, z: 1.2, yaw: Math.PI, dormant: true },
];

export function setupDeadArchive(S) {
  const g = S.game, M = g.materials;
  S._doc('prontuario_rn0', { x: 45.0, y: LO + 0.95, z: 9.0 }, 45.0, LO + 0.81, 9.15);
  // manivela no encaixe do arquivo deslizante
  g.interact.add({ id: 'crank_shelf', pos: { x: CRANK_SOCKET.x + 0.4, y: CRANK_SOCKET.y, z: CRANK_SOCKET.z + 0.6 }, radius: 1.5,
    enabled: () => !S.q.has('shelfMoved'),
    prompt: () => (g.inventory.has('manivela') ? 'Encaixar a manivela e girar' : 'Examinar o arquivo deslizante'),
    onInteract: () => {
      if (!g.inventory.has('manivela')) {
        S.q.set('note_rolling'); g.audio.play('locked', CRANK_SOCKET);
        g.hud.toast('Um arquivo deslizante pesado, preso aos trilhos. O volante foi arrancado — sobrou só um encaixe quadrado.', 4.5);
        return;
      }
      g.inventory.remove('manivela');
      moveShelf(S, false);
    } });
  // SALA DE BATISMO: recompensa do segredo
  S._pickup('pulseira', { x: 38.8, y: LO + 1.0, z: -5.2 }, 'Pegar a pulseira do altar', () => {
    g.inventory.add('pulseira_recem_nascido'); S.q.set('hasBracelet'); applyBracelet(S);
    g.inventory.add('municao_38', 3); g.inventory.add('bandagem');
    g.hud.toast('Pulseira de recém-nascido — as bandagens curam mais (+65). Debaixo do pano do altar: 3 balas .38 e uma bandagem.', 5.5);
  }, () => {
    const gr = new THREE.Group();
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 12), M.paper); r.rotation.x = Math.PI / 2; r.position.set(38.7, LO + 0.92, -6.0); gr.add(r);
    gr.add(ammoMesh(M, 39.0, LO + 0.9, -5.9, 3));
    gr.add(S._bandMesh(38.5, LO + 0.95, -5.8));
    return gr;
  });
  S._doc('ata_batismo', { x: FONT.x, y: LO + 1.0, z: FONT.z + 0.9 }, FONT.x + 0.35, LO + 0.91, FONT.z + 0.45);
}

export function moveShelf(S, instant) {
  const g = S.game, L = S.level, R = L.rolling;
  S.q.set('shelfMoved');
  g.col.setBox(R.collider, ROLLING.x0 + ROLLING.slide, LO, ROLLING.z0, ROLLING.x1 + ROLLING.slide, LO + 2.4, ROLLING.z1);
  g.nav.link('am_gap', 'bt_c');
  R.handle.visible = true;
  if (instant) { R.slide = 1; R.group.position.x = R.x + ROLLING.slide; return; }
  R.slide = 0;
  g.audio.play('thud', CRANK_SOCKET, { pitch: 0.6 }); g.audio.play('clang', CRANK_SOCKET, { pitch: 0.5 });
  g.perception.noise(CRANK_SOCKET, 14, 'furniture');
  g.hud.toast('A manivela range. O arquivo inteiro desliza nos trilhos — atrás dele, um vão na parede e cheiro de vela.', 4.5);
  wakeEnemy(S, 'ras_morto');
}

function applyBracelet(S) { S.game.player.healAmount = S.q.has('hasBracelet') ? 65 : 45; }

/** porta trancada tratada pelo arquivo morto; retorna true se resolveu */
export function useDoorDeadArchive(S, d) {
  const g = S.game;
  if (d.id === 'deadArchive' && g.inventory.has('chave_arquivo_morto')) {
    g.inventory.remove('chave_arquivo_morto');
    d.locked = false; d.setOpen(true); S.q.set('deadArchiveOpen');
    g.audio.play('switch', d); g.perception.noise(d, 8, 'door');
    g.hud.toast('A chave grande gira com um estalo seco. O arquivo morto está aberto.', 3.5);
    return true;
  }
  return false;
}

export function applyDeadArchive(S, save) {
  const g = S.game, f = save.flags;
  if (f.shelfMoved) moveShelf(S, true);
  applyBracelet(S);
  if (f.shelfMoved) { const w = g.enemies.find((e) => e.id === 'ras_morto'); if (w && w.alive) w.dormant = false; }
}

export function updateDeadArchiveScript(S) {
  const g = S.game, p = g.player.pos, q = S.q, room = S.room;
  if (!q.has('enteredDeadArchive') && room === 'deadArchive' && p.x > 36.6) {
    q.set('enteredDeadArchive'); g.saveGame('deadArchive'); g.hud.toast('Progresso salvo automaticamente.');
  }
  if (!q.has('foundBatismo') && room === 'batismo') { q.set('foundBatismo'); g.audio.play('whisper', { x: FONT.x, y: LO + 1, z: FONT.z }); }
  const w = g.enemies.find((e) => e.id === 'ras_morto');
  if (w && w.alive && w.dormant && Math.abs(p.y - w.pos.y) < 1.5 && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < 2.6) { w.wake(); g.audio.play('groan', w.pos); }
}
