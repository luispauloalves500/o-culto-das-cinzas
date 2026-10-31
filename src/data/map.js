// Planta do Hospital São Dimas para o mapa (tecla M). Dados puros (sem three/DOM) — testáveis em Node.
// rect = [minX, minZ, maxX, maxZ] em metros; floor: 'lo' (subsolo, y −5), 'up' (térreo, y 0), 'up2' (2º andar, y 4), 'roof' (telhado, y 7.3).
export const FLOORS = [
  { id: 'lo', name: 'Subsolo' },
  { id: 'up', name: 'Térreo' },
  { id: 'up2', name: '2º andar' },
  { id: 'roof', name: '3º andar · Telhado' },
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
  // escada principal (térreo ↔ 2º andar)
  { id: 'mainStair', floor: 'up', name: 'Escada principal', rect: [38, 14, 41, 23.9] },
  { id: 'mainStairTop', floor: 'up2', name: 'Escada principal', rect: [38, 14, 41, 23.9] },
  // ala cirúrgica superior
  { id: 'wingCorridor', floor: 'up2', name: 'Corredor da ala cirúrgica', rect: [16.4, 26, 36, 29] },
  { id: 'sterilization', floor: 'up2', name: 'Esterilização', rect: [16.4, 29, 24, 38.4] },
  { id: 'surgery2', floor: 'up2', name: 'Sala de cirurgia 2', rect: [24, 29, 31, 36] },
  { id: 'recovery', floor: 'up2', name: 'Recuperação', rect: [31, 29, 36, 38.4] },
  { id: 'expurgo', floor: 'up2', name: 'Expurgo emparedado', rect: [24, 36, 31, 38.4], secret: true },
  { id: 'roofStair', floor: 'up2', name: 'Escada do telhado', rect: [13, 26, 16.4, 38.4] },
  // telhado
  { id: 'roofStairTop', floor: 'roof', name: 'Casa da escada', rect: [13, 26, 16.4, 38.4] },
  { id: 'roof', floor: 'roof', name: 'Telhado', rect: [16.4, 26, 36, 38.4] },
  { id: 'shed', floor: 'roof', name: 'Barracão do zelador', rect: [31, 34, 35.8, 38.2] },
  // 3º andar — ala pediátrica / maternidade (y 7.3, sobre a administração)
  { id: 'pedCorridor', floor: 'roof', name: 'Corredor da pediatria', rect: [12, 22, 41, 26] },
  { id: 'brinquedoteca', floor: 'roof', name: 'Brinquedoteca', rect: [16, 14, 23, 22] },
  { id: 'bercario', floor: 'roof', name: 'Berçário', rect: [23, 14, 31, 22] },
  { id: 'postoPed', floor: 'roof', name: 'Posto de enfermagem', rect: [31, 14, 36, 22] },
  { id: 'seguranca', floor: 'roof', name: 'Posto de segurança', rect: [36, 14, 41, 22] },
  { id: 'quarto7', floor: 'roof', name: 'Quarto 7', rect: [12, 14, 16, 22], secret: true },
  // escada de incêndio externa (3º andar ↔ patamar da escada principal no 2º)
  { id: 'fireEscape', floor: 'up2', name: 'Escada de incêndio', rect: [41, 14, 43.4, 23.9] },
  { id: 'fireEscapeTop', floor: 'roof', name: 'Escada de incêndio', rect: [41, 14, 43.4, 16.2] },
  // maternidade (2º andar, ala norte, sobre a Ala Leste) — entrada pela secretaria
  { id: 'matCorridor', floor: 'up2', name: 'Corredor da maternidade', rect: [14, 11, 38, 14] },
  { id: 'salaParto', floor: 'up2', name: 'Sala de parto', rect: [14, 2, 22, 11] },
  { id: 'alojamento', floor: 'up2', name: 'Alojamento conjunto', rect: [22, 2, 31, 11] },
  { id: 'postoObst', floor: 'up2', name: 'Posto obstétrico', rect: [31, 2, 38, 11] },
  // arquivo morto (subsolo, a leste do Arquivo) e a sala de batismo escondida
  { id: 'deadArchive', floor: 'lo', name: 'Arquivo morto', rect: [36, -3, 46, 10] },
  { id: 'batismo', floor: 'lo', name: 'Sala de batismo', rect: [38, -6.6, 44, -3], secret: true },
];

