// src/models/Hornbeard.js — Hornbeard estático (legado; desde pt52u o Enfermeiro usa enfermeiro.glb). Mantido por compatibilidade:
// o carregamento real (Draco local em ./draco/, caminho relativo à base do Vite, cache) está em EnemyModels.js.
import { loadEnemyModel } from './EnemyModels.js';
export async function loadHornbeard() { const g = await loadEnemyModel('hornbeard'); return g.scene.clone(true); }
