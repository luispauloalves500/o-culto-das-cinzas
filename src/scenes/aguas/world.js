import { AguasLevel, AGUAS_CHECKPOINTS, AGUAS_FOG } from './AguasLevel.js';
import { AguasScript } from './AguasScript.js';
export const world = {
  Level: AguasLevel, Script: AguasScript, checkpoints: AGUAS_CHECKPOINTS,
  start: 'c5_passage', fog: AGUAS_FOG,
};
