// Ponto de entrada: estilos, criação do jogo, captura de erros e gancho de depuração para testes.
import './styles/main.css';
import { Game } from './core/Game.js';

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
} catch (e) {
  showFatal('Não foi possível iniciar o WebGL / jogo:\n' + (e?.stack || e));
}
