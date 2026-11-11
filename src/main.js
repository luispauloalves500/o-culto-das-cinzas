// Ponto de entrada: estilos, criação do jogo, captura de erros e gancho de depuração para testes.
import './styles/main.css';
import { Game } from './core/Game.js';
import { prefetchWorld } from './scenes/worlds.js';
import { prefetchChapterAssets } from './assets/preload.js';

const bootT0 = performance.now();

function showFatal(msg) {
  const el = document.getElementById('fatal');
  document.getElementById('fatalMsg').textContent = msg;
  el.classList.remove('hidden');
}
window.addEventListener('error', (e) => showFatal(String(e.error?.stack || e.message)));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason?.stack || e.reason)));

try {
  const game = new Game(document.getElementById('game'));
  // gancho usado pelos testes automatizados (smoke) e para depuração no console
  window.__ocdc = game;
  window.__ocdcMenuMs = performance.now() - bootT0;
  // prefetch do Cap. 1 depois do menu aparecer, para não atrasar o networkidle do carregamento inicial
  setTimeout(() => { prefetchWorld(1); prefetchChapterAssets(1); }, 1200);
} catch (e) {
  showFatal('Não foi possível iniciar o WebGL / jogo:\n' + (e?.stack || e));
}
