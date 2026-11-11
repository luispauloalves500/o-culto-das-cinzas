import { SedeLevel, SEDE_CHECKPOINTS, SEDE_FOG } from './SedeLevel.js';
import { SedeScript } from './SedeScript.js';
export const world = {
  Level: SedeLevel, Script: SedeScript, checkpoints: SEDE_CHECKPOINTS,
  start: 'c3_tram', fog: SEDE_FOG,
};
