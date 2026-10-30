# O Culto das Cinzas

Survival horror em terceira pessoa feito com **Three.js + Vite**, com visual low‑poly inspirado no PS2 (verde doentio + âmbar).
Este repositório contém a **fatia vertical jogável do Capítulo 1 — Hospital São Dimas** (véspera, 1934).

▶ **Jogar no navegador:** https://luispauloalves500.github.io/o-culto-das-cinzas/

> Documento de design completo: [`GDD.md`](GDD.md).

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # gera dist/
npm run preview    # serve o build
npm test           # testes unitários (Node)
npm run smoke      # teste de fumaça E2E no Chromium headless (precisa de Chrome em /usr/bin/google-chrome ou CHROME_PATH)
```

## Controles

| Ação | Teclado/mouse | Gamepad (layout padrão) |
|---|---|---|
| Mover / correr | WASD / Shift | analógico esq. / L3 |
| Câmera | mouse (clique na tela para capturar) | analógico dir. |
| Ataque leve / forte | botão esquerdo / botão direito | RB / RT |
| Revólver: atirar (mira automática) / coronhada | botão direito / botão esquerdo | RT / RB |
| Revólver: **mira manual** (segurar) e atirar | segurar Q + botão esq. ou dir. | segurar LT + RB/RT |
| Revólver: **recarregar** o tambor | T | direcional ↑ |
| **Reparar** a arma em mãos (kit / pedra de afiar) | G | direcional ↓ |
| Bloquear / esquivar | Q (com arma corpo a corpo) / Espaço | LT / B |
| Interagir / pular cena | E | A |
| Curar (bandagem) | H | X |
| Trocar arma (machado → martelo → facão → revólver → lança) | R | LB |
| Inventário e documentos | Tab | Y |
| Mapa (←/→ ou 1–4 troca de andar) | M | Back/Select |
| Pausa | Esc / P | Start |
| Depuração (hitboxes) | F3 | — |

Opções no menu: sensibilidade do mouse, inverter eixo Y, volume e escala de resolução (salvos no `localStorage`).

## IMPLEMENTADO (e testado)

Tudo abaixo é sistema real, não encenação. Entre parênteses, como foi verificado.

- **Menu**: Novo jogo, Continuar (só aparece se existir save), Opções (sensibilidade, inverter Y, volume). *(smoke E2E)*
- **Início na enfermaria** com tutorial contextual (dicas aparecem quando a situação surge: mover, interagir, combate, cura, atalho, ruído, chefe). *(smoke + screenshot)*
- **Câmera de ombro em 3ª pessoa** com prevenção de oclusão (raycast contra paredes/teto) e tremor de impacto.
- **Colisão própria** (AABB + pisos/rampas + piso dinâmico do elevador) para jogador, inimigos e câmera. *(unit + smoke)*
- **Portas** que bloqueiam fisicamente, abrem/fecham animadas, trancadas/destrancáveis, com estado persistido no save. *(smoke)*
- **Machado de incêndio**: coleta, ataque leve (combo de 2) e forte, hitbox varrida sincronizada com a animação, ricochete em paredes, hitstop, consumo de fôlego. *(unit + smoke)*
- **Bloqueio, esquiva com i-frames, cura com bandagens, inventário com documentos.**
- **Inimigos** — *Interno* (lento, resistente) e *Enfermeiro* (rápido, agressivo): visão em cone com linha de visada, audição de ruídos (passos, corrida, golpes, disjuntor), investigação, perseguição com A* por grafo de salas (respeita portas fechadas), ataque, stagger por poise, morte. Inimigos mortos permanecem mortos após recarregar. *(unit + smoke)*
- **Puzzle elétrico**: encontrar o fusível, instalá-lo, ligar disjuntores na ordem II → III → I (pista em documento; ordem errada causa faísca, dano, ruído e reinicia), alavanca geral → energia volta (luzes, elevador). *(smoke)*
- **Elevador** funcional entre térreo e subsolo (chamada nos dois andares, painel interno, cabine move o jogador). *(smoke)*
- **Documentos de lore** (15) legíveis e guardados no inventário.
- **Atalho**: escada do subsolo de volta ao térreo e porta trancada que só abre por dentro, ligando à enfermaria. *(smoke)*
- **Ala Leste (quarentena, térreo)**: porta metálica liberada quando a energia volta; enfermaria com leitos, cortinas, posto de enfermagem, sala de isolamento e livro de registro; *Enfermeiro* em patrulha e um *Interno* adormecido que desperta quando você pega a **chave do necrotério**; documento *Prontuário coletivo*; porta com ferrolho que abre por dentro para o **patamar da escada** (atalho de volta ao laço principal — descer por ela também conta como chegar ao subsolo). *(smoke)*
- **Necrotério (subsolo)**: névoa e luz verde-doentia; bancos de gavetas procedurais numeradas (as gavetas 5, 13, 20 e 26 abrem de verdade, animadas e persistidas no save), mesas de autópsia com corpos, carrinho, pia e ralos; porta trancada por **chave**; autosave na entrada; documento *Livro de entradas*; bandagem escondida na gaveta 20 (só aparece com ela aberta). Novo arquétipo **Rastejador** (paciente amputado, adormecido sob um lençol): baixo demais para o golpe leve horizontal — só o **golpe forte** de cima para baixo o atinge —, agarra tornozelos e é atraído pelo rangido das gavetas. *(smoke: luta real até a morte; golpe leve confirma 0 de dano)*
- **Área secreta — câmara fria do Morais**: só abre empurrando o fundo da **gaveta 13** depois de ler a pista do prontuário (condição real, não apenas proximidade). Recompensa: **2 bandagens** + a *Carta não enviada da Dra. Helena Arcos*. *(smoke + unit de navegação)*
- **Anotações**: objetivos opcionais (pistas da Ala Leste, chave, gaveta 13) numa segunda linha do HUD e no inventário, junto das portas trancadas já tentadas. *(unit)*
- **Lavanderia (subsolo)**: acesso pelo oeste do hall do subsolo; máquinas de lavar industriais, calandra, mesa de dobrar, carrinhos de roupa e lençóis pendurados; *Enfermeiro* adormecido atrás dos lençóis (acorda pela proximidade ou pelo ruído do registro de gás); bandagem; documento *Ordem de serviço da lavanderia*; autosave na entrada. *(smoke)*
- **O forno — incinerador hospitalar**: sala de tijolos com a boca do forno acesa (luz tremulante, brasas). **Zona de calor real**: com o fogo aceso, dá dano periódico (inbloqueável, com empurrão) ao jogador **e aos inimigos** — dá para atrair um *Interno* para lá. A **chave da escada de serviço** está à vista dentro do forno: só dá para pegá-la depois de fechar o **registro de gás** na lavanderia (volante gira, fogo apaga, barulho alto acorda o enfermeiro). Estado do fogo persiste no save. Documento *Diário do forneiro*. *(smoke: dano do calor, registro, chave)*
- **Andares superiores — escada de serviço → 2º andar (administração)**: porta trancada no corredor do térreo aberta com a chave do forno (consome a chave, persiste); escada real (rampa com colisão) até o **corredor da administração**, **Secretaria** (bandagem, *Lista de transferência*, *Interno* em patrulha) e **Diretoria** (**planta do hospital**, *Memorando da diretoria*, livro de registro); *Enfermeiro* patrulhando o corredor; autosaves na chegada e na diretoria. *(smoke)*
- **Capela (térreo, com coro no 2º andar)**: bancos, altar, púlpito com hinário, vitrais com santos (só a luz da lua passa), quatro suportes de velas com placas dos santos e órgão no coro. Entra-se pelo **coro** (escada do 2º andar) e o ferrolho da porta para o corredor do térreo abre por dentro (**atalho**). **Puzzle das velas**: acender na ordem do *Hino de São Dimas* (Brás → Luzia → Roque → Dimas); errar apaga todas, faz barulho e acorda o *Interno* escondido entre os bancos. Acertar abre o relicário: **Medalha de São Dimas** (+25 de vida máxima, cura total, barra de vida dourada). Tudo persiste no save. *(smoke: ordem errada e certa, relíquia, atalho)*
- **Mapa (tecla M)**: sistema real por andar (Subsolo / Térreo / 2º andar / 3º andar · Telhado). Mostra só os **cômodos visitados** (preenchidos) — com a **planta do hospital** os demais aparecem tracejados, mas segredos (câmara fria) nunca, até você entrar. Marca portas trancadas **que você já tentou** (×) com a mesma anotação das *Anotações* do inventário, livros de registro, escadas/elevador, o forno (aceso/apagado) e sua posição/direção. Painel lateral com o cômodo atual e as anotações. *(unit + smoke + screenshot)*
- **Ala cirúrgica superior (2º andar)**: porta no fim do corredor da administração → corredor da ala (autosave), **Esterilização** (autoclaves, *Registro cirúrgico*, *Rastejador* adormecido sob as macas), **Centro cirúrgico 2** (mesa, foco, *Interno* adormecido que desperta pela proximidade) e **Recuperação** (leitos, livro de registro, bandagem). **Ligação real ao laço**: a **escada principal** desce da ala até o corredor do térreo; o ferrolho fica no pé da escada e, puxado, vira atalho permanente (porta, navegação e save). *(smoke: atalho, autosave, livro e estado salvo)*
- **Telhado (jogável)**: escada dos fundos da ala sobe ao terraço (autosave), com caixas-d'água, respiros, platibanda com colisão, luar, a torre de transmissão piscando no horizonte e o **barracão do zelador** (*Bilhete do zelador*). *(smoke)*
- **Nova arma — Martelo industrial**: pego no barracão do telhado; entra no inventário de armas (lista real, persistida e migrada de saves v1 que só tinham o machado). Mais lento e pesado: golpes leves com mais poise, golpe forte esmagador. **R / LB troca de arma** (modelo, dados de ataque, HUD e inventário mudam juntos). *(unit + smoke: coleta, troca, dano)*
- **Objeto ambiental — cilindros de oxigênio**: qualquer golpe explode o cilindro (raio de 3,2 m, dano e stagger em inimigos, 35 de dano no jogador se estiver perto, reação em cadeia com outros cilindros, clarão, tremor e ruído). Explosões persistem no save. *(smoke: explosão fere um Rastejador próximo)*
- **Segredo 2 — o Expurgo**: uma **parede rachada** na ala resiste ao machado (só o **golpe forte do martelo** a derruba). Atrás: **Pedra de afiar** (machado +30% de dano permanente, indicado como "afiado" no HUD e no inventário), 2 bandagens e o *Último bilhete do zelador*. Parede, afiação e itens persistem. *(smoke: machado imune, martelo derruba, recompensa)*
- **3º andar — Ala pediátrica (bloco jogável grande)**: porta no telhado → corredor da pediatria (autosave), **Brinquedoteca** (brinquedos, desenhos nas paredes, teatrinho de fantoches, caixinha de música, *Desenho de criança*), **Berçário** (berços, *Ficha do berçário*, *Rastejador* adormecido), **Posto de enfermagem** (chave da segurança, munição, bandagem, livro de registro) e **Segurança** (trancada; mesa do vigia, *Ordem de serviço — vigilância*, *Interno* adormecido). Enfermeiro patrulha o corredor. **Ligação ao laço**: porta externa → **escada de incêndio** (metálica, com corrimão e colisão) que desce até o 2º andar; a porta para o patamar da escada principal só destranca **por fora** e vira atalho permanente (autosave na escada). Navegação dos inimigos cobre todo o bloco. *(smoke: autosaves, portas, escada, atalho)*
- **Nova arma — Facão**: cravado num berço; rápido e barato em fôlego (combo leve-leve), golpe forte curto; aceita a pedra de afiar. Pegá-lo acorda o Rastejador do berçário. *(unit + smoke: coleta, equipa, mata o Enfermeiro)*
- **Nova arma — Revólver .38 (munição escassa)**: na mesa do vigia (com 3 balas). **Botão direito atira** (mira automática no alvo à frente dentro de um cone, alcance 20 m, 70 de dano, clarão e tiro altíssimo que atrai inimigos); **botão esquerdo dá coronhada**. Sem balas: clique seco. Munição contada no HUD e no inventário. Há **12 balas no capítulo** (3 no revólver, 2 no posto, 3 na segurança, 4 no Quarto 7). *(unit + smoke: tiro fere e gasta 1 bala, clique seco, R alterna as 4 armas)*
- **Segredo 3 — o Quarto 7**: o *Desenho de criança* mostra o teatrinho; depois de lê-lo dá para **empurrar o teatrinho**, que revela uma porta acorrentada. O **cadeado não cede a golpes — só a uma bala**. Lá dentro: **Amuleto do menino** (fôlego máximo +25, permanente), 4 balas e o *Caderno do Quarto 7*. Não aparece no mapa até você entrar. Tudo persiste no save. *(smoke: facão não quebra, tiro quebra, recompensa, save/continuar)*
- **2º andar — Maternidade (ligada ao laço)**: a chave com etiqueta vermelha fica no **quadro da segurança** (3º andar); ela abre a porta de metal na parede norte da **Secretaria**. Corredor (autosave, *Enfermeiro* em patrulha, maca e cadeira de rodas), **Sala de parto** (mesa ginecológica, incubadora, bandeja, *Prontuário de parto*, *Interno* adormecido), **Alojamento conjunto** (leitos com manivela, berços, *Carta debaixo do travesseiro*, bandagem, *Rastejador* adormecido) e **Posto obstétrico** (balcão, *Livro de partos*, 2 balas, livro de registro e a **chave do arquivo morto**). Névoa própria, navegação para os inimigos e 4 cômodos no mapa. *(smoke: porta trancada sem chave, chave, autosave, portas, docs, livro de registro)*
- **Subsolo — Arquivo morto**: porta de ferro no fundo do Arquivo, aberta com a chave do posto obstétrico (autosave). Estantes altas que bloqueiam a visão, mesa de consulta com o prontuário selado *"RN 0"*, *Interno* em patrulha e um **arquivo deslizante** nos trilhos com o volante arrancado. *(smoke)*
- **Nova arma — Lança improvisada**: suporte de soro com um bisturi de parto amarrado, na sala de parto. **Estocada longa** (acerta a ~1,5 m, antes de o inimigo alcançar), golpe forte que atravessa, fraca para os lados; aceita a pedra de afiar. Modelo procedural próprio e animações de estocada. Pegá-la acorda o *Interno* da sala. **R alterna as 5 armas**. *(unit + smoke: coleta, equipa, mata o Interno à distância, troca, save/continuar)*
- **Segredo 4 — a Sala de batismo**: sem a manivela, o arquivo deslizante só pode ser examinado (e bloqueia o vão). Com a **manivela do alojamento**, ele desliza 2,8 m nos trilhos (barulho alto, acorda um *Rastejador*) e revela um vão para uma salinha de pedra com pia batismal cheia de cinza, velas e pulseiras penduradas: *Ata do primeiro batismo* (Elias é o "RN 0"), **Pulseira de recém-nascido** (bandagens curam 65 em vez de 45, permanente), 3 balas e uma bandagem. Não aparece no mapa até você entrar; arquivo, colisão, navegação e recompensa persistem no save. *(smoke: bloqueio, manivela, colisão nova, recompensa, save/continuar)*
- **Objeto ambiental — caixinha de música**: dar corda toca por 12 s e faz barulho repetido que **atrai os inimigos do andar** até a brinquedoteca (passar despercebido ou emboscar). Inimigos não abrem portas: deixe a da brinquedoteca aberta. *(smoke: Interno investiga e caminha até ela)*
- **Orçamento de luzes**: só as 16 lâmpadas mais próximas do jogador ficam ativas (contagem constante, sem recompilar shaders) — o hospital cresceu para 62 luzes. *(smoke)*
- **Chefe — O Cirurgião**: fases, golpes de bisturi em combo, agarrão (escapa martelando botões), investida que o atordoa ao bater em mesas/pilares; o avental absorve dano e o **frasco nas costas** é o ponto fraco (golpe forte de cima para baixo). Porta da sala tranca durante a luta; barra de vida própria. *(smoke: luta completa até a morte do chefe)*
- **Portão de serviço** liberado após o chefe → pátio → tela de fim de capítulo com estatísticas e botão **"Seguir para o Capítulo 2 — Fumaça"**.
- **Save versionado** (`localStorage`, chave `ocdc_save`, versão 2, com migração de v0 e v1 — a v2 grava `possuiMachado`/`machadoEquipado`): checkpoints automáticos (início, sala de máquinas, chegada ao subsolo, necrotério, lavanderia, administração, capela, ala cirúrgica, telhado, recuperação, pediatria, escada de incêndio, maternidade, arquivo morto, antes do chefe, pátio) e livros de registro manuais. Morte → tela de morte → recarregar último registro. *(unit + smoke)*
- **Áudio** 100% sintetizado com Web Audio (passos, golpes, gemidos, portas, faíscas, elevador, ambiente e intensidade dinâmica de trilha), iniciado só após gesto do usuário.
- **HUD**: vida, fôlego, arma, objetivo atual, aviso de interação, dicas, vinheta de dano, barra do chefe.
- **Visual PS2**: render em baixa resolução com pixels nítidos, texturas procedurais em canvas, materiais Lambert, névoa, luzes piscando, energia de emergência.
- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`: testes → build → branch `gh-pages`).

