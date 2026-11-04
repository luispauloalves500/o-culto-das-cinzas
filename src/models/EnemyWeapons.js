// pt55u: faca do enfermeiro — malha real presa ao osso RightHand do esqueleto Mixamo (segue a animação do braço).
import * as THREE from 'three';

let _geo = null;
function knifeParts() {
  if (_geo) return _geo;
  // lâmina com fio curvo e ponta (perfil extrudado), guarda e cabo; eixo da faca = +Y, empunhadura em y<0
  const sh = new THREE.Shape();
  sh.moveTo(-0.006, 0); sh.lineTo(0.02, 0); sh.quadraticCurveTo(0.024, 0.15, 0.003, 0.25); sh.lineTo(-0.008, 0.23); sh.lineTo(-0.008, 0.01); sh.closePath();
  const blade = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1 }); blade.translate(-0.004, 0, -0.0015);
  const guard = new THREE.BoxGeometry(0.046, 0.01, 0.018);
  const handle = new THREE.CylinderGeometry(0.0115, 0.0105, 0.11, 8); handle.translate(0, -0.059, 0);
  const mats = {
    blade: new THREE.MeshStandardMaterial({ color: 0xd4d9de, metalness: 0.35, roughness: 0.25, emissive: 0x30343a }),
    blood: new THREE.MeshStandardMaterial({ color: 0x5a0d0d, metalness: 0.3, roughness: 0.5 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x2a1c14, metalness: 0.05, roughness: 0.85 }),
  };
  const stain = new THREE.BoxGeometry(0.026, 0.07, 0.0075); stain.translate(0.004, 0.16, 0);
  _geo = { blade, guard, handle, stain, mats };
  return _geo;
}

/** grupo da faca (1 m = 1 unidade), eixo +Y para a ponta */
export function makeKnife() {
  const p = knifeParts(), g = new THREE.Group(); g.name = 'enemyKnife';
  for (const [geo, m] of [[p.blade, p.mats.blade], [p.stain, p.mats.blood], [p.guard, p.mats.handle], [p.handle, p.mats.handle]]) {
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.userData.shared = true; mesh.userData.keepVisible = true; g.add(mesh);
  }
  return g;
}

/** prende a faca à mão direita: cabo no punho, lâmina à frente dos dedos */
export function attachKnife(model, rigRoot, pose) {
  // pose: callback que põe o esqueleto no quadro 'pronto' do ataque (antebraço à frente) — lâmina para cima nele
  pose?.(true);
  let hand = null, fore = null, skinned = null;
  model.traverse((o) => { if (o.isBone && /RightHand$/.test(o.name)) hand = o; if (o.isBone && /RightForeArm$/.test(o.name)) fore = o; if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (!hand || !fore) return null;
  // matrizes de ligação (pose T) no espaço da malha
  // pose atual do clone (quadro em pé do Walking): direções vivas no espaço da raiz do inimigo
  rigRoot.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(rigRoot.matrixWorld).invert();
  const pH = hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv), pF = fore.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
  const qH = rigRoot.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
  const qi = qH.clone().invert();
  const fingers = pH.clone().sub(pF).normalize().applyQuaternion(qi);           // antebraço → mão, no espaço do osso
  const fwd = new THREE.Vector3(0, 1, 0).applyQuaternion(qi);                   // para cima com o antebraço à frente
  fwd.sub(fingers.clone().multiplyScalar(fwd.dot(fingers))).normalize();
  const knife = makeKnife();
  const ws = hand.getWorldScale(new THREE.Vector3()).x / rigRoot.getWorldScale(new THREE.Vector3()).x;
  knife.scale.setScalar(1 / ws);
  // empunhada como punhal: lâmina prolonga o antebraço (lê bem na preparação e na estocada), levemente inclinada para cima
  const axis = fingers.clone().multiplyScalar(0.8).addScaledVector(fwd, 0.6).normalize();
  knife.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  knife.position.copy(fingers).multiplyScalar(0.115 / ws).addScaledVector(fwd, 0.01 / ws);
  hand.add(knife);
  pose?.(false);
  return knife;
}
