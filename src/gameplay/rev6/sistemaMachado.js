/**
 * Adaptado de Machado_REV6/sistema_machado.mjs (coleta, inventário e troca dos clipes do personagem REV6).
 * Diferenças para o jogo: `empunhar(bool)` usa as variantes `_Machado` (dedos fechados) também com outras
 * armas na mão; `tentarColetar` aceita a posição do jogador (o personagem pode ainda estar carregando);
 * `restaurar` aceita o save antigo (hasAxe/weapons) via `possuiMachado` já migrado.
 */
export function criarSistemaMachado({ THREE, personagem, mixer, clipes, config }) {
  const arma = personagem.getObjectByName('Machado_Equipado');
  if (!arma) throw new Error('Use personagem_REV6_coleta_machado.glb.');
  const itemId = config.itemId;
  const porNome = new Map(clipes.map((clip) => [clip.name, clip]));
  const loops = new Set(config.loopClips);
  let possui = false, equipado = false, outraNaMao = false, atual = null, nomeBase = null;
  let opcoesAtuais = {};
  const acoesUsadas = new Set();
  // A escala zero também deixa a arma oculta em visualizadores sem este módulo.
  arma.scale.set(1, 1, 1);
  arma.visible = false;

  const variante = () => equipado || outraNaMao;
  function nomeDe(base) { return variante() ? (config.clipMap[base] ?? base) : base; }

  // Transições com pesos normalizados (soma sempre 1): o crossFadeTo do three.js, encadeado no meio de outro fade,
  // deixava a soma dos pesos < 1 por alguns quadros e o mixer completava com a pose de ligação (pisca de T-pose).
  const saindo = new Map(); // ação → peso atual (em fade-out)
  let taxa = Infinity;     // ganho de peso/s da ação atual

  function tocar(base, opcoes = {}) {
    const { fade = 0.15, repetir = loops.has(base), velocidade = 1 } = opcoes;
    const nome = nomeDe(base);
    const clip = porNome.get(nome);
    if (!clip) throw new Error(`Animação ausente: ${nome}`);
    const proxima = mixer.clipAction(clip);
    acoesUsadas.add(proxima);
    if (atual === proxima && atual.isRunning()) return proxima;
    const anterior = atual === proxima ? null : atual;
    const fase = anterior && nomeBase === base && anterior.getClip().duration > 0
      ? Math.min(1, anterior.time / anterior.getClip().duration) : 0;
    // voltando a um loop que ainda estava saindo: mantém tempo e peso (sem salto)
    const voltando = saindo.has(proxima) && repetir;
    const w0 = saindo.has(proxima) ? saindo.get(proxima) : proxima === atual ? proxima.getEffectiveWeight() : 0;
    saindo.delete(proxima);
    const t0 = proxima.time;
    proxima.reset();
    proxima.setLoop(repetir ? THREE.LoopRepeat : THREE.LoopOnce, repetir ? Infinity : 1);
    proxima.clampWhenFinished = !repetir;
    proxima.setEffectiveTimeScale(velocidade);
    proxima.time = voltando ? t0 : fase * clip.duration;
    proxima.play();
    if (anterior) saindo.set(anterior, anterior.getEffectiveWeight());
    atual = proxima;
    if (fade > 0 && saindo.size) {
      taxa = 1 / fade;
      proxima.setEffectiveWeight(w0);
      atualizar(0);
    } else {
      for (const a of saindo.keys()) a.stop();
      saindo.clear();
      proxima.setEffectiveWeight(1);
    }
    nomeBase = base;
    opcoesAtuais = { ...opcoes };
    return proxima;
  }

  /** avança os fades (chamar antes de mixer.update); a ação atual sobe, as que saem dividem o resto */
  function atualizar(dt) {
    const a = atual ?? null;
    if (!saindo.size) { if (a && a.getEffectiveWeight() !== 1) a.setEffectiveWeight(1); return; }
    const w = a ? Math.min(1, a.getEffectiveWeight() + dt * taxa) : 1;
    const resto = 1 - w;
    let soma = 0; for (const v of saindo.values()) soma += v;
    if (resto < 1e-3 || soma < 1e-6) {
      for (const x of saindo.keys()) x.stop();
      saindo.clear(); a?.setEffectiveWeight(1); return;
    }
    const k = resto / soma;
    for (const [x, v] of saindo) { const nv = v * k; saindo.set(x, nv); x.setEffectiveWeight(nv); }
    a?.setEffectiveWeight(w);
  }

  function trocarVariante(fn) {
    const antes = variante(); fn();
    if (antes !== variante() && nomeBase) tocar(nomeBase, opcoesAtuais);
  }

  function equipar(ativar = true) {
    if (ativar && !possui) return false;
    const novo = Boolean(ativar);
    if (novo === equipado) return true;
    trocarVariante(() => { equipado = novo; arma.visible = equipado; });
    return true;
  }
  /** outra arma (martelo, facão, lança, revólver) na mão: dedos fechados, machado oculto */
  function empunhar(ativar) { trocarVariante(() => { outraNaMao = Boolean(ativar); }); }

  function tentarColetar(objeto, distanciaMaxima = 1.5, jogadorPos = null) {
    if (possui || !objeto || objeto.userData?.coletado || !objeto.visible) return false;
    if (!Number.isFinite(distanciaMaxima) || distanciaMaxima < 0) return false;
    const marcador = objeto.getObjectByName('Machado_Coletavel');
    if (objeto.userData?.itemId !== itemId && !marcador) return false;
    const jp = jogadorPos ? jogadorPos.clone() : personagem.getWorldPosition(new THREE.Vector3());
    const itemPos = new THREE.Vector3();
    (marcador ?? objeto).getWorldPosition(itemPos);
    if (jp.distanceTo(itemPos) > distanciaMaxima) return false;
    possui = true;
    objeto.userData.coletado = true;
    objeto.visible = false;
    equipar(true);
    return true;
  }

  function serializar() { return { possuiMachado: possui, machadoEquipado: equipado }; }
  function restaurar(salvo) {
    possui = salvo?.possuiMachado === true;
    if (!possui) equipar(false);
    equipar(possui && salvo?.machadoEquipado === true);
  }
  function dispose() {
    for (const acao of acoesUsadas) acao.stop();
    arma.visible = false;
  }
  return {
    tocar, atualizar, equipar, empunhar, tentarColetar, serializar, restaurar, dispose, nomeDe,
    get possuiMachado() { return possui; },
    get equipado() { return equipado; },
    get atual() { return atual; },
    get nomeBase() { return nomeBase; },
    /** soma dos pesos das ações ativas (1 = sem mistura com a pose de ligação) */
    pesoTotal() { let s = atual ? atual.getEffectiveWeight() : 0; for (const v of saindo.values()) s += v; return s; },
  };
}
