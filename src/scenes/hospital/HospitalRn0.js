// Revelação RN 0 (fecho da trama do Cap. 1): na Sala de batismo, com o dente de Davi (Quarto 7) e a pulseira "R N 0"
// (altar), Elias põe os dois na cinza da pia. Cena curta (~18 s, pulável): a cinza sobe, o menino de cinza fala,
// a visão de Marta Varga na maca e do residente Vernet. No fim: documento "A contagem da Confraria", vida cheia, autosave.
import * as THREE from 'three';
import { createHumanoid } from '../../gameplay/ProceduralRig.js';
import { Cutscene } from '../../gameplay/Cutscene.js';
import { LO, FONT } from './HospitalDeadArchive.js';

const DAVI = { x: 39.7, z: -4.9 };
const VERNET = { x: 42.25, z: -6.0 };

export function setupRn0(S) {
  const g = S.game;
  g.interact.add({ id: 'font_rite', pos: { x: FONT.x + 0.9, y: LO + 1.0, z: FONT.z }, radius: 1.5,
    enabled: () => !S.q.has('rn0Revealed'),
    prompt: () => (g.inventory.has('amuleto_menino') && g.inventory.has('pulseira_recem_nascido') ? 'Pôr o dente e a pulseira na cinza' : 'Examinar a cinza da pia'),
    onInteract: () => {
      const tooth = g.inventory.has('amuleto_menino'), band = g.inventory.has('pulseira_recem_nascido');
      if (!tooth || !band) {
        S.q.set('note_font');
        g.audio.play('whisper', { x: FONT.x, y: LO + 1, z: FONT.z });
        const miss = !tooth && !band ? 'o que é do zero e o que é do sete'
          : !tooth ? 'o que é do sete (alguma coisa do Quarto 7, na pediatria)' : 'o que é do zero (a pulseira do altar)';
        g.hud.toast(`A cinza está fria, fria como a sua pele. Riscado na borda da pia: "O ZERO E O SETE". Falta ${miss}.`, 5.5);
        return;
      }
      startRite(S);
    } });
}

export function applyRn0(S) {
  if (S.q.has('rn0Revealed')) settle(S);
}

/** estado final da sala depois do rito (cinza escura e lâmpada fraca) */
function settle(S) {
  const L = S.level;
  if (L.fontAsh && !L.fontAsh.userData.settled) {
    L.fontAsh.material = L.fontAsh.material.clone(); L.fontAsh.material.color.setHex(0x2a2622); L.fontAsh.userData.settled = true;
  }
  if (L.batismoLamp) { L.batismoLamp.base = 0.5; L.batismoLamp.light.intensity = 0.5; }
}

function ghostMat(color, emissive) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
}
function ghost(scale, mat) {
  const r = createHumanoid({ scale, mats: { skin: mat, shirt: mat, arms: mat, pants: mat, legs: mat, feet: mat, head: mat } });
  r.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return r;
}