- **Desgaste de armas**: machado (90), martelo (120), facão (70) e lança (55) têm durabilidade. Golpe leve gasta 1, forte 2, bater em parede 3, bloquear 0,5; lâmina afiada gasta 25% menos. Abaixo de 50% a arma fica *gasta* (−15% de dano), abaixo de 25% *lascada* (−30%) e em 0% *quebrada* (metade do dano, mas nunca some). Condição em % e rótulo no HUD (barra fina sob a arma) e no inventário; avisos ao cruzar cada faixa. **G repara**: o **Kit de reparo** (fita, arame e lixa — 4 no capítulo: depósito, lavanderia, recuperação e alojamento da maternidade) leva a 100% em 1,6 s; sem kit, a **pedra de afiar** recupera lâminas (machado, facão, lança) até 60%. Esquiva interrompe o reparo. Desgaste vai no save. *(unit + smoke: golpes gastam, HUD mostra %, pedra → 60%, kit → 100%, save/continuar)*
- **Revólver com tambor e recarga própria**: 6 balas no tambor + reserva (munição .38 no inventário). Atirar só gasta o tambor; vazio = clique seco com aviso. **T recarrega** uma bala por vez (0,45 s + 0,32 s por bala, faz barulho; esquiva cancela; dá para recarregar mirando). HUD: `Revólver · 3/6 · reserva 4`. Saves antigos migram (as balas da reserva enchem o tambor, nada se perde). *(unit + smoke)*
- **Mira manual**: com o revólver, **segurar Q** aproxima a câmera sobre o ombro (FOV menor), mostra a **retícula** e o tiro sai pelo raio do centro da tela — sem auto-mira, a parede bloqueia, e **tiro na cabeça** dá ×1,4. Botão direito sem Q continua com a mira automática. *(unit: raio × cápsula/esfera; smoke: mirando ao lado erra, apontado acerta)*
- **Trama RN 0 — a revelação na Sala de batismo**: com o **amuleto do menino** (dente do Davi, Quarto 7) e a **pulseira "R N 0"** (altar), Elias põe os dois na cinza da pia. **Cena curta (~19 s, pulável com E)** com câmera própria e tarjas: a cinza sobe em espiral, o menino de cinza (Davi) fala com Elias, e a visão de **Marta Varga na maca** e do residente **Vernet com a colher de prata** aparece na cinza. No fim: documento final **"A contagem da Confraria"** (0 = Varga, retorno em trinta anos; 1–6 = lote C; 7 = Davi, a reserva — "O zero voltou."), vida cheia e autosave; a cinza fica escura e a lâmpada fraca. Sem os dois itens, a pia só dá a pista *"O ZERO E O SETE"* e diz o que falta. Objetivo opcional novo, e a **tela de fim de capítulo** mostra se a revelação foi vista (com o trecho final) ou só a dica. *(smoke: pista, cena, HUD oculto, pular, documento, save, fim de capítulo — captura `11-revelacao.png`)*
- **Modelo REV6 Elias+machado GLB** (`public/models/elias_rev6.glb`, 7,5 MB — o pacote `personagem_REV6_coleta_machado.glb` de 26 MB com texturas reduzidas a 1024 px JPEG): Elias com esqueleto Mixamo, carregado por `GLTFLoader` + `AnimationMixer` (`src/gameplay/EliasModel.js`, sistema do pacote adaptado em `src/gameplay/rev6/`). Começa **sem machado visível**; o machado do cenário é a mesma malha `Machado_Equipado` clonada (o `machado_coletavel_80cm.glb` não veio no pacote). Pegar com **E** a até 1,5 m oculta o do cenário, mostra o `Machado_Equipado` no `SocketMachado_Direita` e troca para os clipes `_Machado`. Clipes: idle `_01a17993…`, inquietação `_01a18db3…` (parado ~14 s), `Walking`/`Running` (velocidade casada com a passada), golpe leve 1/2 = `Double_Combo_Attack` (1º e 2º corte), forte = `Attack`. **Hitbox real**: a esfera de dano segue a ponta e o cabo da lâmina do GLB, com o clipe encaixado na janela de dano do golpe; o corpo gira no golpe para o corte diagonal cruzar a frente e, com alvo à frente, o avanço cobre até 0,5 m (o braço do GLB alcança menos que o boneco procedural). Martelo, facão, lança e revólver vão presos à mão do GLB; estocada da lança, tiro, esquiva, defesa, dano, cura e recarga continuam com as poses procedurais reaplicadas nos ossos do GLB. `?elias=0` na URL força o visual procedural antigo. O GLB vai no repositório em partes base64 (`assets-src/`) e `scripts/assets.mjs` o remonta e confere o sha256 antes de dev/build/test. *(unit: migração v1→v2, mapa de clipes, coleta por distância; smoke: GLB carregado, sem machado antes, recusa a >1,5 m, machado na mão após coletar, clipes `_Machado`, golpe move a lâmina, troca para martelo, save restaura, GLB servido — captura `02b-elias-machado.png`)*
- **HUD**: o aviso "AGARRADO!" agora acompanha o estado real do jogador (some ao soltar, ao morrer, ao renascer e em cenas). *(smoke)*