// Capítulo 2 — Bairro Operário (tudo no nível da rua, y 0; campo ch: 2)
export const ROOMS_C2 = [
  { id: 'c2_rua', floor: 'up', ch: 2, name: 'Rua dos Tecelões', rect: [1, 0, 38, 8] },
  { id: 'c2_beco', floor: 'up', ch: 2, name: 'Beco', rect: [9.5, 8, 12.5, 16] },
  { id: 'c2_deposito', floor: 'up', ch: 2, name: 'Depósito da tecelagem', rect: [18, 8, 40, 24] },
  { id: 'c2_escritorio', floor: 'up', ch: 2, name: 'Escritório do capataz', rect: [34, 18, 40, 24] },
  { id: 'c2_patio', floor: 'up', ch: 2, name: 'Pátio de carga', rect: [40, 8, 46, 30] },
  { id: 'c2_carvao', floor: 'up', ch: 2, name: 'Rua do Carvão', rect: [38, 30, 50, 60] },
  { id: 'c2_carvoaria', floor: 'up', ch: 2, name: 'Carvoaria São Brás', rect: [30, 38, 38, 48] },
  { id: 'c2_fabrica', floor: 'up', ch: 2, name: 'Fábrica de fumaça — salão', rect: [34, 60, 56, 78] },
  { id: 'c2_fornalhas', floor: 'up', ch: 2, name: 'Casa das fornalhas', rect: [34, 78, 56, 96] },
];
for (const r of ROOMS_C2) ROOMS.push(r);

// Capítulo 3 — Sede da Confraria: largo, portaria, salão e secretaria no térreo (y 0); arquivos no subsolo (y −4.5)
export const ROOMS_C3 = [
  { id: 'c3_largo', floor: 'up', ch: 3, name: 'Largo do Véu', rect: [0, 0, 24, 12] },
  { id: 'c3_portaria', floor: 'up', ch: 3, name: 'Portaria', rect: [24, 4, 30, 12] },
  { id: 'c3_salao', floor: 'up', ch: 3, name: 'Salão nobre', rect: [6, 12, 30, 30] },
  { id: 'c3_secretaria', floor: 'up', ch: 3, name: 'Secretaria', rect: [6, 30, 14, 38] },
  { id: 'c3_escada', floor: 'up', ch: 3, name: 'Escada do arquivo', rect: [22.6, 30, 25.4, 40] },
  { id: 'c3_escada_b', floor: 'lo', ch: 3, name: 'Escada do arquivo', rect: [22.6, 33, 25.4, 40] },
  { id: 'c3_arquivo', floor: 'lo', ch: 3, name: 'Arquivos subterrâneos', rect: [14, 40, 36, 58] },
  { id: 'c3_cripta_escada', floor: 'lo', ch: 3, name: 'Escada da cripta', rect: [24, 58, 26, 68] },
  { id: 'c3_cripta', floor: 'lo', ch: 3, name: 'Cripta do Sacristão', rect: [14, 68, 36, 90] },
  { id: 'c3_galeria', floor: 'lo', ch: 3, name: 'Galeria das catacumbas', rect: [36, 85, 40, 87] },
];
for (const r of ROOMS_C3) ROOMS.push(r);

