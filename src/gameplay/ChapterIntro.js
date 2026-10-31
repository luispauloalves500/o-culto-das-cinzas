// Abertura cinematográfica de capítulo: cartela de título + 2 planos roteirizados a partir do ponto de chegada do Elias.
// Os planos são calculados no mundo real do capítulo (posição/orientação do spawn) e ficam seguros contra paredes:
// cada posição de câmera é recuada pelo raycast do CollisionWorld para não atravessar geometria.
// Toca só ao começar um capítulo (novo jogo ou passagem de capítulo), nunca ao carregar save; E/Esc pulam.
import { Cutscene } from './Cutscene.js';

export const CHAPTER_INTROS = {
  1: { title: 'Capítulo 1', sub: 'Hospital São Dimas', lines: ['Acordei numa enfermaria que cheira a cinza fria.', 'Alguém trancou as portas por dentro. E as luzes ainda tremem.'] },
  2: { title: 'Capítulo 2', sub: 'Fumaça', lines: ['O bairro inteiro respira fumaça. As chaminés não dormem.', 'Se o culto passou por aqui, deixou rastro nas cinzas.'] },
  3: { title: 'Capítulo 3', sub: 'A Confraria', lines: ['O Largo do Véu. A sede deles, à vista de todos.', 'Atrás daquelas portas, a Confraria escolhe quem queima.'] },
  4: { title: 'Capítulo 4', sub: 'Cidade Morta', lines: ['O centro antigo de Véspera. Ninguém responde aos sinos.', 'O Relógio marca a mesma hora desde a primeira cinza.'] },
  5: { title: 'Capítulo 5', sub: 'Águas Negras', lines: ['A água aqui embaixo é preta e morna.', 'Algo se move nos canais. Algo que já foi gente.'] },
  6: { title: 'Capítulo 6', sub: 'O Acervo', lines: ['O museu guarda o que a cidade quis esquecer.', 'Cada vitrine é um pedaço do ritual. Alguém anda colecionando.'] },
  7: { title: 'Capítulo 7', sub: 'Sob a Pedra', lines: ['Sob a cidade, os ossos foram empilhados em ordem.', 'A Linha Velha ainda leva a algum lugar. E lá no fundo, alguém vigia.'] },
  8: { title: 'Capítulo 8', sub: 'A Última Chama', lines: ['A Usina. A chaminé ainda cospe cinza.', 'Inês está na torre. Desta vez eu não chego tarde.'] },
};

const MARGIN = 0.35;
/** ponto a `dist` de `o` na direção `d` (normalizada), recuado antes da primeira parede */
export function safePoint(col, o, d, dist) {
  const len = Math.hypot(d.x, d.y, d.z) || 1;
  const n = { x: d.x / len, y: d.y / len, z: d.z / len };
  let t = dist;
  if (col?.raycast) { const hit = col.raycast(o, n, dist + MARGIN, (b) => b.tag !== 'prop-low'); if (hit < dist + MARGIN) t = Math.max(0.15, hit - MARGIN); }
  return { x: o.x + n.x * t, y: o.y + n.y * t, z: o.z + n.z * t, t };
}

/** monta os planos da abertura do capítulo n a partir do jogador (puro: só lê pos/yaw e o raycast) */
export function buildIntroShots(g, n) {
  const info = CHAPTER_INTROS[n]; if (!info) return null;
  const p = g.player.pos, yaw = g.player.yaw || 0;
  const f = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) }, r = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
  const head = { x: p.x, y: p.y + 1.6, z: p.z };
  const col = g.col;
  const ahead = safePoint(col, head, f, 7);
  // 1) cartela: plano alto e aberto, por cima do ombro, empurrando devagar para o que vem pela frente
  const high0 = safePoint(col, head, { x: -f.x * 1.2 + r.x * 0.6, y: 1.4, z: -f.z * 1.2 + r.z * 0.6 }, 2.6);
  const high1 = safePoint(col, head, { x: -f.x * 0.6 + r.x * 0.4, y: 1.0, z: -f.z * 0.6 + r.z * 0.4 }, 1.9);
  // 2) contraplano: de frente para o Elias, girando um pouco ao redor do rosto
  const face0 = safePoint(col, head, { x: f.x + r.x * 0.45, y: 0.05, z: f.z + r.z * 0.45 }, 2.1);
  const face1 = safePoint(col, head, { x: f.x - r.x * 0.35, y: 0.0, z: f.z - r.z * 0.35 }, 1.7);
  // 3) de volta para trás do ombro, terminando perto da câmera de jogo
  const back0 = safePoint(col, head, { x: -f.x + r.x * 0.5, y: 0.35, z: -f.z + r.z * 0.5 }, 1.9);
  const back1 = safePoint(col, head, { x: -f.x + r.x * 0.25, y: 0.2, z: -f.z + r.z * 0.25 }, 2.6);
  const xyz = (q) => ({ x: q.x, y: q.y, z: q.z });
  const lookFar = { x: ahead.x, y: p.y + 1.3, z: ahead.z };
  return [
    { dur: 3.4, from: xyz(high0), to: xyz(high1), look: { x: ahead.x, y: p.y + 0.9, z: ahead.z }, lookTo: lookFar, title: info.title, sub: info.sub, caption: '', sway: 0.015 },
    { dur: 3.8, cut: 'fade', from: xyz(face0), to: xyz(face1), look: { x: p.x, y: p.y + 1.55, z: p.z }, speaker: 'Elias', caption: info.lines[0] },
    { dur: 3.2, cut: 'fade', from: xyz(back0), to: xyz(back1), look: { x: ahead.x, y: p.y + 1.45, z: ahead.z }, lookTo: lookFar, speaker: 'Elias', caption: info.lines[1], fadeOut: false },
  ];
}

/** toca a abertura do capítulo (se ligada nas opções e se nenhuma outra cena já estiver tocando) */
export function playChapterIntro(g, n) {
  if (g.settings?.get?.('cinematics') === false || g.cutscene) return null;
  const shots = buildIntroShots(g, n); if (!shots) return null;
  const cs = new Cutscene(g, { id: 'intro_c' + n, shots, skipAfter: 0.6 });
  g.playCutscene(cs);
  return cs;
}
