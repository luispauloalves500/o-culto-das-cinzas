// Carregamento preguiçoso dos mundos por capítulo (pt63u). O menu não puxa a geometria
// dos oito capítulos; cada um entra com import() dinâmico e fica em cache.
export const WORLD_LOADERS = {
  1: () => import('./hospital/world.js'),
  2: () => import('./bairro/world.js'),
  3: () => import('./sede/world.js'),
  4: () => import('./cidade/world.js'),
  5: () => import('./aguas/world.js'),
  6: () => import('./acervo/world.js'),
  7: () => import('./pedra/world.js'),
  8: () => import('./usina/world.js'),
};

const cache = {};

export function loadWorld(ch) {
  const n = +ch || 1;
  const loader = WORLD_LOADERS[n];
  if (!loader) return Promise.reject(new Error('capítulo desconhecido: ' + ch));
  if (!cache[n]) cache[n] = loader().then((m) => m.world);
  return cache[n];
}

export function prefetchWorld(ch) {
  const n = +ch;
  if (!WORLD_LOADERS[n] || cache[n]) return;
  loadWorld(n).catch(() => {});
}

export function isWorldCached(ch) { return !!cache[+ch]; }

export function worldLoaderCount() { return Object.keys(WORLD_LOADERS).length; }