// Capítulo 4 — Cidade Morta (primeira fatia), tudo no nível da rua
export const ROOMS_C4 = [
  { id: 'c4_beco', floor: 'up', ch: 4, name: 'Beco do bueiro', rect: [4, 0, 10, 10] },
  { id: 'c4_rua', floor: 'up', ch: 4, name: 'Rua do Comércio', rect: [4, 10, 10, 50] },
  { id: 'c4_farmacia', floor: 'up', ch: 4, name: 'Farmácia Central', rect: [-4, 18, 4, 28] },
  { id: 'c4_relojoaria', floor: 'up', ch: 4, name: 'Relojoaria Ponteiro', rect: [10, 30, 18, 40] },
  { id: 'c4_patio', floor: 'up', ch: 4, name: 'Pátio dos fundos', rect: [10, 40, 18, 50] },
  { id: 'c4_praca', floor: 'up', ch: 4, name: 'Praça do Relógio', rect: [0, 50, 30, 76] },
  { id: 'c4_torre', floor: 'up', ch: 4, name: 'Torre do Relógio', rect: [11, 76, 19, 84] },
  { id: 'c4_torre_escada', floor: 'up2', ch: 4, name: 'Torre do Relógio · escada', rect: [11, 76, 19, 84] },
  { id: 'c4_galeria', floor: 'roof', ch: 4, name: 'Torre do Relógio · galeria', rect: [11, 76, 19, 84] },
  { id: 'c4_maquinas', floor: 'roof', ch: 4, name: 'Casa das máquinas do Relógio', rect: [4, 84, 26, 100] },
  { id: 'c4_passagem', floor: 'up2', ch: 4, name: 'Passagem do Relógio', rect: [13.5, 96, 16.5, 103] },
];
for (const r of ROOMS_C4) ROOMS.push(r);

// pontos de interesse desenhados no mapa quando o cômodo é conhecido
// Capítulo 5 — Águas Negras: canal (y 0 nas margens, leito −1.4), casa de bombas; mezanino/passarela em y 4.5 ('up2')
export const ROOMS_C5 = [
  { id: 'c5_passagem', floor: 'up', ch: 5, name: 'Passagem do Relógio', rect: [13.6, -1, 16.4, 10] },
  { id: 'c5_canal', floor: 'up', ch: 5, name: 'Canal principal', rect: [0, 10, 40, 22] },
  { id: 'c5_galeria', floor: 'up', ch: 5, name: 'Galeria de serviço', rect: [20, 19, 40, 22] },
  { id: 'c5_comporteiro', floor: 'up', ch: 5, name: 'Casa do comporteiro', rect: [1, 22, 8, 28] },
  { id: 'c5_painel', floor: 'up', ch: 5, name: 'Sala do painel elétrico', rect: [24, 22, 30, 28] },
  { id: 'c5_ante', floor: 'up', ch: 5, name: 'Antecâmara das bombas', rect: [30, 22, 42, 28] },
  { id: 'c5_bombas', floor: 'up', ch: 5, name: 'Salão das bombas', rect: [26, 28, 46, 46] },
  { id: 'c5_reservatorio', floor: 'up', ch: 5, name: 'Reservatório', rect: [26, 46, 40, 60] },
  { id: 'c5_mezanino', floor: 'up2', ch: 5, name: 'Mezanino das bombas', rect: [26, 40, 46, 46] },
  { id: 'c5_passarela', floor: 'up2', ch: 5, name: 'Passarela do reservatório', rect: [26, 46, 40, 60] },
  { id: 'c5_turbinas', floor: 'up2', ch: 5, name: 'Antecâmara das turbinas', rect: [26, 60, 40, 68] },
  { id: 'c5_salao', floor: 'up2', ch: 5, name: 'Salão das turbinas', rect: [24, 68, 42, 90] },
  { id: 'c5_poco', floor: 'up2', ch: 5, name: 'Poço das turbinas', rect: [28, 72, 38, 84] },
  { id: 'c5_descarga', floor: 'up2', ch: 5, name: 'Galeria de descarga', rect: [31.6, 90, 34.4, 101] },
];
ROOMS.push(...ROOMS_C5);

