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

export const ENEMY_MODELS = {
  enfermeiro: { url: './models/enfermeiro.glb' },
  hornbeard: { url: './models/hornbeard.glb', draco: true, legacy: true },
  interno: { url: './models/infectado.glb' },
};
/** escolhe o clipe pela velocidade (m/s) e estado; null = sem clipe (pose estática) */
export function pickClip(names, speed, state) {
  const has = (n) => names.includes(n);
  if (state === 'dead' || state === 'dormant') return null;
  if (speed > 1.6 && has('Running')) return { name: 'Running', scale: Math.min(1.4, speed / 3) };
  if (has('Walking')) return { name: 'Walking', scale: speed > 0.05 ? Math.max(0.5, Math.min(1.5, speed / 1.1)) : 0.15 };
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
    lean = t < w ? -0.15 * (t / w) : t < w + a.active ? 0.45 : Math.max(0, 0.45 * (1 - (t - w - a.active) / a.recover));
    push = lean > 0 ? lean * 0.35 : 0;
  } else if (st === 'grabbing') lean = 0.35;
  else if (st === 'stagger') lean = -0.25;
  G.model.rotation.x = lean; G.model.position.z = push;
  if (enemy.flinch > 0) G.model.rotation.x -= enemy.flinch * 0.6;
  if (!G.mixer) return;
  const pick = pickClip(G.names, st === 'attack' || st === 'grabbing' ? 0.6 : speed, st);
  if (!pick) { if (G.cur) { G.cur.paused = true; } return; }
  const act = G.actions[pick.name];
  if (G.cur !== act) { act.reset().play(); if (G.cur) { G.cur.paused = false; act.crossFadeFrom(G.cur, 0.25, false); } G.cur = act; }
  act.paused = false; act.timeScale = pick.scale;
  G.mixer.update(dt);
}
