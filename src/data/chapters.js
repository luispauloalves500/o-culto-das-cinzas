// Capítulos e objetivos (o objetivo exibido é o primeiro ainda não concluído).
export const CHAPTERS = [
  { id: 1, name: 'Despertar', place: 'Hospital São Dimas', playable: true },
  { id: 2, name: 'Fumaça', place: 'Bairro Operário', playable: true },
  { id: 3, name: 'A Confraria', place: 'Sede e arquivos subterrâneos', playable: true },
  { id: 4, name: 'Cidade Morta', place: 'Centro antigo de Véspera', playable: true },
  { id: 5, name: 'Águas Negras', place: 'Estação de bombeamento', playable: true },
  { id: 6, name: 'O Acervo', place: 'Museu de Ciências Proibidas', playable: true },
  { id: 7, name: 'Sob a Pedra', place: 'Catacumbas e metrô antigo', playable: true },
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

// Capítulo 4 — Cidade Morta: Rua do Comércio → Farmácia → Relojoaria → Praça do Relógio (Vigia, 1º confronto) →
// Torre do Relógio (escada) → casa das máquinas (mecanismo, Vigia, 2º confronto) → passagem do Relógio
export const OBJECTIVES_C4 = [
  { done: 'c4_inStreet', text: 'Saia do beco do bueiro para a Rua do Comércio.' },
  { done: 'c4_sawBarricade', text: 'Siga pela Rua do Comércio até a Praça do Relógio, no fim da rua (norte).' },
  { done: 'c4_hasWatchKey', text: 'O bonde tombado fecha a rua. A Relojoaria Ponteiro (leste) tem saída pelos fundos — a chave ficou na Farmácia Central (oeste).' },
  { done: 'c4_watchOpen', text: 'Abra a Relojoaria Ponteiro com a chave do Dr. Lauro.' },
  { done: 'c4_inPlaza', text: 'Atravesse a relojoaria e o pátio dos fundos até o arco da Praça do Relógio.' },
  { done: 'c4_vigiaRetreat', text: 'O Vigia guarda a praça. Faça-o investir contra as pedras e golpeie o lampião nas costas.' },
  { done: 'c4_hasTowerKey', text: 'O Vigia fugiu para a Torre. Algo caiu nas pedras, ao pé da porta.' },
  { done: 'c4_sliceDone', text: 'Abra a porta de ferro da Torre do Relógio e entre.' },
  { done: 'c4_inGears', text: 'Suba a escada da Torre até a casa das máquinas do Relógio, no alto da galeria.' },
  { done: 'c4_hasEscape', text: 'O mecanismo do Relógio está parado: falta a roda de escape. Procure na casa das máquinas (a bancada do sineiro fica a leste).' },
  { done: 'c4_mechRunning', text: 'Encaixe a roda de escape no mecanismo central e solte a trava do pêndulo.' },
  { done: 'c4_vigiaDead', text: 'O Vigia desceu do campanário. Faça-o investir contra as engrenagens (ou espere o pêndulo) e quebre o lampião nas costas.' },
  { done: 'c4_passageOpen', text: 'Na face norte do mecanismo: acerte os ponteiros na hora do toque e acione o martelo do sino.' },
  { done: 'c4_chapterDone', text: 'A chapa de ferro desceu. Siga pela passagem do Relógio.' },
  { done: 'c4_never', text: 'Capítulo 4 concluído. A passagem do Relógio desce rumo aos canais — Águas Negras.' },
];
export const SIDE_OBJECTIVES_C4 = [
  { when: 'c4_inStreet', done: 'c4_readEdital', text: 'Há um edital colado no bonde tombado, no fim da rua.' },
  { when: 'c4_inStreet', done: 'c4_readDiario', text: 'O diário do farmacêutico deve estar no balcão da Farmácia Central.' },
  { when: 'c4_watchOpen', done: 'c4_readCaderno', text: 'O caderno do relojoeiro está na bancada dos fundos da relojoaria.' },
  { when: 'c4_sliceDone', done: 'c4_readRondas', text: 'Há um livro aberto no atril do térreo da Torre.' },
  { when: 'c4_vigiaDead', done: 'c4_readBilhete', text: 'Há um papel preso entre os dentes da engrenagem mais alta do mecanismo.' },
];

// Capítulo 5 — Águas Negras (primeira fatia): passagem do Relógio → canal principal (Afogados) → casa de bombas →
// energia no painel (fusível do comporteiro + disjuntores na ordem do relatório) → mezanino → válvula da comporta →
// antecâmara das turbinas → comportas → salão das turbinas (chefe: A Afogada) → galeria de descarga (fim)
export const OBJECTIVES_C5 = [
  { done: 'c5_inCanal', text: 'Desça a passagem do Relógio até os canais.' },
  { done: 'c5_crossed', text: 'Escombros fecham a margem sul do canal. Atravesse para a margem norte pela passarela de tábuas — e fique longe da água.' },
  { done: 'c5_inPumps', text: 'Siga pela galeria de serviço (leste) até a casa de bombas.' },
  { done: 'c5_hasFuse', text: 'O portão do salão das bombas está sem energia e falta o fusível do painel. Procure a casa do comporteiro, no fim da margem norte (oeste).' },
  { done: 'c5_power', text: 'Na sala do painel (oeste da antecâmara): fusível no soquete, disjuntores na ordem do relatório e a chave geral.' },
  { done: 'c5_upper', text: 'O portão abriu e a escada retrátil desceu (leste do salão). Suba ao mezanino das bombas.' },
  { done: 'c5_sluiceOpen', text: 'Pela porta do mezanino, siga a passarela do reservatório e gire a válvula da comporta.' },
  { done: 'c5_sliceDone', text: 'A comporta subiu. Atravesse a antecâmara das turbinas e abra as comportas ao fundo.' },
  { done: 'c5_afogadaDead', text: 'A Afogada guarda o salão das turbinas. Tire-a da água: alavanca da turbina (leste), ralo de drenagem (oeste) e as grades de ferro. Golpeie as guelras.' },
  { done: 'c5_chapterDone', text: 'A portinhola norte abriu. Saia pela galeria de descarga, atrás da turbina.' },
  { done: 'c5_never', text: 'Capítulo 5 concluído. A barcaça segue rio abaixo, rumo ao Museu — Capítulo 6, O Acervo.' },
];
export const SIDE_OBJECTIVES_C5 = [
  { when: 'c5_inCanal', done: 'c5_readAviso', text: 'Há uma chapa de aviso aparafusada na parede, na boca da passagem.' },
  { when: 'c5_crossed', done: 'c5_gotRubble', text: 'Atrás dos escombros da margem sul há uma caixa de ferramentas — só se chega pelo canal.' },
  { when: 'c5_sluiceOpen', done: 'c5_readDiario', text: 'Há um caderno sobre o cofre das turbinas, na antecâmara.' },
  { when: 'c5_afogadaDead', done: 'c5_readFicha', text: 'Na galeria de descarga há uma ficha sobre um caixote de remessa.' },
];

// Capítulo 6 — O Acervo: doca de carga do Museu → átrio → Salão de Exposição (vitrines quebráveis, espécimes) →
// porta-cofre da Ala de Conservação (nº de inventário da peça mais antiga) → conservação → depósito → campainha de
// entregas → Galeria do Colecionador (chefe) → reserva técnica → alçapão para as galerias sob a pedra (Capítulo 7)
export const OBJECTIVES_C6 = [
  { done: 'c6_inAtrium', text: 'Suba da doca de carga para dentro do Museu.' },
  { done: 'c6_inHall', text: 'Atravesse o átrio até o Salão de Exposição (porta dupla ao norte).' },
  { done: 'c6_vaultOpen', text: 'A porta-cofre da Ala de Conservação (leste do salão) abre com o nº de inventário da peça mais antiga do acervo. Leia as placas das vitrines e gire os três discos.' },
  { done: 'c6_inStorage', text: 'Atravesse a Ala de Conservação até o depósito das remessas (porta ao norte).' },
  { done: 'c6_sliceDone', text: 'No fundo do depósito, sob o arco de latão: a porta da Galeria do Colecionador.' },
  { done: 'c6_galleryOpen', text: 'A porta de ferro está trancada por dentro. Ao lado dela, o cordão da campainha de entregas: anuncie a remessa.' },
  { done: 'c6_collectorDead', text: 'O Colecionador guarda a Galeria. Ele usa o próprio acervo contra você: atraia as investidas para as vitrines blindadas, solte as peças dos guinchos do teto em cima dele e golpeie o relicário no peito quando a gaiola abrir.' },
  { done: 'c6_chapterDone', text: 'A porta da reserva técnica (norte da Galeria) abriu. Desça pelo alçapão no fim dela.' },
  { done: 'c6_never', text: 'Capítulo 6 concluído. O alçapão desce para as catacumbas e o metrô antigo — siga para o Capítulo 7, Sob a Pedra.' },
];
export const SIDE_OBJECTIVES_C6 = [
  { when: 'c6_inAtrium', done: 'c6_readGuia', text: 'Há um guia do visitante sobre o balcão da recepção.' },
  { when: 'c6_readGuia', done: 'c6_gotCache', text: 'O guia fala de um tabuleiro "com gaveta de fundo falso". Alguma vitrine do salão guarda mais do que ossos.' },
  { when: 'c6_vaultOpen', done: 'c6_readDiario', text: 'O diário da conservadora ficou sobre a mesa de restauro.' },
  { when: 'c6_inStorage', done: 'c6_readCartao', text: 'Um caixote aberto no depósito ainda tem o cartão de inventário pregado.' },
  { when: 'c6_collectorDead', done: 'c6_readCatalogo', text: 'Na escrivaninha da reserva técnica está o catálogo do Colecionador.' },
];
// Capítulo 7 — Sob a Pedra (primeira fatia): poço da escada de serviço → galeria de pedra → ossuário (emparedados
// cegos nos nichos: acordam com barulho; ossos no chão estalam) → cripta (jazigo do coveiro-mor: pé de cabra → chave)
// → grade do fundo do ossuário → túnel → plataforma da Estação Sé Velha → trilhos da Linha Velha (fim da fatia)
export const OBJECTIVES_C7 = [
  { done: 'c7_inOssuary', text: 'O alçapão bateu lá em cima. Siga pela galeria de pedra (norte) até as catacumbas.' },
  { done: 'c7_sawGate', text: 'Atravesse o ossuário até a grade do fundo (norte). Os emparedados nos nichos não enxergam — mas ouvem: ande, não corra, e evite pisar nos ossos.' },
  { done: 'c7_hasKey', text: 'A grade tem um cadeado em forma de crânio: a chave ficou com o coveiro-mor. O jazigo dele está na cripta (porta a oeste do ossuário).' },
  { done: 'c7_ossOpen', text: 'Volte à grade do fundo do ossuário e abra o cadeado com a chave do coveiro-mor.' },
  { done: 'c7_onPlatform', text: 'Siga pelo túnel além da grade.' },
  { done: 'c7_sliceDone', text: 'Estação Sé Velha. Desça aos trilhos (escada de manutenção no fim leste da plataforma) e siga a Linha Velha para o leste.' },
  { done: 'c7_never', text: 'Fim da primeira parte de Sob a Pedra. A Linha Velha segue para a Estação Sob a Pedra — o resto do Capítulo 7 vem na próxima atualização.' },
];
export const SIDE_OBJECTIVES_C7 = [
  { when: 'c7_inOssuary', done: 'c7_readRegistro', text: 'Há um livro aberto na estante da entrada do ossuário.' },
  { when: 'c7_triedJazigo', done: 'c7_hasCrowbar', text: 'A tampa do jazigo não se move com as mãos. O carrinho de ferramentas da galeria de pedra tinha uma alavanca.' },
  { when: 'c7_onPlatform', done: 'c7_readQuadro', text: 'O quadro de horários da Linha Velha ainda está na parede da plataforma.' },
  { when: 'c7_onPlatform', done: 'c7_shortcut', text: 'A porta de serviço no fundo leste da plataforma pode dar um caminho de volta ao poço da escada.' },
];
export function objectivesFor(ch) { return ch === 7 ? OBJECTIVES_C7 : ch === 6 ? OBJECTIVES_C6 : ch === 5 ? OBJECTIVES_C5 : ch === 4 ? OBJECTIVES_C4 : ch === 3 ? OBJECTIVES_C3 : ch === 2 ? OBJECTIVES_C2 : OBJECTIVES; }
export function sideObjectivesFor(ch) { return ch === 7 ? SIDE_OBJECTIVES_C7 : ch === 6 ? SIDE_OBJECTIVES_C6 : ch === 5 ? SIDE_OBJECTIVES_C5 : ch === 4 ? SIDE_OBJECTIVES_C4 : ch === 3 ? SIDE_OBJECTIVES_C3 : ch === 2 ? SIDE_OBJECTIVES_C2 : SIDE_OBJECTIVES; }