// Capítulo 6 — O Acervo: Museu de Ciências Proibidas, um único piso (y 0)
export const ROOMS_C6 = [
  { id: 'c6_doca', floor: 'up', ch: 6, name: 'Doca de carga', rect: [8, 0, 22, 8] },
  { id: 'c6_atrio', floor: 'up', ch: 6, name: 'Átrio do Museu', rect: [4, 8, 26, 22] },
  { id: 'c6_salao', floor: 'up', ch: 6, name: 'Salão de Exposição', rect: [0, 22, 30, 44] },
  { id: 'c6_conservacao', floor: 'up', ch: 6, name: 'Ala de Conservação', rect: [30, 26, 44, 40] },
  { id: 'c6_deposito', floor: 'up', ch: 6, name: 'Depósito das remessas', rect: [30, 40, 44, 54] },
  { id: 'c6_galeria', floor: 'up', ch: 6, name: 'Galeria do Colecionador', rect: [28, 54, 46, 74] },
  { id: 'c6_reserva', floor: 'up', ch: 6, name: 'Reserva técnica', rect: [34, 74, 40, 84] },
];
ROOMS.push(...ROOMS_C6);

// Capítulo 7 — Sob a Pedra (primeira fatia): catacumbas e a estação velha, um único piso (trilhos 1 m abaixo)
export const ROOMS_C7 = [
  { id: 'c7_poco', floor: 'up', ch: 7, name: 'Poço da escada de serviço', rect: [14, 0, 22, 6] },
  { id: 'c7_galeria', floor: 'up', ch: 7, name: 'Galeria de pedra', rect: [16, 6, 20, 16] },
  { id: 'c7_ossuario', floor: 'up', ch: 7, name: 'Ossuário', rect: [12, 16, 24, 36] },
  { id: 'c7_cripta', floor: 'up', ch: 7, name: 'Cripta do coveiro-mor', rect: [4, 30, 12, 38] },
  { id: 'c7_tunel', floor: 'up', ch: 7, name: 'Túnel de serviço', rect: [16, 36, 20, 44] },
  { id: 'c7_plataforma', floor: 'up', ch: 7, name: 'Plataforma — Estação Sé Velha', rect: [4, 44, 44, 50] },
  { id: 'c7_trilhos', floor: 'up', ch: 7, name: 'Trilhos da Linha Velha', rect: [4, 50, 50, 55] },
  { id: 'c7_servico', floor: 'up', ch: 7, name: 'Corredor de serviço', rect: [22, 1.5, 39.5, 4.5] },
  { id: 'c7_servico_n', floor: 'up', ch: 7, name: 'Corredor de serviço (norte)', rect: [36.5, 4.5, 39.5, 44] },
  { id: 'c7_linha', floor: 'up', ch: 7, name: 'Linha Velha', rect: [50, 50, 78, 55.2] },
  { id: 'c7_refugio', floor: 'up', ch: 7, name: 'Refúgio de manutenção', rect: [66, 55.2, 67.6, 56.4] },
  { id: 'c7_cabine', floor: 'up', ch: 7, name: 'Cabine de Sinalização 4', rect: [60, 45, 66, 50] },
  { id: 'c7_sobapedra', floor: 'up', ch: 7, name: 'Estação Sob a Pedra', rect: [78, 42, 104, 64] },
  { id: 'c7_saida', floor: 'up', ch: 7, name: 'Escada de serviço (Usina)', rect: [97.4, 64, 100.6, 69.5] },
];
ROOMS.push(...ROOMS_C7);

