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
  { when: 'reachedLower', done: 'enteredLaundry', text: 'O hall do subsolo continua para oeste — lavanderia.' },
  { when: 'enteredLaundry', done: 'furnaceWasOff', text: 'O incinerador está aceso. Procure o registro de gás (parede oeste da lavanderia).' },
  { when: 'furnaceWasOff', done: 'hasStairKey', text: 'Com o gás fechado, recolha o que brilhava nas cinzas do incinerador.' },
  { when: 'hasStairKey', done: 'reachedAdmin', text: 'A chave de ferro abre a escada de serviço (corredor do térreo).' },
  { when: 'reachedAdmin', done: 'enteredChapel', text: 'No fim do corredor da administração, um coro dá para a capela.' },
  { when: 'readHymn', done: 'relicOpen', text: 'Velas da capela: Brás, Luzia, Roque e, por último, Dimas.' },
  { when: 'relicOpen', done: 'picked_relic', text: 'O relicário do altar está aberto.' },
  { when: 'enteredChapel', done: 'chapelShortcut', text: 'Destranque a porta da capela por dentro (atalho para o corredor).' },
  { when: 'reachedAdmin', done: 'enteredWing', text: 'Uma porta no corredor da administração leva à ala cirúrgica superior.' },
  { when: 'enteredWing', done: 'mainStairShortcut', text: 'A escada principal desce ao térreo — o ferrolho fica do lado de dentro, no pé da escada (térreo).' },
  { when: 'enteredWing', done: 'reachedRoof', text: 'No fim da ala, uma escada estreita sobe ao telhado.' },
  { when: 'reachedRoof', done: 'hasHammer', text: 'O barracão do zelador, no telhado, ainda está aberto.' },
  { when: 'readSurgLog', done: 'wallBroken', text: '"Emparedem o expurgo." Uma parede de tijolos novos na sala de cirurgia 2 — algo pesado a derrubaria.' },
  { when: 'wallBroken', done: 'picked_whetstone', text: 'O expurgo emparedado guarda o que o zelador Brandão deixou.' },
  { when: 'reachedRoof', done: 'enteredPeds', text: 'Ao norte do telhado, a porta da pediatria (3º andar) está aberta.' },
  { when: 'enteredPeds', done: 'picked_facao', text: 'No berçário, algo de metal brilha cravado num berço.' },
  { when: 'enteredPeds', done: 'securityOpen', text: 'A segurança do 3º andar está trancada — procure a chave no posto de enfermagem.' },
  { when: 'securityOpen', done: 'picked_revolver', text: 'O armário de armas da segurança foi arrombado. Sobrou alguma coisa na mesa do vigia?' },
  { when: 'readChildDrawing', done: 'lockBroken', text: '"O meu quarto é o 7" — atrás do teatrinho da brinquedoteca. Nenhuma lâmina corta a corrente.' },
  { when: 'picked_revolver', done: 'fireExitShortcut', text: 'A saída de incêndio da segurança desce até a escada principal — destrave a porta corta-fogo pelo lado de fora.' },
];