- **Elias parado e pegada do machado (pt31u)**: sem machado, o idle usa o clipe `Elias_Idle` com o braço direito copiado do `Walking` (t=0,47), sem o braço "aberto" do clipe original; pés no chão (dedos y≈0,03–0,04, quadril 0,96). Com machado, nos clipes `Elias_Idle_Machado`/`Walking_Machado`/`Running_Machado` o punho recebe uma correção de 111° (63° da torção vão para o antebraço) e o machado (`AXE_GRIP` rot. Y −90°) fica com o gume para fora e o cabo ~30° abaixo da horizontal, empunhado pela mão — não mais "espetado" para cima. *(smoke: machado na mão, clipes `_Machado`)*
- **Capítulo 2 — Fumaça · Bairro Operário (prévia jogável)**: o botão do fim do Capítulo 1 (ou *Continuar* num save com o capítulo concluído) leva ao bairro. **Migração de save** (`src/core/SaveManager.js` → `makeChapter2Save`): o save vira capítulo 2 (checkpoint `c2_gate`), as chaves/itens do hospital são removidos, armas, desgaste, tambor, documentos, melhorias (amuleto, medalha, pedra de afiar), tempo e estatísticas continuam; vida 80–125. Setor procedural PS2 (`src/scenes/bairro/`): Rua dos Tecelões com o muro e a placa do hospital, casas de tijolo, bonde em chamas como barricada, lampiões a gás e fuligem caindo; Beco; Depósito da tecelagem (estantes, tear, fardos); Escritório do capataz; Pátio de carga com trilhos e o ponto do bonde — tudo com colisão e grafo de navegação. **Caçador** (inimigo novo: audição 2,2×, patrulha, investiga barulho — corrida, porta batida, golpe na parede, manivela — e ataca com garra/bote). Item-chave **Manivela de carga** (escritório; pegar faz barulho e acorda o caçador do depósito) abre a **porta de carga emperrada**. Documentos **"Jornal da véspera"** e **"Bilhete do capataz"**; objetivos principais e opcionais próprios; autosave na entrada do depósito, **livro de registros** no escritório e save no ponto do bonde (fim da prévia). Mapa do capítulo 2 só mostra o que já foi percorrido. *(unit: migração, objetivos, mapa, caçador; smoke: botão, carregamento, colisão, caçador investiga, documentos, portas, manivela, save no livro com inimigo morto, pátio, mapa, luzes ≤ 16, recarregar e continuar no Capítulo 2 — capturas `12-bairro-*.png`)*

