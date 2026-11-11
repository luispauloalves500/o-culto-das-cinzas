import { CidadeLevel, CIDADE_CHECKPOINTS, CIDADE_FOG } from './CidadeLevel.js';
import { CidadeScript } from './CidadeScript.js';
export const world = {
  Level: CidadeLevel, Script: CidadeScript, checkpoints: CIDADE_CHECKPOINTS,
  start: 'c4_drain', fog: CIDADE_FOG,
};
