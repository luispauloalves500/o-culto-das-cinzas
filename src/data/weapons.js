// Armas. Tempos em segundos; active/lungeAt/cancel/comboAt em fração da duração do golpe.
export const WEAPONS = {
  machado: {
    id: 'machado',
    name: 'Machado de incêndio',
    short: 'golpe rápido (combo) / forte',
    sharpenable: true,
    durability: 90, // golpes até ficar quebrado (forte gasta 2, bater na parede gasta 3)
    tipRadius: 0.24,
    midRadius: 0.14,
    attacks: {
      light1: { anim: 'light1', dur: 0.62, active: [0.36, 0.56], dmg: 24, poise: 26, stamina: 14, lunge: 1.6, lungeAt: [0.28, 0.5], next: 'light2', comboAt: 0.66, cancel: 0.6 },
      light2: { anim: 'light2', dur: 0.66, active: [0.33, 0.55], dmg: 26, poise: 30, stamina: 14, lunge: 1.6, lungeAt: [0.25, 0.5], next: 'light3', comboAt: 0.7, cancel: 0.6 },
      // 3º golpe do combo (finalizador, 3º corte do Triple_Combo_Attack do GLB): mais lento, mais dano e poise; reinicia no light1
      light3: { anim: 'light3', dur: 0.8, active: [0.38, 0.58], dmg: 32, poise: 44, stamina: 16, lunge: 1.9, lungeAt: [0.26, 0.52], next: 'light1', comboAt: 0.86, cancel: 0.68 },
      heavy: { anim: 'heavy', dur: 1.05, active: [0.47, 0.62], dmg: 58, poise: 80, stamina: 28, lunge: 2.4, lungeAt: [0.42, 0.6], next: null, comboAt: 2, cancel: 0.8 },
    },
  },
  // Martelo industrial: lento, caro em fôlego, quebra a guarda (poise) e derruba alvenaria fraca no golpe forte.
  martelo: {
    id: 'martelo',
    name: 'Martelo industrial',
    short: 'lento e pesado · golpe forte derruba alvenaria rachada',
    breaksWalls: true,
    durability: 120,
    tipRadius: 0.28,
    midRadius: 0.15,
    attacks: {
      light1: { anim: 'light1', dur: 0.86, active: [0.4, 0.58], dmg: 34, poise: 50, stamina: 20, lunge: 1.3, lungeAt: [0.3, 0.5], next: 'light2', comboAt: 0.8, cancel: 0.7 },
      light2: { anim: 'light2', dur: 0.9, active: [0.38, 0.57], dmg: 36, poise: 55, stamina: 20, lunge: 1.3, lungeAt: [0.28, 0.5], next: null, comboAt: 2, cancel: 0.7 },
      heavy: { anim: 'heavy', dur: 1.4, active: [0.5, 0.63], dmg: 88, poise: 140, stamina: 36, lunge: 2.0, lungeAt: [0.44, 0.6], next: null, comboAt: 2, cancel: 0.85 },
    },
  },
  // Facão: rápido e barato em fôlego, pouco impacto na guarda; aceita a pedra de afiar.
  facao: {
    id: 'facao',
    name: 'Facão',
    short: 'rápido e leve · combo de três cortes · pouco impacto na guarda',
    sharpenable: true,
    durability: 70,
    tipRadius: 0.2,
    midRadius: 0.12,
    attacks: {
      light1: { anim: 'light1', dur: 0.56, active: [0.32, 0.56], dmg: 17, poise: 14, stamina: 9, lunge: 1.8, lungeAt: [0.22, 0.48], next: 'light2', comboAt: 0.6, cancel: 0.5 },
      light2: { anim: 'light2', dur: 0.56, active: [0.3, 0.55], dmg: 18, poise: 16, stamina: 9, lunge: 1.8, lungeAt: [0.2, 0.48], next: 'light1', comboAt: 0.62, cancel: 0.5 },
      heavy: { anim: 'heavy', dur: 0.86, active: [0.46, 0.62], dmg: 40, poise: 45, stamina: 20, lunge: 2.6, lungeAt: [0.4, 0.6], next: null, comboAt: 2, cancel: 0.75 },
    },
  },
  // Lança improvisada: haste de suporte de soro com um bisturi de parto amarrado na ponta. Estocada longa e reta:
  // alcança antes de ser alcançado, mas quase não corta para os lados e pesa pouco na guarda.
  lanca: {
    id: 'lanca',
    name: 'Lança improvisada',
    short: 'estocada longa (alcance) · golpe forte atravessa · fraca dos lados',
    sharpenable: true,
    durability: 55, // o bisturi amarrado se solta rápido
    reach: 1.22, // comprimento até a ponta (o machado alcança ~0.6)
    tipRadius: 0.17,
    midRadius: 0.09,
    attacks: {
      light1: { anim: 'thrust', dur: 0.68, active: [0.34, 0.56], dmg: 21, poise: 22, stamina: 11, lunge: 1.1, lungeAt: [0.28, 0.5], next: 'light1', comboAt: 0.72, cancel: 0.62 },
      heavy: { anim: 'thrustHeavy', dur: 1.0, active: [0.44, 0.62], dmg: 46, poise: 55, stamina: 24, lunge: 2.2, lungeAt: [0.4, 0.6], next: null, comboAt: 2, cancel: 0.8 },
    },
  },
  // Revólver .38: botão direito dispara (mira automática no alvo à frente), munição escassa e barulho enorme.
  // Q segura a mira manual (retícula, sem mira automática, tiro na cabeça vale mais). Tambor de 6: T recarrega.
  // O botão esquerdo dá uma coronhada fraca, que não gasta bala. Não sofre desgaste.
  revolver: {
    id: 'revolver',
    name: 'Revólver .38',
    short: 'botão direito: atirar (munição escassa, barulho alto) · esquerdo: coronhada',
    ranged: true,
    ammo: 'municao_38',
    cylinder: 6,
    reloadBase: 0.45, reloadPer: 0.32, // segundos: abrir o tambor + cada cartucho
    tipRadius: 0.16,
    midRadius: 0.1,
    shot: { dmg: 70, poise: 120, range: 20, cone: 0.24, noise: 24 },
    attacks: {
      light1: { anim: 'light1', dur: 0.6, active: [0.36, 0.56], dmg: 9, poise: 18, stamina: 10, lunge: 1.2, lungeAt: [0.28, 0.5], next: null, comboAt: 2, cancel: 0.55 },
      heavy: { anim: 'shoot', dur: 0.72, active: [0.16, 0.2], dmg: 70, poise: 120, stamina: 4, lunge: 0, lungeAt: [0, 0], next: null, comboAt: 2, cancel: 0.45, shoot: true },
    },
  },
};

/** estado de conservação (0..1) → multiplicador de dano. Uma arma quebrada não some: ainda bate, mas fraco. */
export function wearMult(cond) {
  if (cond == null || cond >= 0.5) return 1;
  if (cond >= 0.25) return 0.85;
  if (cond > 0) return 0.7;
  return 0.5;
}
export function conditionLabel(cond) {
  if (cond >= 0.75) return 'boa';
  if (cond >= 0.5) return 'usada';
  if (cond >= 0.25) return 'gasta';
  if (cond > 0) return 'lascada';
  return 'quebrada';
}
/** desgaste de um golpe: forte gasta o dobro, lâmina afiada gasta 25% menos */
export function wearCost(weapon, kind, sharpened, wall = false) {
  if (!weapon?.durability) return 0;
  const base = wall ? 3 : kind === 'heavy' ? 2 : 1;
  return base * (sharpened && weapon.sharpenable ? 0.75 : 1);
}

/** dano final de um golpe (a pedra de afiar só vale para lâminas; o desgaste reduz) */
export function weaponDamage(weapon, def, sharpened, cond = 1) {
  return Math.round(def.dmg * (sharpened && weapon.sharpenable ? 1.3 : 1) * wearMult(weapon.durability ? cond : 1));
}
