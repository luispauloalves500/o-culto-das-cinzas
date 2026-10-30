// Capítulos e objetivos (o objetivo exibido é o primeiro ainda não concluído).
export const CHAPTERS = [
  { id: 1, name: 'Despertar', place: 'Hospital São Dimas', playable: true },
  { id: 2, name: 'Fumaça', place: 'Bairro Operário', playable: true },
  { id: 3, name: 'A Confraria', place: 'Sede e arquivos subterrâneos', playable: true },
  { id: 4, name: 'Cidade Morta', place: 'Centro antigo de Véspera', playable: true },
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
  { when: 'securityOpen', done: 'picked_key_mat', text: 'No quadro de chaves da segurança, uma etiqueta vermelha: "MATERNIDADE".' },
  { when: 'hasMatKey', done: 'maternityOpen', text: 'A maternidade fica atrás da porta trancada na parede norte da secretaria (2º andar).' },
  { when: 'enteredMaternity', done: 'picked_lanca', text: 'Na sala de parto, alguém amarrou um bisturi num suporte de soro.' },
  { when: 'enteredMaternity', done: 'hasDeadArchiveKey', text: 'O posto obstétrico guarda a chave do arquivo morto.' },
  { when: 'hasDeadArchiveKey', done: 'deadArchiveOpen', text: 'O arquivo morto fica no fundo do Arquivo do subsolo — porta de ferro na parede leste.' },
  { when: 'note_rolling', done: 'shelfMoved', text: 'O arquivo deslizante do arquivo morto só anda com uma manivela de encaixe quadrado.' },
  { when: 'shelfMoved', done: 'picked_pulseira', text: 'Atrás do arquivo deslizante, uma sala com cheiro de vela.' },
  { when: 'foundBatismo', done: 'rn0Revealed', text: '"O zero e o sete": a pia de batismo espera a pulseira do altar e alguma coisa do Quarto 7.' },
  { when: 'picked_revolver', done: 'fireExitShortcut', text: 'A saída de incêndio da segurança desce até a escada principal — destrave a porta corta-fogo pelo lado de fora.' },
];

// ---------- Capítulo 2 — Fumaça (Bairro Operário) · fatia jogável ----------
export const OBJECTIVES_C2 = [
  { done: 'c2_inDepot', text: 'A fumaça cobre a Rua dos Tecelões. Procure abrigo no depósito da tecelagem (lado norte da rua).' },
  { done: 'c2_hasCrank', text: 'A porta de carga do depósito está emperrada. Procure a manivela no escritório do capataz.' },
  { done: 'c2_shutterOpen', text: 'Use a manivela na porta de enrolar (parede leste do depósito).' },
  { done: 'c2_sliceDone', text: 'Atravesse o pátio de carga até o ponto do bonde.' },
  { done: 'c2_inCoal', text: 'O bonde não vem. Siga os trilhos pelo portão norte do pátio até a Rua do Carvão.' },
  { done: 'c2_hasFactoryKey', text: 'O portão da fábrica de fumaça está trancado. Procure a chave na Carvoaria São Brás (lado oeste da rua).' },
  { done: 'c2_factoryOpen', text: 'Abra o portão da fábrica no fim da Rua do Carvão.' },
  { done: 'c2_valves', text: 'A comporta da casa das fornalhas está travada pela pressão. Alivie as duas válvulas do salão.' },
  { done: 'c2_bossDead', text: 'Entre na casa das fornalhas e enfrente o que guarda a Garganta.' },
  { done: 'c2_chapterDone', text: 'Saia pela porta de serviço da casa das fornalhas.' },
  { done: 'c2_never', text: 'Capítulo 2 concluído. A Linha 4 espera na porta de serviço: siga com o passe para a Sede da Confraria (Capítulo 3).' },
];
export const SIDE_OBJECTIVES_C2 = [
  { when: 'c2_started', done: 'c2_readPaper', text: 'Um beco estreito entre as casas do lado norte — algo foi largado lá.' },
  { when: 'c2_readNote', done: 'c2_lured', text: '"Eles vão atrás do barulho." Uma porta batida ou um golpe na parede pode atrair um caçador para longe.' },
  { when: 'c2_inCarv', done: 'c2_readRoster', text: 'A escala do turno da noite estava pregada na carvoaria. Quem era o mestre-fornalheiro?' },
  { when: 'c2_inFactory', done: 'c2_readDiary', text: 'O mestre-fornalheiro deixou um diário no salão da fábrica.' },
  { when: 'c2_bossDead', done: 'c2_hasPass', text: 'Algo brilha na grelha da Garganta, agora apagada.' },
];