// Capítulo 8 — A Última Chama (primeira fatia): Usina de Véspera — térreo (y 0) e galeria/esteira (y 4.4)
export const ROOMS_C8 = [
  { id: 'c8_patio', floor: 'up', ch: 8, name: 'Pátio do carvão', rect: [0, 0, 26, 24] },
  { id: 'c8_guarita', floor: 'up', ch: 8, name: 'Guarita', rect: [1, 8, 5, 12] },
  { id: 'c8_torre_carvao', floor: 'up', ch: 8, name: 'Torre de carvão', rect: [20, 12, 24, 16] },
  { id: 'c8_caldeiras', floor: 'up', ch: 8, name: 'Casa das Caldeiras', rect: [0, 24, 30, 52] },
  { id: 'c8_tubos', floor: 'up', ch: 8, name: 'Corredor de tubos', rect: [-14, 32, 0, 34.4] },
  { id: 'c8_oficina', floor: 'up', ch: 8, name: 'Oficina', rect: [-22, 28, -14, 38] },
  { id: 'c8_turbina', floor: 'up', ch: 8, name: 'Sala da Turbina', rect: [0, 52, 30, 68] },
  { id: 'c8_torre', floor: 'up', ch: 8, name: 'Base da torre de transmissão', rect: [8, 68, 18, 76] },
  { id: 'c8_esteira', floor: 'up2', ch: 8, name: 'Esteira de carvão', rect: [20, 12, 24, 24] },
  { id: 'c8_galeria', floor: 'up2', ch: 8, name: 'Galeria das caldeiras', rect: [20, 24, 30, 44] },
  { id: 'c8_patamar', floor: 'up2', ch: 8, name: 'Patamar da escada', rect: [20, 44, 26, 49] },
  { id: 'c8_passarela', floor: 'up2', ch: 8, name: 'Passarela da caldeira III', rect: [10, 47.6, 20, 49] },
];
ROOMS.push(...ROOMS_C8);

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
  { kind: 'save', floor: 'up2', x: 35.3, z: 37.6, room: 'recovery' },
  { kind: 'stairs', floor: 'up', x: 39.5, z: 18.5, room: 'mainStair' },
  { kind: 'stairs', floor: 'up2', x: 39.5, z: 18.5, room: 'mainStairTop' },
  { kind: 'stairs', floor: 'up2', x: 14.7, z: 32, room: 'roofStair' },
  { kind: 'stairs', floor: 'roof', x: 14.7, z: 32, room: 'roofStairTop' },
  { kind: 'save', floor: 'roof', x: 34.8, z: 15.0, room: 'postoPed' },
  { kind: 'stairs', floor: 'up2', x: 42.2, z: 19, room: 'fireEscape' },
  { kind: 'stairs', floor: 'roof', x: 42.2, z: 15.2, room: 'fireEscapeTop' },
  { kind: 'save', floor: 'up2', x: 36.6, z: 2.7, room: 'postoObst' },
  // Capítulo 2
  { kind: 'save', ch: 2, floor: 'up', x: 38.9, z: 23.2, room: 'c2_escritorio' },
  { kind: 'fire', ch: 2, floor: 'up', x: 37, z: 4, room: 'c2_rua' },
  { kind: 'save', ch: 2, floor: 'up', x: 35.7, z: 39.9, room: 'c2_carvoaria' },
  { kind: 'fire', ch: 2, floor: 'up', x: 48.2, z: 53, room: 'c2_carvao' },
  { kind: 'save', ch: 2, floor: 'up', x: 47.7, z: 77.3, room: 'c2_fabrica' },
  { kind: 'fire', ch: 2, floor: 'up', x: 45, z: 93, room: 'c2_fornalhas' },
  { kind: 'save', ch: 3, floor: 'up', x: 29.2, z: 10.6, room: 'c3_portaria' },
  { kind: 'stairs', ch: 3, floor: 'up', x: 24, z: 34, room: 'c3_escada' },
  { kind: 'stairs', ch: 3, floor: 'lo', x: 24, z: 38, room: 'c3_escada_b' },
  { kind: 'save', ch: 3, floor: 'lo', x: 15.8, z: 41.7, room: 'c3_arquivo' },
  { kind: 'stairs', ch: 3, floor: 'lo', x: 25, z: 61, room: 'c3_cripta_escada' },
  { kind: 'save', ch: 3, floor: 'lo', x: 25.55, z: 66.0, room: 'c3_cripta_escada' },
  { kind: 'save', ch: 4, floor: 'up', x: 17.3, z: 33.0, room: 'c4_relojoaria' },
  { kind: 'save', ch: 4, floor: 'up', x: 14, z: 51.2, room: 'c4_praca' },
  { kind: 'save', ch: 4, floor: 'up', x: 16.0, z: 81.15, room: 'c4_torre' },
  { kind: 'stairs', ch: 4, floor: 'up', x: 17.75, z: 78, room: 'c4_torre' },
  { kind: 'stairs', ch: 4, floor: 'roof', x: 17.75, z: 80, room: 'c4_galeria' },
  { kind: 'save', ch: 4, floor: 'roof', x: 5.0, z: 85.8, room: 'c4_maquinas' },
  { kind: 'save', ch: 5, floor: 'up', x: 40.6, z: 26.6, room: 'c5_ante' },
  { kind: 'stairs', ch: 5, floor: 'up', x: 44.5, z: 34, room: 'c5_bombas' },
  { kind: 'stairs', ch: 5, floor: 'up2', x: 44.5, z: 41, room: 'c5_mezanino' },
  { kind: 'save', ch: 5, floor: 'up2', x: 38.6, z: 66.6, room: 'c5_turbinas' },
  { kind: 'save', ch: 6, floor: 'up', x: 13.2, z: 14.6, room: 'c6_atrio' },
  { kind: 'save', ch: 6, floor: 'up', x: 30.8, z: 38.7, room: 'c6_conservacao' },
  { kind: 'save', ch: 7, floor: 'up', x: 20.6, z: 4.8, room: 'c7_poco' },
  { kind: 'save', ch: 7, floor: 'up', x: 8.5, z: 45.6, room: 'c7_plataforma' },
  { kind: 'save', ch: 7, floor: 'up', x: 65.3, z: 48.8, room: 'c7_cabine' },
  { kind: 'save', ch: 8, floor: 'up', x: 1.9, z: 10.2, room: 'c8_guarita' },
  { kind: 'save', ch: 8, floor: 'up', x: -16.6, z: 30.4, room: 'c8_oficina' },
  { kind: 'save', ch: 8, floor: 'up', x: 2.9, z: 63.6, room: 'c8_turbina' },
  { kind: 'stairs', ch: 8, floor: 'up', x: 22, z: 12.2, room: 'c8_torre_carvao' },
  { kind: 'stairs', ch: 8, floor: 'up2', x: 22, z: 13.2, room: 'c8_esteira' },
  { kind: 'fire', ch: 8, floor: 'up', x: 15, z: 38, room: 'c8_caldeiras' },
];

