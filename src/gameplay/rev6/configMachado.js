// Cópia de config_machado.json do pacote Machado_REV6 (nomes/correspondência dos clipes do GLB).
export const CONFIG_MACHADO = {
  itemId: 'machado_enferrujado',
  axeLengthM: 0.8,
  startsEquipped: false,
  clipMap: {
    Running: 'Running_Machado',
    Walking: 'Walking_Machado',
    _01a17993_5941_740d_a212_2815e139919a: '_01a17993_5941_740d_a212_2815e139919a_Machado',
    _01a18db3_0c5f_71a4_b3b9_c9119504c268: '_01a18db3_0c5f_71a4_b3b9_c9119504c268_Machado',
    Attack: 'Attack_Machado',
    Basic_Jump: 'Basic_Jump_Machado',
    Double_Combo_Attack: 'Double_Combo_Attack_Machado',
    Run_and_Shoot: 'Run_and_Shoot_Machado',
    Triple_Combo_Attack: 'Triple_Combo_Attack_Machado',
    open_door_4: 'open_door_4_Machado',
    Elias_Idle: 'Elias_Idle_Machado', // gerado no carregamento (EliasModel.makeIdleClips)
  },
  loopClips: ['Elias_Idle', 'Running', 'Walking', '_01a17993_5941_740d_a212_2815e139919a', 'Run_and_Shoot'],
};

// Clipes inspecionados (quadro a quadro, posição da ponta do machado):
// _01a17993… = parado em guarda (braço direito à frente, loop) → idle
// _01a18db3… = gesto de "coçar a cabeça / olhar em volta" (uma vez) → ocioso prolongado
export const CLIP = {
  idle: 'Elias_Idle', // _01a17993… com o braço direito relaxado (ver EliasModel.makeIdleClips)
  idleSrc: '_01a17993_5941_740d_a212_2815e139919a',
  fidget: '_01a18db3_0c5f_71a4_b3b9_c9119504c268',
  walk: 'Walking',
  run: 'Running',
};
// velocidade (m/s) em que o clipe anda sem patinar (medida pelo pé de apoio)
export const CLIP_SPEED = { Walking: 1.25, Running: 3.05 };

/**
 * Golpe do jogo → trecho do clipe. seg = [início, fim] do trecho no clipe (s);
 * strike = [início, fim] do movimento rápido da lâmina no clipe (s), que é encaixado na janela "active" do golpe.
 * Medido pela velocidade da ponta do machado (pico 15,7 m/s no Attack em 1,07 s; 14,8 m/s no Double em 0,70 s).
 */
export const ATTACK_CLIPS = {
  light1: { clip: 'Double_Combo_Attack', seg: [0.1, 0.9], strike: [0.57, 0.77] },
  light2: { clip: 'Double_Combo_Attack', seg: [0.87, 1.5], strike: [1.03, 1.23] },
  heavy: { clip: 'Attack', seg: [0.15, 1.75], strike: [0.97, 1.13] },
};

/** t normalizado do golpe (0..1) → tempo do clipe, linear por partes: a janela active coincide com o golpe do clipe. */
export function attackClipTime(map, active, t) {
  const [c0, c1] = map.seg, [k0, k1] = map.strike, [a0, a1] = active;
  const u = Math.max(0, Math.min(1, t));
  if (u <= a0) return c0 + (k0 - c0) * (a0 > 0 ? u / a0 : 1);
  if (u <= a1) return k0 + (k1 - k0) * ((u - a0) / Math.max(1e-6, a1 - a0));
  return k1 + (c1 - k1) * ((u - a1) / Math.max(1e-6, 1 - a1));
}