function startRite(S) {
  const g = S.game, L = S.level, y0 = LO;
  const grp = new THREE.Group(); g.scene.add(grp);
  // partículas de cinza subindo em espiral
  const N = 140, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => ({ a: Math.random() * 6.28, r: 0.1 + Math.random() * 0.4, h: Math.random(), s: 0.4 + Math.random() * 0.8 }));
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pmat = new THREE.PointsMaterial({ color: 0xb8b0a2, size: 0.045, transparent: true, opacity: 0, depthWrite: false });
  const pts = new THREE.Points(pgeo, pmat); pts.frustumCulled = false; grp.add(pts);
  let rise = 0;
  const ash = (dt, strength) => {
    rise += dt;
    for (let i = 0; i < N; i++) {
      const sd = seeds[i], h = (sd.h + rise * sd.s * 0.25) % 1;
      const a = sd.a + rise * (1.2 + sd.s) + h * 3, r = sd.r * (1 + h * 1.4);
      pos[i * 3] = FONT.x + Math.cos(a) * r; pos[i * 3 + 1] = y0 + 0.9 + h * 2.1 * strength; pos[i * 3 + 2] = FONT.z + Math.sin(a) * r;
    }
    pgeo.attributes.position.needsUpdate = true;
  };
  ash(0, 0.1);
  // Davi (cinza, translúcido), Marta deitada sobre a pia, Vernet jovem com a colher de prata
  const mDavi = ghostMat(0x9a948a, 0x2a2826), mVision = ghostMat(0x7c7870, 0x1e1c1a);
  const davi = ghost(0.62, mDavi);
  davi.root.position.set(DAVI.x, y0, DAVI.z); davi.root.rotation.y = Math.atan2(FONT.x + 1.6 - DAVI.x, -3.8 - DAVI.z);
  davi.armR.upper.rotation.x = -0.4; davi.head.rotation.x = 0.1; grp.add(davi.root);
  // fita vermelha no pescoço do menino (o dente foi para a cinza)
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 4, 12), new THREE.MeshBasicMaterial({ color: 0x8a1a12, transparent: true, opacity: 0 }));
  ribbon.rotation.x = Math.PI / 2; ribbon.position.set(DAVI.x, y0 + 0.98, DAVI.z); grp.add(ribbon);
  const marta = ghost(0.95, mVision);
  marta.root.position.set(FONT.x - 0.75, y0 + 0.95, FONT.z); marta.root.rotation.y = Math.PI / 2;
  marta.body.rotation.x = -Math.PI / 2; marta.body.position.y = 0.12; marta.armL.upper.rotation.z = 0.25; grp.add(marta.root);
  const vernet = ghost(1.04, mVision);
  vernet.root.position.set(VERNET.x, y0, VERNET.z); vernet.root.rotation.y = Math.atan2(FONT.x - VERNET.x, FONT.z - VERNET.z);
  vernet.armR.upper.rotation.x = -1.3; vernet.armR.lower.rotation.x = -0.6; vernet.torso.rotation.x = 0.25; grp.add(vernet.root);
  const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.16), new THREE.MeshStandardMaterial({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0 }));
  spoon.position.set(0, -0.05, 0.08); vernet.armR.end.add(spoon);
  const fade = (m, v) => { m.opacity = v; };
  const lamp = L.batismoLamp;
  const lamp0 = lamp ? lamp.base : 1;
  g.audio.play('whisper', { x: FONT.x, y: y0 + 1, z: FONT.z });

  const look = (x, y, z) => ({ x, y: y0 + y, z });
  const shots = [
    { dur: 3.6, from: look(43.4, 1.75, -3.35), to: look(42.7, 1.5, -3.8), look: look(FONT.x, 0.95, FONT.z), lookTo: look(FONT.x, 1.35, FONT.z),
      caption: 'A cinza da pia começa a subir sozinha — fria como a pele de Elias.',
      onUpdate: (k, dt) => { fade(pmat, 0.85 * k); ash(dt, 0.4 + 0.6 * k); if (lamp) lamp.light.intensity = lamp0 * (1 - 0.45 * k); } },
    { dur: 3.9, from: look(41.9, 1.3, -3.55), to: look(41.5, 1.2, -3.7), look: look(DAVI.x, 0.85, DAVI.z), speaker: 'DAVI',
      caption: '— Você é o zero. A tia Cida dizia que o primeiro sempre volta.',
      onStart: () => g.audio.play('whisper', { x: DAVI.x, y: y0 + 1, z: DAVI.z }),
      onUpdate: (k, dt) => { ash(dt, 1); fade(mDavi, 0.62 * Math.min(1, k * 2)); fade(ribbon.material, Math.min(1, k * 2)); davi.head.rotation.y = 0.25 * Math.sin(k * 3); } },
    { dur: 4.3, from: look(39.6, 2.15, -3.45), to: look(39.9, 2.0, -3.8), look: look(FONT.x + 0.3, 1.05, FONT.z - 0.2),
      caption: 'Na cinza, uma mulher numa maca — Marta Varga — e um residente jovem com uma colher de prata.',
      onStart: () => g.audio.play('groan', { x: FONT.x, y: y0 + 1, z: FONT.z }, { pitch: 1.4 }),
      onUpdate: (k, dt) => { ash(dt, 1); const v = 0.5 * Math.min(1, k * 1.6); fade(mVision, v); fade(spoon.material, v * 1.6); vernet.armR.upper.rotation.x = -1.3 + 0.35 * Math.sin(k * 4); } },
    { dur: 3.9, from: look(40.75, 1.05, -3.95), to: look(40.55, 1.0, -4.15), look: look(DAVI.x, 0.95, DAVI.z), speaker: 'DAVI',
      caption: '— Eu era o sete. Fiquei de reserva, caso você não viesse. Agora você veio.',
      onUpdate: (k, dt) => { ash(dt, 1); fade(mVision, 0.5 * (1 - k)); fade(spoon.material, 0.8 * (1 - k)); } },
    { dur: 3.3, from: look(41.4, 2.05, -4.25), to: look(41.15, 1.75, -4.6), look: look(FONT.x, 0.85, FONT.z),
      caption: 'A figura se desfaz. No fundo da pia, uma folha seca que não estava ali.',
      onUpdate: (k, dt) => {
        ash(dt, 1 - 0.85 * k); fade(pmat, 0.85 * (1 - k)); fade(mDavi, 0.62 * (1 - k)); fade(ribbon.material, 1 - k); fade(mVision, 0);
        if (lamp) lamp.light.intensity = lamp0 * 0.55 * (0.6 + 0.4 * k);
      } },
  ];
  const cs = new Cutscene(g, { id: 'rn0', shots, onEnd: (skipped) => finishRite(S, grp, skipped) });
  S.rn0Cutscene = cs;
  g.playCutscene(cs);
}

function finishRite(S, grp, skipped) {
  const g = S.game, p = g.player;
  grp.parent?.remove(grp);
  grp.traverse((o) => { o.geometry?.dispose?.(); });
  S.q.set('rn0Revealed');
  S.rn0Skipped = !!skipped;
  settle(S);
  p.hp = p.maxHp; p.st = p.maxSt;
  // em frente à pia, olhando para ela
  p.yaw = Math.atan2(FONT.x - p.pos.x, FONT.z - p.pos.z);
  g.cameraCtl.yaw = p.yaw;
  g.inventory.addDocument('contagem_confraria');
  g.saveGame('deadArchive');
  g.hud.toast('A cinza assentou. Você se sente inteiro — e frio. Progresso salvo.', 4);
  g.openDocument('contagem_confraria');
}
