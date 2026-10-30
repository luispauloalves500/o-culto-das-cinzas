// Armas. Tempos em segundos; active/lungeAt/cancel/comboAt em fração da duração do golpe.
export const WEAPONS = {
  machado: {
    id: 'machado',
    name: 'Machado de incêndio',
    tipRadius: 0.24,
    midRadius: 0.14,
    attacks: {
      light1: { anim: 'light1', dur: 0.62, active: [0.36, 0.56], dmg: 24, poise: 26, stamina: 14, lunge: 1.6, lungeAt: [0.28, 0.5], next: 'light2', comboAt: 0.66, cancel: 0.6 },
      light2: { anim: 'light2', dur: 0.66, active: [0.33, 0.55], dmg: 26, poise: 30, stamina: 14, lunge: 1.6, lungeAt: [0.25, 0.5], next: 'light1', comboAt: 0.7, cancel: 0.6 },
      heavy: { anim: 'heavy', dur: 1.05, active: [0.47, 0.62], dmg: 58, poise: 80, stamina: 28, lunge: 2.4, lungeAt: [0.42, 0.6], next: null, comboAt: 2, cancel: 0.8 },
    },
  },
};
