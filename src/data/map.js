// Planta do Hospital São Dimas para o mapa (tecla M). Dados puros (sem three/DOM) — testáveis em Node.
// rect = [minX, minZ, maxX, maxZ] em metros; floor: 'lo' (subsolo, y −5), 'up' (térreo, y 0), 'up2' (2º andar, y 4).
export const FLOORS = [
  { id: 'lo', name: 'Subsolo' },
  { id: 'up', name: 'Térreo' },
  { id: 'up2', name: '2º andar' },
];

export const ROOMS = [
  // térreo
  { id: 'ward', floor: 'up', name: 'Enfermaria', rect: [0, -3, 12, 10] },
  { id: 'landing', floor: 'up', name: 'Escada', rect: [12, -3, 16, 10] },
  { id: 'corridor', floor: 'up', name: 'Corredor', rect: [0, 10, 40, 14] },
  { id: 'storage', floor: 'up', name: 'Depósito', rect: [14, 14, 24, 22] },
  { id: 'machines', floor: 'up', name: 'Sala de máquinas', rect: [28, 14, 38, 24] },
  { id: 'eastWard', floor: 'up', name: 'Ala Leste', rect: [16, -3, 30, 10] },
  { id: 'isolation', floor: 'up', name: 'Isolamento', rect: [30, -3, 38, 10] },
  { id: 'chapel', floor: 'up', name: 'Capela', rect: [0, 14, 12, 24] },
  { id: 'serviceStair', floor: 'up', name: 'Escada de serviço', rect: [24, 14, 28, 22.4] },
  { id: 'elevUp', floor: 'up', name: 'Elevador', rect: [40, 10, 44, 14] },
  // subsolo
  { id: 'stairLo', floor: 'lo', name: 'Escada', rect: [12, 0, 16, 10] },
  { id: 'lowerHall', floor: 'lo', name: 'Hall do subsolo', rect: [12, 10, 40, 14] },
  { id: 'morgue', floor: 'lo', name: 'Necrotério', rect: [16, 0, 26, 10] },
  { id: 'coldRoom', floor: 'lo', name: 'Câmara fria', rect: [19, -3, 24, 0], secret: true },
  { id: 'archive', floor: 'lo', name: 'Arquivo', rect: [26, 2, 36, 10] },
  { id: 'laundry', floor: 'lo', name: 'Lavanderia', rect: [2, 2, 12, 14] },
  { id: 'furnace', floor: 'lo', name: 'Incinerador', rect: [0, 14, 10, 20] },
  { id: 'surgeryCorridor', floor: 'lo', name: 'Corredor cirúrgico', rect: [20, 14, 24, 20] },
  { id: 'arena', floor: 'lo', name: 'Sala de cirurgia', rect: [10, 20, 36, 36] },
  { id: 'yard', floor: 'lo', name: 'Pátio de serviço', rect: [36, 24, 46, 32] },
  { id: 'elevLo', floor: 'lo', name: 'Elevador', rect: [40, 10, 44, 14] },
  // 2º andar (administração)
  { id: 'adminCorridor', floor: 'up2', name: 'Corredor da administração', rect: [12, 22, 38, 26] },
  { id: 'secretaria', floor: 'up2', name: 'Secretaria', rect: [14, 14, 24, 22] },
  { id: 'diretoria', floor: 'up2', name: 'Diretoria', rect: [28, 14, 38, 22] },
  { id: 'serviceStairTop', floor: 'up2', name: 'Escada de serviço', rect: [24, 14, 28, 22.4] },
  { id: 'coro', floor: 'up2', name: 'Coro da capela', rect: [8.6, 21.6, 12, 24] },
];

// pontos de interesse desenhados no mapa quando o cômodo é conhecido
export const MAP_MARKS = [
  { kind: 'save', floor: 'up', x: 7.1, z: -2.3, room: 'ward' },
  { kind: 'save', floor: 'up', x: 34.6, z: -2.4, room: 'isolation' },
  { kind: 'save', floor: 'lo', x: 38.6, z: 25.2, room: 'yard' },
  { kind: 'save', floor: 'up2', x: 36.6, z: 15.2, room: 'diretoria' },
  { kind: 'stairs', floor: 'up', x: 14, z: 5, room: 'landing' },
  { kind: 'stairs', floor: 'lo', x: 14, z: 5, room: 'stairLo' },
  { kind: 'stairs', floor: 'up', x: 26, z: 18.5, room: 'serviceStair' },
  { kind: 'stairs', floor: 'up2', x: 26, z: 18.5, room: 'serviceStairTop' },
  { kind: 'stairs', floor: 'up', x: 11, z: 18.5, room: 'chapel' },
  { kind: 'fire', floor: 'lo', x: 1.6, z: 17, room: 'furnace' },
];

/** andar a partir da altura dos pés */
export function floorOf(y) { return y < -2.5 ? 'lo' : y < 3.0 ? 'up' : 'up2'; }

/** cômodo em que um ponto está (o primeiro que contém, com prioridade para cômodos menores) */
export function roomAt(p) {
  const f = floorOf(p.y);
  let best = null, area = Infinity;
  for (const r of ROOMS) {
    if (r.floor !== f) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) {
      const a = (x1 - x0) * (z1 - z0);
      if (a < area) { area = a; best = r; }
    }
  }
  return best;
}

/** cômodos visíveis no mapa: visitados, ou (com a planta) todos os não secretos */
export function knownRooms(flags, floor) {
  const plan = !!flags.hasMapPlan;
  return ROOMS.filter((r) => r.floor === floor && (flags['seen_' + r.id] || (plan && !r.secret)))
    .map((r) => ({ ...r, visited: !!flags['seen_' + r.id] }));
}

export function doorFloor(y) { return floorOf(y + 0.1); }
