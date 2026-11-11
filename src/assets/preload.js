// GLBs sob demanda por capítulo (pt63u). O áudio do jogo é procedural (Web Audio),
// sem arquivos para baixar; o contexto só inicia após um gesto do jogador.
import { preloadElias } from '../gameplay/EliasModel.js';
import { loadEnemyModel, enemyModelsEnabled } from '../models/EnemyModels.js';
import { preloadCabinets } from '../world/Cabinets.js';

/** modelos GLB usados de fato em cada capítulo (os demais inimigos são procedurais) */
export const CHAPTER_GLBS = {
  1: { cabinets: true, enemies: ['interno', 'enfermeiro'] },
  2: { cabinets: true, enemies: [] },
  3: { cabinets: true, enemies: [] },
  4: { cabinets: true, enemies: [] },
  5: { cabinets: true, enemies: [] },
  6: { cabinets: true, enemies: [] },
  7: { cabinets: true, enemies: [] },
  8: { cabinets: true, enemies: [] },
};

export function prefetchChapterAssets(ch) {
  if (typeof window === 'undefined') return Promise.resolve();
  const spec = CHAPTER_GLBS[+ch] || CHAPTER_GLBS[1];
  const jobs = [preloadElias()];
  if (spec.cabinets) jobs.push(Promise.resolve(preloadCabinets()));
  if (enemyModelsEnabled()) for (const k of spec.enemies) jobs.push(loadEnemyModel(k).catch(() => null));
  return Promise.all(jobs);
}

export function chapterAssetKinds(ch) {
  const spec = CHAPTER_GLBS[+ch] || CHAPTER_GLBS[1];
  return { cabinets: !!spec.cabinets, enemies: [...spec.enemies], audioFiles: [] };
}
