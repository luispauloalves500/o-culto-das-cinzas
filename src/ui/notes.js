// Anotações compartilhadas entre o inventário e o mapa: pistas opcionais ativas + portas trancadas já tentadas.
export function lockedNotes(game) {
  const out = [];
  for (const id in game.level?.doors || {}) {
    const d = game.level.doors[id];
    if (d.locked && game.quest.has('note_' + id)) out.push({ id, door: d, text: `${d.label[0].toUpperCase() + d.label.slice(1)}: ${d.lockMsg}` });
  }
  return out;
}
export function collectNotes(game) {
  return [...game.quest.side(), ...lockedNotes(game).map((n) => n.text)];
}
