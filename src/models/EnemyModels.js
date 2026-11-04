// pt50u: modelos GLB dos inimigos por cima do rig procedural (mesmo padrão do Elias).
//  - enfermeiro → public/models/enfermeiro.glb (pt52u: Mixamo com pele/34 ossos e clipes Walking/Running)
//    (o Hornbeard estático em hornbeard.glb fica só como recurso legado, sem uso nos inimigos)
//  - interno    → public/models/infectado.glb (Mixamo com pele/ossos e clipes Walking/Running)
// O rig procedural continua existindo (hitboxes, mão, IA e pose de morte não mudam); só as malhas dele são
// escondidas quando o GLB carrega. O GLB fica preso em rig.body, então queda/inclinação do corpo valem para ele.
// Se o arquivo falhar (ou em Node, ou com ?enemyglb=0), o inimigo continua com o visual procedural.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { buildPoseClips } from './MixamoPoses.js';
import { freezeRig } from '../render/Perf.js';
import { attachKnife } from './EnemyWeapons.js';

export const ENEMY_MODELS = {
  enfermeiro: { url: './models/enfermeiro.glb' },
  hornbeard: { url: './models/hornbeard.glb', draco: true, legacy: true },
  interno: { url: './models/infectado.glb' },
};
/** escolhe o clipe pelo estado e velocidade (m/s). Dormente → pose sentada/deitada; morto → deitado; parado → idle
 *  (pose sintetizada, nunca a pose T de ligação). null = sem clipe aplicável. */
export function pickClip(names, speed, state, rest = 'sit') {
  const has = (n) => names.includes(n);
  if (state === 'dormant') return has('Pose_' + rest) ? { name: 'Pose_' + rest, scale: 1, fade: 0.2 } : has('Walking') ? { name: 'Walking', scale: 0 } : null;
  if (state === 'dead') return has('Pose_lie') ? { name: 'Pose_lie', scale: 1, fade: 0.55 } : has('Walking') ? { name: 'Walking', scale: 0 } : null;
  if (speed > 1.6 && has('Running')) return { name: 'Running', scale: Math.min(1.4, speed / 3) };
  if (speed <= 0.05 && has('Pose_idle')) return { name: 'Pose_idle', scale: 1, fade: 0.35 };
  if (has('Walking')) return { name: 'Walking', scale: speed > 0.05 ? Math.max(0.5, Math.min(1.5, speed / 1.1)) : 0 };
  return null;
}
/** escala uniforme para a altura do arquétipo e deslocamento para apoiar os pés no chão */
export function fitScale(box, height) {
  const h = Math.max(0.1, box.max.y - box.min.y), s = height / h;
  return { s, y: -box.min.y * s };
}

