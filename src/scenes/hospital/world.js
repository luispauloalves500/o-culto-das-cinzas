import { HospitalLevel, CHECKPOINTS } from './HospitalLevel.js';
import { HospitalScript } from './HospitalScript.js';
export const world = {
  Level: HospitalLevel, Script: HospitalScript, checkpoints: CHECKPOINTS,
  start: 'ward_bed', fog: { fog: 0x050806, density: 0.075 },
};