// capítulo cujo mapa está ativo (o Game define ao montar o mundo); cômodos sem `ch` são do Capítulo 1
let MAP_CHAPTER = 1;
export function setMapChapter(ch) { MAP_CHAPTER = [2, 3, 4, 5, 6, 7, 8].includes(ch) ? ch : 1; }
export function mapChapter() { return MAP_CHAPTER; }
const inChapter = (r) => (r.ch || 1) === MAP_CHAPTER;
/** andares com abas no mapa para o capítulo ativo */
export function chapterFloors() { return MAP_CHAPTER === 5 || MAP_CHAPTER === 8 ? FLOORS.filter((f) => f.id === 'up' || f.id === 'up2') : MAP_CHAPTER === 2 || MAP_CHAPTER === 6 || MAP_CHAPTER === 7 ? FLOORS.filter((f) => f.id === 'up') : MAP_CHAPTER === 4 ? FLOORS.filter((f) => f.id === 'up' || f.id === 'roof') : MAP_CHAPTER === 3 ? FLOORS.filter((f) => f.id === 'up' || f.id === 'lo') : FLOORS; }

/** andar a partir da altura dos pés */
export function floorOf(y) { return y < -2.5 ? 'lo' : y < 3.0 ? 'up' : y < 6.6 ? 'up2' : 'roof'; }

/** cômodo em que um ponto está (o primeiro que contém, com prioridade para cômodos menores) */
export function roomAt(p) {
  const f = floorOf(p.y);
  let best = null, area = Infinity;
  for (const r of ROOMS) {
    if (r.floor !== f || !inChapter(r)) continue;
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
  return ROOMS.filter((r) => r.floor === floor && inChapter(r) && (flags['seen_' + r.id] || (plan && !r.secret)))
    .map((r) => ({ ...r, visited: !!flags['seen_' + r.id] }));
}

export function doorFloor(y) { return floorOf(y + 0.1); }
