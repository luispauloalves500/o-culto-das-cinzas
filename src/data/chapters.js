// Capítulos e objetivos (o objetivo exibido é o primeiro ainda não concluído).
export const CHAPTERS = [
  { id: 1, name: 'Despertar', place: 'Hospital São Dimas', playable: true },
  { id: 2, name: 'Fumaça', place: 'Bairro Operário', playable: false },
  { id: 3, name: 'A Confraria', place: 'Sede e arquivos subterrâneos', playable: false },
  { id: 4, name: 'Cidade Morta', place: 'Centro antigo de Véspera', playable: false },
  { id: 5, name: 'Águas Negras', place: 'Fábrica de bombeamento', playable: false },
  { id: 6, name: 'O Acervo', place: 'Museu de Ciências Proibidas', playable: false },
  { id: 7, name: 'Sob a Pedra', place: 'Catacumbas e metrô antigo', playable: false },
  { id: 8, name: 'A Última Chama', place: 'Torre de transmissão', playable: false },
];

export const OBJECTIVES = [
  { done: 'hasAxe', text: 'Procure algo para se defender na enfermaria.' },
  { done: 'leftWard', text: 'Saia da enfermaria.' },
  { done: 'hasFuse', text: 'A energia caiu. Encontre peças para religar o gerador (depósito / sala de máquinas).' },
  { done: 'fuseIn', text: 'Instale o fusível no painel da sala de máquinas.' },
  { done: 'breakersOk', text: 'Acione os disjuntores na sequência correta (veja o aviso na parede).' },
  { done: 'power', text: 'Puxe a alavanca principal.' },
  { done: 'reachedLower', text: 'Use o elevador no fim do corredor.' },
  { done: 'enteredSurgery', text: 'Encontre uma saída pela ala cirúrgica (subsolo).' },
  { done: 'bossDead', text: 'Sobreviva ao Cirurgião. Procure o ponto fraco.' },
  { done: 'gateOpen', text: 'Abra o portão de serviço.' },
  { done: 'chapterDone', text: 'Registre seu progresso e saia pelo portão do pátio.' },
];

// Objetivos opcionais (exploração): aparecem numa segunda linha do HUD e nas Anotações do inventário.
// when: flag que revela a pista · done: flag que a conclui. Não bloqueiam o fluxo principal.
export const SIDE_OBJECTIVES = [
  { when: 'power', done: 'enteredEast', text: 'A energia liberou a trava da Ala Leste (corredor, porta da quarentena).' },
  { when: 'enteredEast', done: 'hasMorgueKey', text: 'Procure a chave do necrotério no posto de enfermagem da Ala Leste.' },
  { when: 'hasMorgueKey', done: 'enteredMorgue', text: 'Use a chave na porta do necrotério (hall do subsolo).' },
  { when: 'readEastChart', done: 'coldRoomOpen', text: '"A gaveta 13 não tem fundo." — necrotério.' },
];
