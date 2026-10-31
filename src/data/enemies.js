// Arquétipos de inimigos (Capítulo 1 e Capítulo 2). Tempos de ataque em segundos.
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
  // Capítulo 2 — Bairro Operário: operário encapuzado com um gancho de carga. Enxerga pouco na fumaça,
  // mas ouve muito: corrida, golpes, portas e tiros o atraem de longe (e ele vem investigar).
  cacador: {
    name: 'Caçador',
    hp: 85, poise: 45, radius: 0.38, height: 1.82, scale: 1.05, hunch: 0.3,
    walk: 1.15, chase: 3.1, turn: 5,
    sight: 8, fov: 65, hearing: 2.2,
    attackTokens: 1,
    attacks: [
      { id: 'swipe', range: 1.7, windup: 0.55, active: 0.16, recover: 0.8, dmg: 16, knock: 2.6, weight: 2 },
      { id: 'lunge', minRange: 2.0, range: 4.2, windup: 0.7, active: 0.34, recover: 1.0, dmg: 18, knock: 3.5, lunge: 6.5, weight: 1 },
    ],
    mats: 'cacador',
    groanPitch: 0.85,
  },
  // Capítulo 2 — carvoeiro: brutamontes lento da carvoaria, pá de coque nas mãos. Aguenta muito, golpeia pesado.
  carvoeiro: {
    name: 'Carvoeiro',
    hp: 150, poise: 85, radius: 0.46, height: 1.95, scale: 1.16, hunch: 0.38,
    walk: 0.9, chase: 2.3, turn: 3.6,
    sight: 7, fov: 70, hearing: 1.8,
    attackTokens: 1,
    attacks: [
      { id: 'shovel', range: 1.95, windup: 0.95, active: 0.2, recover: 1.1, dmg: 26, knock: 4.5, weight: 2 },
      { id: 'sweep', range: 1.6, windup: 0.7, active: 0.24, recover: 1.3, dmg: 18, knock: 5.5, weight: 1 },
    ],
    mats: 'carvoeiro',
    groanPitch: 0.6,
  },
  // Capítulo 3 — Sede da Confraria: acólito de túnica e véu. Turíbulo de latão numa corrente (golpe largo)
  // e um punhal de cerimônia (estocada curta). Vê melhor que os caçadores nos salões iluminados a vela.
  acolito: {
    name: 'Acólito do Véu',
    hp: 95, poise: 50, radius: 0.38, height: 1.85, scale: 1.04, hunch: 0.12,
    walk: 1.0, chase: 2.9, turn: 5.2,
    sight: 11, fov: 80, hearing: 1.4,
    attackTokens: 1,
    attacks: [
      { id: 'swipe', range: 2.0, windup: 0.7, active: 0.2, recover: 0.9, dmg: 17, knock: 3.2, weight: 2 },
      { id: 'stab', range: 1.5, windup: 0.4, active: 0.12, recover: 0.6, dmg: 12, knock: 1.5, weight: 1 },
    ],
    mats: 'acolito',
    groanPitch: 1.1,
  },
  // Capítulo 4 — Cidade Morta: morador coberto de cinza que ficou "parado" às 3h07, como os relógios.
  // Lento e meio surdo enquanto anda; quando vê Elias, corre aos trancos e bate com uma barra de ferro.
  // Com o toque do sino do Relógio, todos os da praça acordam ao mesmo tempo.
  cinzento: {
    name: 'Cinzento',
    hp: 80, poise: 40, radius: 0.37, height: 1.75, scale: 1.0, hunch: 0.35,
    walk: 0.8, chase: 2.8, turn: 4.4,
    sight: 9, fov: 70, hearing: 1.3,
    attackTokens: 1,
    attacks: [
      { id: 'bar', range: 1.85, windup: 0.65, active: 0.18, recover: 0.85, dmg: 16, knock: 3, weight: 2 },
      { id: 'grab', range: 1.25, windup: 0.6, active: 0.2, recover: 1.1, dmg: 0, grab: true, grabDmg: 6, weight: 1 },
    ],
    mats: 'cinzento',
    groanPitch: 0.9,
  },
  // Capítulo 5 — Águas Negras: quem caiu nos canais e voltou. Forte perto da água (sai dela rápido, golpeia mais
  // pesado com o corpo encharcado), lento e pesado no seco. Espera submerso e emerge quando Elias passa.
  afogado: {
    name: 'Afogado',
    hp: 95, poise: 45, radius: 0.38, height: 1.8, scale: 1.02, hunch: 0.42,
    walk: 0.75, chase: 2.6, turn: 4.0,
    sight: 8, fov: 75, hearing: 1.5,
    attackTokens: 1,
    attacks: [
      { id: 'claw', range: 1.7, windup: 0.6, active: 0.2, recover: 0.8, dmg: 15, knock: 3, weight: 2 },
      { id: 'grab', range: 1.25, windup: 0.55, active: 0.2, recover: 1.1, dmg: 0, grab: true, grabDmg: 7, weight: 1 },
    ],
    mats: 'afogado',
    aquatic: true,
    // multiplicadores conforme o terreno (o nível informa via wetness(pos): 0 seco … 1 dentro d'água)
    drySpeed: 0.55, wetSpeed: 1.35, wetDmg: 1.3,
    emergeTime: 1.1,
    groanPitch: 0.6,
  },
  // Capítulo 6 — O Acervo: peça humana embalsamada e envernizada, exposta de pé numa vitrine do Museu.
  // Fica imóvel como as outras peças até o vidro estalar (golpe, barulho de vitrine quebrando perto ou alguém
  // encostando no vidro). Leve e frágil, mas dá um bote rápido; ouve bem — o museu é silencioso.
  especime: {
    name: 'Espécime',
    hp: 70, poise: 30, radius: 0.36, height: 1.8, scale: 1.0, hunch: 0.05,
    walk: 0.8, chase: 3.1, turn: 6.0,
    sight: 9, fov: 70, hearing: 1.7,
    attackTokens: 1,
    attacks: [
      { id: 'claw', range: 1.6, windup: 0.5, active: 0.18, recover: 0.75, dmg: 13, knock: 2.4, weight: 2 },
      { id: 'lunge', range: 2.4, windup: 0.75, active: 0.22, recover: 1.1, dmg: 19, knock: 3.6, weight: 1 },
    ],
    mats: 'especime',
    exhibit: true,
    groanPitch: 1.35,
  },
};