### Sobre modelos e texturas

Exceção: o **Elias REV6** (GLB do pacote do projeto, ver acima). Fora ele, não foram usados GLB/texturas de terceiros: **o visual é procedural** (geometria low‑poly montada em código, personagens com rig hierárquico animado por código, texturas desenhadas em `<canvas>`). Isso evita problemas de licença e mantém o build leve. Trocar por GLB rigados no futuro é possível sem mexer na lógica (os sistemas usam apenas a hierarquia de ossos do `ProceduralRig`).

## FALTA (Capítulo 1 completo e Capítulo 2, conforme o GDD)

- Modelos/animações artesanais para inimigos, chefe e cenário (só o Elias usa GLB); clipes próprios para lança, tiro, esquiva, defesa e dano (hoje poses procedurais no esqueleto do GLB); o modelo dedicado `machado_coletavel_80cm.glb`.
- Maternidade e arquivo morto já entraram; faltam mais segredos e variações de rota (hoje há quatro: câmara fria, expurgo, Quarto 7 e sala de batismo).
- A medalha e a planta não têm uso narrativo além do bônus/mapa; o documento da diretoria aponta para o Cap. 2 sem conteúdo jogável dele.
- Mais objetos ambientais além dos cilindros, do forno e da caixinha de música; mira manual sem assistência no gamepad (sem *aim assist*); o desgaste ainda não muda o visual da arma.
- A revelação RN 0 é uma cena curta com bonecos de cinza procedurais (sem animação facial nem voz); outras cenas do capítulo continuam só em texto.
- Mapa: sem zoom, e sem marcação manual pelo jogador.
- Dano localizado/desmembramento estilizado, finalizações, opção de reduzir sangue.
- Mais tipos de inimigo; mais cutscenes; remapeamento de teclas; ajuste fino de dificuldade.
- Streaming por setores (hoje o capítulo é carregado inteiro — é pequeno).
- Capítulo 2: só a prévia do Bairro Operário está jogável. Faltam a Rua do Carvão, a fábrica de fumaça, o chefe do capítulo, mais caçadores/variações, cenas e a tela de fim do Capítulo 2; o caçador usa o boneco procedural (sem modelo próprio).
- Gamepad implementado mas **não testado** com controle físico; desempenho só medido em render por software no CI local.

