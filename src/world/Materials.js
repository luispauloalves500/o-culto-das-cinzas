// Materiais Lambert (baratos, visual PS2) a partir das texturas procedurais.
import * as THREE from 'three';
import { createTextures, installWorldDetail } from './Textures.js';

export function createMaterials() {
  const T = createTextures();
  const L = (o) => {
    const m = new THREE.MeshLambertMaterial(o);
    if (m.bumpMap) m.userData.baseBump = m.bumpScale ?? 0.042;
    return m;
  };
  const B = (map, extra = {}) => L({ map, bumpMap: map.bump, bumpScale: 0.042, ...extra });
  const M = {
    tile: B(T.tile),
    wall: B(T.wall),
    wallLower: B(T.wallLower),
    ceiling: B(T.ceiling),
    metal: B(T.metal),
    rust: B(T.rust),
    wood: B(T.wood),
    woodDark: B(T.wood, { color: 0x6a5040 }),
    door: B(T.wood, { color: 0x8a9a84 }),
    doorMetal: B(T.metal, { color: 0x8f9a8a }),
    sheet: L({ map: T.sheet }),
    concrete: B(T.concrete),
    paper: L({ map: T.paper, emissive: 0x2a2416 }),
    gown: L({ map: T.gown }),
    skin: L({ map: T.skin }),
    deadSkin: L({ map: T.deadSkin }),
    bandage: L({ map: T.bandage }),
    bandageDirty: L({ map: T.bandage, color: 0x9a8a70 }),
    leather: L({ map: T.leather }),
    leatherDark: L({ map: T.leather, color: 0x777777 }),
    apron: L({ map: T.leather, color: 0xb0a090 }),
    hazard: L({ map: T.hazard }),
    pantsGray: L({ color: 0x4a4c48 }),
    nurseCoat: L({ map: T.sheet, color: 0xb7b8a6 }),
    mask: L({ color: 0x2b2a26 }),
    axeMetal: B(T.metal, { color: 0xa02a1c }),
    axeEdge: L({ color: 0xc8c8c0, emissive: 0x202020 }),
    eyeGlow: new THREE.MeshBasicMaterial({ color: 0xffb060 }),
    eyeGlowGreen: new THREE.MeshBasicMaterial({ color: 0x9cff8a }),
    vial: L({ color: 0x3f8f3a, emissive: 0x4cff3a, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }),
    lampOn: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
    lampGreen: new THREE.MeshBasicMaterial({ color: 0x9fe8a0 }),
    lampRed: new THREE.MeshBasicMaterial({ color: 0xff4030 }),
    lampOff: L({ color: 0x3a3a34 }),
    glass: L({ color: 0x223028, transparent: true, opacity: 0.5 }),
    exitSign: new THREE.MeshBasicMaterial({ color: 0x3cff6a }),
    bloodDecal: new THREE.MeshLambertMaterial({ map: T.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    breakerOff: new THREE.MeshBasicMaterial({ color: 0x601010 }),
    morgueWall: B(T.morgueWall),
    morgueFloor: B(T.morgueFloor),
    steel: B(T.steel),
    steelDark: B(T.steel, { color: 0x7a827c }),
    curtain: L({ map: T.gown, color: 0xa8b0a0, side: THREE.DoubleSide }),
    brick: B(T.brick),
    chapelWall: B(T.chapelWall),
    stone: B(T.stone),
    ash: B(T.ash),
    coal: B(T.stone, { color: 0x34302c }),
    soot: B(T.brick, { color: 0x6a5a50 }),
    blueprint: L({ map: T.blueprint, emissive: 0x0a1424 }),
    gold: L({ color: 0xb08a3a, emissive: 0x2a1a06 }),
    pew: B(T.wood, { color: 0x7a5a44 }),
    altarCloth: L({ map: T.sheet, color: 0x8a2a20 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    fireCore: new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    ember: new THREE.MeshBasicMaterial({ color: 0xff5010 }),
    candle: L({ color: 0xd8ceb0, emissive: 0x1a140a }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffc060 }),
    moonGlass: new THREE.MeshBasicMaterial({ color: 0x24324a }),
    breakerOn: new THREE.MeshBasicMaterial({ color: 0x40ff60 }),
    // Capítulo 3 — Sede da Confraria: túnicas cor de sangue seco, véus negros, latão polido, veludo
    robe: L({ map: T.sheet, color: 0x5a1a1c }),
    veil: L({ map: T.sheet, color: 0x1c1a1a }),
    brass: B(T.metal, { color: 0xc8a050, emissive: 0x1a1004 }),
    velvet: L({ map: T.sheet, color: 0x4a1012 }),
    marble: B(T.stone, { color: 0xd8d2c4 }),
    // Capítulo 5 — Águas Negras: pele de afogado, farrapos, lodo; água preta do canal e espuma
    drownedSkin: L({ map: T.deadSkin, color: 0x7f9a88 }),
    drownedCloth: L({ map: T.gown, color: 0x3a4640 }),
    weed: L({ map: T.sheet, color: 0x2c3a20 }),
    drownedEye: new THREE.MeshBasicMaterial({ color: 0xb8e8c8 }),
    water: new THREE.MeshLambertMaterial({ color: 0x0e1a18, emissive: 0x020605, transparent: true, opacity: 0.86, depthWrite: false }),
    waterFoam: new THREE.MeshBasicMaterial({ color: 0x5a6e66, transparent: true, opacity: 0.35, depthWrite: false }),
    slime: B(T.stone, { color: 0x3c4a38 }),
    // Capítulo 6 — O Acervo: pele envernizada das peças, linho de embalsamar, olho de vidro, vidro de vitrine
    wax: L({ map: T.deadSkin, color: 0xc8b48a, emissive: 0x0e0a04 }),
    linen: L({ map: T.bandage, color: 0xb8ab8a }),
    glassEye: new THREE.MeshBasicMaterial({ color: 0xe8e0c0 }),
    showcase: new THREE.MeshLambertMaterial({ color: 0x9ab8b0, transparent: true, opacity: 0.22, depthWrite: false }),
    showcaseFog: new THREE.MeshLambertMaterial({ color: 0x8a8878, transparent: true, opacity: 0.85 }),
    shards: new THREE.MeshLambertMaterial({ color: 0xb8d0c8, transparent: true, opacity: 0.55, depthWrite: false }),
    parquet: B(T.wood, { color: 0x7a5434 }),
    museumWall: B(T.wall, { color: 0x8a6e5a }),
    // Capítulo 7 — Sob a Pedra: ossos do ossuário, cal da pele dos emparedados, hábito de estamenha, argamassa; pedra
    // de cantaria das galerias e o azulejo esmaltado da estação velha
    bone: B(T.stone, { color: 0xc8bc9a }),
    lime: L({ map: T.deadSkin, color: 0xd0ccbc }),
    habit: L({ map: T.gown, color: 0x4a3c2c }),
    mortar: B(T.stone, { color: 0x9a9488 }),
    cantaria: B(T.stone, { color: 0x6e665a }),
    stationTile: B(T.tile, { color: 0xb8b090 }),
    // Capítulo 8 — A Última Chama: ferro das caldeiras, mostrador de manômetro, vapor, couro chamuscado do foguista
    boilerIron: B(T.metal, { color: 0x5a4a40 }),
    gauge: new THREE.MeshBasicMaterial({ color: 0xd8ccb0 }),
    needle: new THREE.MeshBasicMaterial({ color: 0x8a1810 }),
    steam: new THREE.MeshBasicMaterial({ color: 0xd8dcd8, transparent: true, opacity: 0.45, depthWrite: false }),
    scorched: B(T.wood, { color: 0x3a2a20 }),
    belt: B(T.concrete, { color: 0x2a2624 }),
  };
  M.textures = T;
  installWorldDetail(M, T.detail);
  return M;
}