/** objetivos (principal / opcionais) do capítulo */
// Capítulo 3 — A Confraria (primeira fatia): Largo do Véu → portaria (passe) → salão nobre → secretaria →
// portão de segredo → arquivos subterrâneos → dossiê de Elias. A cripta do Sacristão fica para a próxima fatia.
export const OBJECTIVES_C3 = [
  { done: 'c3_wicketOpen', text: 'Largo do Véu, fim da Linha 4. As portas de bronze estão trancadas — mostre o passe da fita vermelha no postigo da portaria (leste do largo).' },
  { done: 'c3_inHall', text: 'A portaria está aberta. Entre no salão nobre da Sede.' },
  { done: 'c3_readRegimento', text: 'O portão do arquivo tem três discos de segredo. Procure o regimento do arquivo na secretaria (oeste do salão).' },
  { done: 'c3_vaultOpen', text: 'Gire os três discos na ordem do Regimento e puxe a alavanca do portão do arquivo.' },
  { done: 'c3_inArchive', text: 'Desça a escada para os arquivos subterrâneos.' },
  { done: 'c3_hasDossier', text: 'Procure o dossiê de Elias no fichário do fundo do arquivo (gaveta V).' },
  { done: 'c3_hasSignet', text: 'A grade da cripta só sobe pelo sarilho, e o selo dele pede o sinete da CHAMA — que o arquivista leva no dedo.' },
  { done: 'c3_cryptOpen', text: 'Encaixe o sinete no selo do sarilho, à esquerda da grade da cripta, e gire a manivela.' },
  { done: 'c3_bossDead', text: 'Desça à cripta. O Sacristão guarda o altar — e o que sobrou de Inês.' },
  { done: 'c3_chapterDone', text: 'A porta de ferro da galeria destravou. Siga pelas catacumbas (leste da cripta) rumo ao centro antigo.' },
  { done: 'c3_never', text: 'Capítulo 3 concluído. Inês foi levada à Torre, pela Cidade Morta.' },
];
export const SIDE_OBJECTIVES_C3 = [
  { when: 'c3_inHall', done: 'c3_mainOpen', text: 'As portas de bronze do largo só abrem por dentro: erga a tranca no salão nobre (atalho).' },
  { when: 'c3_inArchive', done: 'c3_readFicha', text: 'Há uma ficha de entrada recente na mesa de leitura do arquivo.' },
  { when: 'c3_bossDead', done: 'c3_readOrdem', text: 'Há papéis no altar da cripta, ao lado de uma fita vermelha.' },
  { when: 'c3_bossDead', done: 'c3_hasRibbon', text: 'Algo vermelho está preso num prego do altar.' },
];

// Capítulo 4 — Cidade Morta (primeira fatia: Rua do Comércio → Farmácia → Relojoaria → Praça do Relógio → Torre)
export const OBJECTIVES_C4 = [
  { done: 'c4_inStreet', text: 'Saia do beco do bueiro para a Rua do Comércio.' },
  { done: 'c4_sawBarricade', text: 'Siga pela Rua do Comércio até a Praça do Relógio, no fim da rua (norte).' },
  { done: 'c4_hasWatchKey', text: 'O bonde tombado fecha a rua. A Relojoaria Ponteiro (leste) tem saída pelos fundos — a chave ficou na Farmácia Central (oeste).' },
  { done: 'c4_watchOpen', text: 'Abra a Relojoaria Ponteiro com a chave do Dr. Lauro.' },
  { done: 'c4_inPlaza', text: 'Atravesse a relojoaria e o pátio dos fundos até o arco da Praça do Relógio.' },
  { done: 'c4_vigiaRetreat', text: 'O Vigia guarda a praça. Faça-o investir contra as pedras e golpeie o lampião nas costas.' },
  { done: 'c4_hasTowerKey', text: 'O Vigia fugiu para a Torre. Algo caiu nas pedras, ao pé da porta.' },
  { done: 'c4_sliceDone', text: 'Abra a porta de ferro da Torre do Relógio e entre.' },
  { done: 'c4_never', text: 'Primeira fatia do Capítulo 4 concluída. A subida da Torre continua na próxima atualização.' },
];
export const SIDE_OBJECTIVES_C4 = [
  { when: 'c4_inStreet', done: 'c4_readEdital', text: 'Há um edital colado no bonde tombado, no fim da rua.' },
  { when: 'c4_inStreet', done: 'c4_readDiario', text: 'O diário do farmacêutico deve estar no balcão da Farmácia Central.' },
  { when: 'c4_watchOpen', done: 'c4_readCaderno', text: 'O caderno do relojoeiro está na bancada dos fundos da relojoaria.' },
];

export function objectivesFor(ch) { return ch === 4 ? OBJECTIVES_C4 : ch === 3 ? OBJECTIVES_C3 : ch === 2 ? OBJECTIVES_C2 : OBJECTIVES; }
export function sideObjectivesFor(ch) { return ch === 4 ? SIDE_OBJECTIVES_C4 : ch === 3 ? SIDE_OBJECTIVES_C3 : ch === 2 ? SIDE_OBJECTIVES_C2 : SIDE_OBJECTIVES; }
