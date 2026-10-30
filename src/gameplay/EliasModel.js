// Elias Varga REV6 (GLB Mixamo + machado no socket da mão direita) por cima do rig procedural.
// O rig procedural continua existindo (invisível): é a fonte de poses para os estados sem clipe
// (esquiva, defesa, mira, recarga, cura, reparo, agarrão, morte, estocada e tiro), copiadas para os
// ossos do GLB por direção de membro. Locomoção, idle e golpes de corte usam os clipes do GLB.
// Se o GLB não carregar (ou em Node), o jogo segue com o visual procedural.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { criarSistemaMachado } from './rev6/sistemaMachado.js';
import { CONFIG_MACHADO, CLIP, CLIP_SPEED, ATTACK_CLIPS, attackClipTime } from './rev6/configMachado.js';

export const ELIAS_URL = './models/elias_rev6.glb';
// marcadores da hitbox no espaço local de Machado_Equipado (cabo em +Y a partir da pegada, lâmina em −X)
export const AXE_TIP = [-0.12, 0.48, 0];
export const AXE_MID = [-0.01, 0.2, 0];
/**
 * Pegada do machado: transform local de Machado_Equipado dentro de SocketMachado_Direita.
 * O socket do REV6 já passa o cabo (+Y) pelo eixo do punho fechado (polegar→mindinho), mas virava a lâmina (−X)
 * para o lado da palma (−Z da mão), ou seja, o fio apontava para a coxa/para os dedos. Girar −90° em Y (eixo do cabo)
 * leva o fio para +Y da mão (direção dos nós dos dedos, a mesma da face de um martelo), coerente com o golpe.
 * Posição: o socket (0, 0.12, −0.025 na mão) já cai no centro do punho fechado; escala 1.
 */
export const AXE_GRIP = { pos: [0, 0, 0], rotDeg: [0, -90, 0], scale: 1 };

