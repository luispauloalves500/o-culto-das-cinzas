import { BairroLevel, BAIRRO_CHECKPOINTS, BAIRRO_FOG } from './BairroLevel.js';
import { BairroScript } from './BairroScript.js';
export const world = {
  Level: BairroLevel, Script: BairroScript, checkpoints: BAIRRO_CHECKPOINTS,
  start: 'c2_gate', fog: BAIRRO_FOG,
};