## Estrutura

```
src/
  core/      Game (loop fixo 60 Hz, estados), Input, Settings, Save, Audio, EventBus
  world/     CollisionWorld, LevelBuilder, Doors, Interactables, Navigation (A*), Textures, Materials
  gameplay/  PlayerController, EliasModel (GLB REV6) + rev6/, CameraController, CombatSystem, ProceduralRig, Inventory, QuestSystem, Cutscene
  ai/        PerceptionSystem, EnemyController, EnemyDirector, SurgeonBoss
  scenes/bairro/    BairroLevel (Bairro Operário, Cap. 2), BairroScript (manivela, porta de carga, caçadores)
  scenes/hospital/  HospitalLevel (geometria, luzes, elevador, grafo), HospitalScript (puzzles, gatilhos, chefe),
                    HospitalWing/WingScript (2º andar + telhado), HospitalPeds/PedsScript (3º andar · pediatria),
                    HospitalMaternity/MaternityScript (2º andar · maternidade),
                    HospitalDeadArchive/DeadArchiveScript (subsolo · arquivo morto + sala de batismo),
                    HospitalRn0 (revelação RN 0: rito da pia e cena)
  ui/        HUD, Menus
  data/      armas, itens, inimigos, documentos, objetivos
tests/
  unit/run.mjs     29 testes: colisão, navegação, save, hitbox, raio da mira, desgaste e dados
  e2e/smoke.mjs    joga o capítulo inteiro no Chromium headless (115 verificações)
```

## Licença

MIT.