/** remove o deslocamento horizontal do quadril (root motion dos combos) e trilhas de escala constantes */
export function prepareClips(clips) {
  for (const clip of clips) {
    clip.tracks = clip.tracks.filter((tr) => {
      if (!tr.name.endsWith('.scale')) return true;
      const v = tr.values; for (let i = 0; i < v.length; i++) if (Math.abs(v[i] - 1) > 1e-3) return true;
      return false;
    });
    const hp = clip.tracks.find((tr) => tr.name === 'mixamorigHips.position');
    if (hp) { const v = hp.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
  }
  return clips;
}

/**
 * Idle "Elias_Idle": o clipe parado do pacote (_01a17993…) segura o braço direito erguido à frente (guarda de lanterna),
 * o que deixava o machado espetado no ar. Mantém o corpo/respiração do clipe e troca a cadeia do braço direito
 * (ombro, braço, antebraço, mão) pela pose relaxada do Walking em IDLE_ARM_T (mão ao lado da coxa, passo neutro).
 */
export const IDLE_CLIP = 'Elias_Idle';
export const IDLE_ARM_T = 0.47;
const ARM_R = /^mixamorigRight(Shoulder|Arm|ForeArm|Hand)\.quaternion$/;
export function makeIdleClips(clips) {
  const src = clips.find((c) => c.name === CLIP.idleSrc), walk = clips.find((c) => c.name === CLIP.walk);
  if (!src || !walk || clips.some((c) => c.name === IDLE_CLIP)) return clips;
  const tracks = src.tracks.map((tr) => {
    if (!ARM_R.test(tr.name)) return tr.clone();
    const w = walk.tracks.find((x) => x.name === tr.name);
    if (!w) return tr.clone();
    const q = Array.from(w.createInterpolant().evaluate(IDLE_ARM_T));
    return new THREE.QuaternionKeyframeTrack(tr.name, [0, src.duration], [...q, ...q]);
  });
  const idle = new THREE.AnimationClip(IDLE_CLIP, src.duration, tracks);
  const idleM = idle.clone(); idleM.name = IDLE_CLIP + '_Machado';
  clips.push(idle, idleM);
  for (const c of clips) if (CARRY_CLIPS.includes(c.name)) applyCarry(c);
  return clips;
}

/**
 * Pegada de transporte (idle/andar/correr armado). Nos clipes Mixamo a mão direita pende com a palma para trás e o
 * polegar para dentro, então o eixo do punho (por onde passa o cabo) ficava atravessado na frente da coxa / para trás.
 * Correção constante no espaço do osso, calculada em .dbg/carryq.mjs a partir do Elias_Idle_Machado t=0:
 *  - CARRY_HAND_R: mão-mundo → polegar (cabo) 30° abaixo da horizontal apontando para a frente, palma voltada para a coxa;
 *  - CARRY_FORE_Q: 60% da torção (63° em torno do eixo do antebraço) vai para o antebraço, o resto fica no punho
 *    (mão' = CARRY_FORE_Q⁻¹ · mão · CARRY_HAND_R), para a pele do pulso não “torcer como papel de bala”.
 * Ataques, bloqueio e mira não são tocados (o clipe de golpe já orienta o punho).
 */
export const CARRY_CLIPS = ['Elias_Idle_Machado', 'Walking_Machado', 'Running_Machado'];
export const CARRY_HAND_R = [-0.3193, 0.738, -0.1886, 0.5637];
export const CARRY_FORE_Q = [0, 0.5236, 0, 0.8519];
function applyCarry(clip) {
  if (clip.userData?.carry) return;
  const R = new THREE.Quaternion().fromArray(CARRY_HAND_R).normalize(), F = new THREE.Quaternion().fromArray(CARRY_FORE_Q).normalize();
  const Fi = F.clone().invert(), q = new THREE.Quaternion();
  for (const tr of clip.tracks) {
    const hand = tr.name === 'mixamorigRightHand.quaternion', fore = tr.name === 'mixamorigRightForeArm.quaternion';
    if (!hand && !fore) continue;
    const v = tr.values;
    for (let i = 0; i < v.length; i += 4) {
      q.fromArray(v, i);
      if (hand) q.premultiply(Fi).multiply(R); else q.multiply(F);
      q.toArray(v, i);
    }
  }
  clip.userData = { ...(clip.userData || {}), carry: true };
}

const BONES = {
  hips: 'Hips', spine: 'Spine', neck: 'Neck', head: 'Head',
  armR: 'RightArm', foreR: 'RightForeArm', handR: 'RightHand', armL: 'LeftArm', foreL: 'LeftForeArm', handL: 'LeftHand',
  upLegR: 'RightUpLeg', legR: 'RightLeg', footR: 'RightFoot', upLegL: 'LeftUpLeg', legL: 'LeftLeg', footL: 'LeftFoot',
};
export const RETARGET = {
  arms: ['armR', 'armL'],
  aim: ['armR', 'armL', 'handR'],
  upper: ['spine', 'armR', 'armL', 'handR'],
  full: ['spine', 'armR', 'armL', 'handR', 'legR', 'legL'],
};

// um download/parse por página; cada partida (novo PlayerController) usa um clone com esqueleto próprio
let _shared = null;
const _progress = new Set();
function loadShared(url) {
  if (!_shared) {
    _shared = new Promise((resolve, reject) => new GLTFLoader().load(url, (g) => { makeIdleClips(prepareClips(g.animations)); resolve(g); },
      (ev) => { if (ev.total) for (const m of _progress) m.progress = ev.loaded / ev.total; }, reject));
    _shared.catch(() => { _shared = null; });
  }
  return _shared;
}

export function preloadElias(url = ELIAS_URL) { if (typeof window !== 'undefined' && !/[?&]elias=0\b/.test(window.location?.search || '')) loadShared(url).catch(() => {}); }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion();

export class EliasModel {
  constructor(rig) {
    this.rig = rig;
    this.ready = false; this.failed = false; this.progress = 0;
    this.mask = null; this.idleT = 0; this.fidget = false; this._atk = null;
    this._cbs = [];
  }
  whenReady(cb) { if (this.ready) cb(this); else this._cbs.push(cb); }

  load(url = ELIAS_URL) {
    if (typeof window === 'undefined' || this._loading) return;
    // ?elias=0 → força o visual procedural (máquinas fracas / depuração)
    if (/[?&]elias=0\b/.test(window.location?.search || '')) { this.failed = true; return; }
    this._loading = true;
    _progress.add(this);
    loadShared(url).then((gltf) => {
      _progress.delete(this); this.progress = 1;
      try { this._setup({ scene: cloneSkinned(gltf.scene), animations: gltf.animations }); } catch (e) { this.failed = true; console.warn('[Elias] GLB inválido, mantendo visual procedural', e); }
    }, (e) => { _progress.delete(this); this.failed = true; console.warn('[Elias] GLB não carregou, mantendo visual procedural', e); });
  }

  _setup(gltf) {
    const root = gltf.scene; root.name = 'EliasREV6';
    this.clips = gltf.animations;
    root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; if (o.isSkinnedMesh) o.frustumCulled = false; }
    });
    this.mixer = new THREE.AnimationMixer(root);
    this.sistema = criarSistemaMachado({ THREE, personagem: root, mixer: this.mixer, clipes: this.clips, config: CONFIG_MACHADO });
    this.b = {};
    for (const k in BONES) { this.b[k] = root.getObjectByName('mixamorig' + BONES[k]); if (!this.b[k]) throw new Error('osso ausente: ' + BONES[k]); }
    this.socket = root.getObjectByName('SocketMachado_Direita');
    this.axe = root.getObjectByName('Machado_Equipado');
    // malha do machado para o cenário (sem marcadores)
    this.axeGeometry = this.axe.geometry; this.axeMaterial = this.axe.material;
    this.axe.position.fromArray(AXE_GRIP.pos); this.axe.rotation.set(...AXE_GRIP.rotDeg.map((d) => THREE.MathUtils.degToRad(d))); this.axe.scale.setScalar(AXE_GRIP.scale);
    this.axeTip = new THREE.Object3D(); this.axeTip.position.fromArray(AXE_TIP); this.axeTip.name = 'MachadoHitboxPonta'; this.axe.add(this.axeTip);
    this.axeMid = new THREE.Object3D(); this.axeMid.position.fromArray(AXE_MID); this.axeMid.name = 'MachadoHitboxCabo'; this.axe.add(this.axeMid);
    // adaptador: referencial das armas procedurais (cabo em −Y, frente em +Z) → referencial do socket (cabo +Y, lâmina −X)
    this.adapter = new THREE.Group(); this.adapter.name = 'SocketArmasProcedurais';
    this.adapter.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0)));
    this.socket.add(this.adapter);
    // mão-alvo: orientação de rig.armR.end ⇒ orientação da mão do GLB
    this.handFromEnd = this.socket.quaternion.clone().multiply(this.adapter.quaternion).invert();
    this.root = root;
    this.yawFix = this._calibrate();
    this.rig.body.add(root);
    this.sistema.tocar(CLIP.idle, { fade: 0 });
    this.mixer.update(0);
    this.ready = true;
    for (const cb of this._cbs.splice(0)) { try { cb(this); } catch (e) { console.warn('[Elias] callback', e); } }
  }

  /** arma na mão: só o machado usa Machado_Equipado; as demais ficam no adaptador com os dedos fechados */
  syncWeapon(id, ownsAxe) {
    if (!this.ready) return;
    const S = this.sistema; this.armed = !!id;
    if ((ownsAxe || id === 'machado') && !S.possuiMachado) S.restaurar({ possuiMachado: true, machadoEquipado: false });
    S.equipar(id === 'machado');
    S.empunhar(!!id && id !== 'machado');
  }

  /** escolhe idle / Walking / Running pela velocidade real (timeScale casado com a passada do clipe) */
  locomote(hs, running, dt) {
    const S = this.sistema; this._atk = null; this.root.rotation.y = 0;
    if (hs < 0.35) {
      this.idleT += dt;
      if (this.fidget) {
        const a = S.atual;
        if (!a || S.nomeBase !== CLIP.fidget || a.time >= a.getClip().duration - 0.05) { this.fidget = false; this.idleT = 0; }
        else return;
      }
      // o gesto ergue as duas mãos à cabeça: só desarmado
      if (this.idleT > 14 && !this.armed) { this.fidget = true; S.tocar(CLIP.fidget, { repetir: false, fade: 0.3 }); return; }
      S.tocar(CLIP.idle, { fade: 0.2 });
      return;
    }
    this.idleT = 0; this.fidget = false;
    const clip = running && hs > 3.2 ? CLIP.run : CLIP.walk;
    const a = S.tocar(clip, { fade: 0.15 });
    a.setEffectiveTimeScale(THREE.MathUtils.clamp(hs / CLIP_SPEED[clip], 0.55, 1.85));
  }

  /** base parada (idle) para estados reescritos pelo rig procedural */
  base() { this.root.rotation.y = 0; this._atk = null; this.idleT = 0; this.fidget = false; this.sistema.tocar(CLIP.idle, { fade: 0.12 }); }

  /**
   * golpe: se houver clipe, posiciona o clipe no tempo casado com a janela active (hitbox = lâmina visível);
   * senão (estocada da lança, tiro) usa o rig procedural reescrito no GLB. Retorna true se usou clipe.
   */
  poseAttack(attack, t) {
    const map = ATTACK_CLIPS[attack.def.anim];
    if (!map) { if (this._atk !== attack) { this.base(); this._atk = attack; } this.mask = RETARGET.upper; return false; }
    if (this._atk !== attack) {
      this._atk = attack;
      this._atkAction = this.sistema.tocar(map.clip, { repetir: false, velocidade: 0, fade: 0.1 });
    }
    this._atkAction.time = attackClipTime(map, attack.def.active, t);
    this.mask = null;
    // gira o corpo para o corte cruzar a frente: entra até o início da janela, sai depois do fim
    const [a0, a1] = attack.def.active;
    const env = t < a0 ? THREE.MathUtils.smoothstep(t, 0, a0) : t <= a1 ? 1 : 1 - THREE.MathUtils.smoothstep(t, a1, 1);
    this.root.rotation.y = (this.yawFix?.[attack.def.anim] ?? 0) * env;
    return true;
  }

  /**
   * direção média da lâmina na fase rápida de cada golpe (clipes com o quadril fixo). Os clipes do pacote
   * cortam na diagonal (o golpe termina à esquerda); o corpo gira esse ângulo no golpe para a lâmina cruzar a frente.
   */
  _calibrate() {
    const mx = new THREE.AnimationMixer(this.root), out = {};
    const p = new THREE.Vector3();
    for (const k in ATTACK_CLIPS) {
      const m = ATTACK_CLIPS[k], clip = this.clips.find((c) => c.name === CONFIG_MACHADO.clipMap[m.clip]);
      if (!clip) { out[k] = 0; continue; }
      const act = mx.clipAction(clip); act.play();
      let sx = 0, sz = 0, prev = null;
      for (let i = 0; i <= 12; i++) {
        act.time = m.strike[0] + (m.strike[1] - m.strike[0]) * i / 12; mx.update(0);
        this.root.updateMatrixWorld(true); this.axeTip.getWorldPosition(p);
        if (prev) { const w = p.distanceTo(prev); sx += p.x * w; sz += p.z * w; }
        prev = p.clone();
      }
      act.stop(); mx.uncacheAction(clip);
      out[k] = -Math.atan2(sx, sz);
    }
    mx.uncacheRoot(this.root);
    return out;
  }

  /** aplica clipes (+ cópia procedural) já neste quadro, para a hitbox ler a pose final */
  apply() { this.mixer.update(0); this._retarget(); this.rig.root.updateMatrixWorld(true); }

  update(dt) {
    if (!this.ready) return;
    this.mixer.update(dt);
    this._retarget();
  }

  _retarget() {
    const m = this.mask; if (!m) return;
    const r = this.rig, B = this.b;
    // altura do quadril (agachar na esquiva/reparo, erguido no agarrão)
    B.hips.position.y += r.hips.position.y - r.baseHipY;
    r.root.updateMatrixWorld(true);
    for (const k of m) {
      switch (k) {
        case 'spine': this._align(B.spine, B.neck, r.torso, r.neck); break;
        case 'armR': this._align(B.armR, B.foreR, r.armR.upper, r.armR.lower); this._align(B.foreR, B.handR, r.armR.lower, r.armR.end); break;
        case 'armL': this._align(B.armL, B.foreL, r.armL.upper, r.armL.lower); this._align(B.foreL, B.handL, r.armL.lower, r.armL.end); break;
        case 'legR': this._align(B.upLegR, B.legR, r.legR.upper, r.legR.lower); this._align(B.legR, B.footR, r.legR.lower, r.legR.end); break;
        case 'legL': this._align(B.upLegL, B.legL, r.legL.upper, r.legL.lower); this._align(B.legL, B.footL, r.legL.lower, r.legL.end); break;
        case 'handR': {
          r.armR.end.getWorldQuaternion(_qw).multiply(this.handFromEnd);
          B.handR.parent.getWorldQuaternion(_qp);
          B.handR.quaternion.copy(_qp.invert().multiply(_qw));
          B.handR.updateMatrixWorld(true);
          break;
        }
        default: break;
      }
    }
  }

  /** gira `bone` (no mundo) para que bone→child aponte como pa→pb do rig procedural */
  _align(bone, child, pa, pb) {
    pb.getWorldPosition(_c).sub(pa.getWorldPosition(_d));
    if (_c.lengthSq() < 1e-8) return;
    _c.normalize();
    child.getWorldPosition(_a).sub(bone.getWorldPosition(_b));
    if (_a.lengthSq() < 1e-8) return;
    _a.normalize();
    _q.setFromUnitVectors(_a, _c);
    bone.getWorldQuaternion(_qw).premultiply(_q);
    bone.parent.getWorldQuaternion(_qp);
    bone.quaternion.copy(_qp.invert().multiply(_qw));
    bone.updateMatrixWorld(true);
  }

  /** cópia da malha real do machado para o cenário (pivô no centro do cabo, lâmina para +X como o prop antigo) */
  makeWorldAxe() {
    const m = new THREE.Mesh(this.axeGeometry, this.axeMaterial);
    m.name = 'MachadoCenarioREV6'; m.castShadow = true;
    m.position.y = -0.19; m.rotation.y = Math.PI;
    return m;
  }
}
