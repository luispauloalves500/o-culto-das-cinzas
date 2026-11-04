// src/models/Hornbeard.js — modelo do Enfermeiro (Hornbeard). Mantido por compatibilidade:
// o carregamento real (Draco local em ./draco/, caminho relativo à base do Vite, cache) está em EnemyModels.js.
import { loadEnemyModel } from './EnemyModels.js';
export async function loadHornbeard() { const g = await loadEnemyModel('enfermeiro'); return g.scene.clone(true); }