const shared = {};
let draco = null;
export function enemyModelsEnabled() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !/[?&]enemyglb=0\b/.test(window.location?.search || '');
}
export function loadEnemyModel(kind) {
  const m = ENEMY_MODELS[kind]; if (!m) return Promise.reject(new Error('sem modelo ' + kind));
  if (shared[kind]) return shared[kind];
  const loader = new GLTFLoader();
  if (m.draco) {
    if (!draco) { draco = new DRACOLoader(); draco.setDecoderPath('./draco/'); draco.setDecoderConfig({ type: 'js' }); }
    loader.setDRACOLoader(draco);
  }
  shared[kind] = new Promise((res, rej) => loader.load(m.url, (g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.geometry.userData.shared = true; o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
    for (const c of g.animations) { // tira root motion do quadril (a IA já move o inimigo)
      const hp = c.tracks.find((t) => /Hips\.position$/.test(t.name));
      if (hp) { const v = hp.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
    }
    if (g.animations.length) {
      try { const b = new THREE.Box3().setFromObject(g.scene); g.animations.push(...buildPoseClips(g.scene, g.animations, b.max.y - b.min.y)); }
      catch (e) { console.warn('[inimigo] poses não sintetizadas:', kind, e?.message || e); }
    }
    res(g);
  }, undefined, rej));
  shared[kind].catch(() => {});
  return shared[kind];
}
export function preloadEnemyModels() { if (enemyModelsEnabled()) for (const k in ENEMY_MODELS) if (!ENEMY_MODELS[k].legacy) loadEnemyModel(k).catch(() => {}); }

/** prende o GLB no inimigo assim que carregar; devolve a promessa (resolve true se aplicou) */
export function attachEnemyModel(enemy) {
  const kind = enemy.def.mats;
  if (!ENEMY_MODELS[kind] || !enemyModelsEnabled() || enemy.def.crawler) return Promise.resolve(false);
  return loadEnemyModel(kind).then((g) => {
    if (enemy.despawned || !enemy.rig?.body) return false;
    const model = g.animations.length ? cloneSkinned(g.scene) : g.scene.clone(true);
    const box = new THREE.Box3().setFromObject(g.scene);
    const { s, y } = fitScale(box, enemy.def.height);
    const holder = new THREE.Group(); holder.name = 'enemyGLB'; holder.add(model);
    model.scale.setScalar(s); model.position.y = y;
    const hide = [];
    enemy.rig.root.traverse((o) => { if (o.isMesh && o !== enemy.sheet && !o.userData.keepVisible) { hide.push(o); o.visible = false; } });
    enemy.rig.body.add(holder);
    if (enemy._frozen) holder.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
    enemy.glb = { kind, holder, model, hidden: hide, mixer: null, actions: {}, cur: null, names: g.animations.map((c) => c.name), height: (box.max.y - box.min.y) * s };
    if (g.animations.length) {
      const mx = new THREE.AnimationMixer(model);
      for (const c of g.animations) enemy.glb.actions[c.name] = mx.clipAction(c);
      enemy.glb.mixer = mx;
      enemy.glb.attackClip = kind === 'enfermeiro' ? 'Pose_atk_stab' : 'Pose_atk_claw';
      if (kind === 'enfermeiro') enemy.glb.knife = attachKnife(model, enemy.rig.root, (on) => {
        const a = enemy.glb.actions.Pose_atk_stab; if (!a) return;
        if (on) { a.reset().play(); a.time = 0; a.timeScale = 0; mx.update(0); } else { a.stop(); mx.update(0); }
      });
      // apoios no chão (pt55u): pés/dedos e o quadril (nádegas ≈ 9% da altura abaixo do osso), costas/cabeça deitado
      const B = (n) => { let f = null; model.traverse((o) => { if (!f && o.isBone && o.name.endsWith(n)) f = o; }); return f; };
      const H = enemy.glb.height;
      enemy.glb.contacts = [['LeftFoot', 0.035], ['RightFoot', 0.035], ['LeftToeBase', 0.02], ['RightToeBase', 0.02], ['Hips', 0.085], ['Spine2', 0.07], ['Head', 0.06], ['LeftHand', 0.02], ['RightHand', 0.02]]
        .map(([n, r]) => [B(n), r * H / 1.8]).filter(([b]) => b);
      enemy.glb.gy = 0;
      // pt54u: o GLB chega assíncrono; se o rig já foi congelado (dormente/morto), descongela para o mixer pôr a pose
      if (enemy._frozen) { freezeRig(enemy.rig.root, false); enemy._frozen = false; }
    }
    return true;
  }).catch((e) => { console.warn('[inimigo] GLB indisponível, usando procedural:', kind, e?.message || e); return false; });
}

/** chamado a cada _animate: clipe pela velocidade; ataque = inclinação/estocada do corpo do GLB */
export function updateEnemyModel(enemy, dt, speed) {
  const G = enemy.glb; if (!G) return;
  const st = enemy.state === 'dead' ? 'dead' : enemy.dormant ? 'dormant' : enemy.state;
  let lean = 0, push = 0;
  if (st === 'attack' && enemy.attack) {
    const a = enemy.attack, t = enemy.stateT, w = a.windup;
    const p = t < w ? 0 : t < w + a.active ? 1 : Math.max(0, 1 - (t - w - a.active) / a.recover);
    push = (G.mixer ? 0.28 : 0.16) * p; lean = G.mixer ? 0 : 0.45 * p;
  } else if (st === 'grabbing') { lean = G.mixer ? 0 : 0.35; push = 0.15; }
  else if (st === 'stagger') lean = -0.25;
  G.model.rotation.x = lean; G.model.position.z = push;
  if (enemy.flinch > 0) G.model.rotation.x -= enemy.flinch * 0.6;
  // morto: o rig procedural tomba o corpo inteiro; o GLB desfaz essa rotação e cai na pose deitada pelo esqueleto
  const body = enemy.rig.body;
  if (G.mixer && st === 'dead') { G.holder.rotation.x = -body.rotation.x; G.holder.position.y = -body.position.y; G.model.rotation.x = 0; }
  else { G.holder.rotation.x = 0; G.holder.position.y = 0; }
  if (!G.mixer) return;
  const atk = (st === 'attack' && enemy.attack) || st === 'grabbing';
  const pick = atk && G.actions[G.attackClip] ? { name: G.attackClip, scale: 0, fade: 0.12 } : pickClip(G.names, speed, st, enemy.restPose || 'sit');
  if (!pick) { if (G.cur) { G.cur.paused = true; } return; }
  const act = G.actions[pick.name];
  if (G.cur !== act) {
    // levantar (sentado/deitado → andar) é uma transição mais longa
    const fade = G.cur && /^Pose_(sit|lie)$/.test(G.cur.getClip().name) && st !== 'dead' ? 1.0 : pick.fade ?? 0.25;
    act.reset().play(); if (G.cur) { G.cur.paused = false; act.crossFadeFrom(G.cur, fade, false); } G.cur = act;
  }
  act.paused = false; act.timeScale = pick.scale;
  if (atk) act.time = attackPhase(enemy);
  G.mixer.update(dt);
  groundModel(enemy, G, dt, st);
}

/** fase 0..3 do ataque (pronto→preparação→golpe→recuperação); agarrando segura o golpe */
export function attackPhase(enemy) {
  if (enemy.state === 'grabbing' || !enemy.attack) return 2;
  const a = enemy.attack, t = enemy.stateT, w = a.windup, act = w + a.active;
  return t < w ? 1 * (t / w) : t < act ? 1 + (t - w) / a.active : 2 + Math.min(1, (t - act) / a.recover);
}

const _gv = new THREE.Vector3();
/** pt55u: assenta o modelo no chão — o ponto de apoio mais baixo (pés, nádegas, costas) toca y=0 da raiz do inimigo.
 *  Sentado/deitado/morto/atacando sempre; andando volta suave ao offset 0 do clipe. */
function groundModel(enemy, G, dt, st) {
  if (!G.contacts?.length) return;
  const root = enemy.rig.root;
  const want = st === 'dormant' || st === 'dead' || st === 'attack' || st === 'grabbing' || (G.cur && /^Pose_/.test(G.cur.getClip().name));
  let target = 0;
  if (want) {
    root.updateMatrixWorld(true);
    let m = Infinity;
    for (const [b, r] of G.contacts) { b.getWorldPosition(_gv); root.worldToLocal(_gv); m = Math.min(m, _gv.y - r); }
    target = -m;
  }
  const k = G.gyInit ? Math.min(1, dt * 10) : 1; G.gyInit = true;
  G.gy += (target - G.gy) * k;
  G.holder.position.y += G.gy;
}
