import { PedraLevel, PEDRA_CHECKPOINTS, PEDRA_FOG } from './PedraLevel.js';
import { PedraScript } from './PedraScript.js';
export const world = {
  Level: PedraLevel, Script: PedraScript, checkpoints: PEDRA_CHECKPOINTS,
  start: 'c7_ladder', fog: PEDRA_FOG,
};
