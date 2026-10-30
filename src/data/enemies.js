// Arquétipos de inimigos do Capítulo 1. Tempos de ataque em segundos.
export const ENEMIES = {
  interno: {
    name: 'Interno',
    hp: 70, poise: 35, radius: 0.38, height: 1.7, scale: 1.0, hunch: 0.45,
    walk: 0.9, chase: 2.0, turn: 4,
    sight: 11, fov: 70, hearing: 1.0,
    attackTokens: 1,
    attacks: [
      { id: 'swipe', range: 1.55, windup: 0.6, active: 0.16, recover: 0.75, dmg: 14, knock: 2.5, weight: 2 },
      { id: 'grab', range: 1.25, windup: 0.7, active: 0.2, recover: 1.1, dmg: 0, grab: true, grabDmg: 6, weight: 1 },
    ],
    mats: 'interno',
    groanPitch: 1.0,
  },
  enfermeiro: {
    name: 'Enfermeiro Corrompido',
    hp: 95, poise: 50, radius: 0.36, height: 1.95, scale: 1.12, hunch: 0.15,
    walk: 1.3, chase: 3.0, turn: 6,
    sight: 13, fov: 75, hearing: 1.2,
    attackTokens: 1,
    attacks: [
      { id: 'lunge', minRange: 2.2, range: 4.6, windup: 0.6, active: 0.38, recover: 0.9, dmg: 20, knock: 4, lunge: 7.5, weight: 1 },
      { id: 'stab', range: 1.5, windup: 0.32, active: 0.12, recover: 0.45, dmg: 10, knock: 1.5, combo: 2, weight: 2 },
    ],
    mats: 'enfermeiro',
    groanPitch: 1.6,
  },
  rastejador: {
    name: 'Rastejador',
    // paciente amputado que se arrasta: baixo demais para golpes laterais, ouvido apurado, visão curta
    crawler: true,
    hp: 60, poise: 30, radius: 0.42, height: 0.75, scale: 1.0, hunch: 0,
    walk: 0.7, chase: 2.5, turn: 3.2,
    sight: 6, fov: 60, hearing: 1.7,
    attackTokens: 1,
    attacks: [
      { id: 'claw', range: 1.5, windup: 0.55, active: 0.16, recover: 1.0, dmg: 12, knock: 1.5, weight: 2 },
      { id: 'ankle', range: 1.3, windup: 0.55, active: 0.22, recover: 1.2, dmg: 0, grab: true, grabDmg: 5, lunge: 2.5, weight: 1 },
    ],
    mats: 'interno',
    groanPitch: 0.75,
  },
};
