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
| Bloquear / esquivar | Q / Espaço | LT / B |
| Interagir | E | A |
| Curar (bandagem) | H | X |
| Trocar arma (machado ↔ martelo) | R | LB |
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
- **Mapa (tecla M)**: sistema real por andar (Subsolo / Térreo / 2º andar / Telhado). Mostra só os **cômodos visitados** (preenchidos) — com a **planta do hospital** os demais aparecem tracejados, mas segredos (câmara fria) nunca, até você entrar. Marca portas trancadas **que você já tentou** (×) com a mesma anotação das *Anotações* do inventário, livros de registro, escadas/elevador, o forno (aceso/apagado) e sua posição/direção. Painel lateral com o cômodo atual e as anotações. *(unit + smoke + screenshot)*
- **Ala cirúrgica superior (2º andar)**: porta no fim do corredor da administração → corredor da ala (autosave), **Esterilização** (autoclaves, *Registro cirúrgico*, *Rastejador* adormecido sob as macas), **Centro cirúrgico 2** (mesa, foco, *Interno* adormecido que desperta pela proximidade) e **Recuperação** (leitos, livro de registro, bandagem). **Ligação real ao laço**: a **escada principal** desce da ala até o corredor do térreo; o ferrolho fica no pé da escada e, puxado, vira atalho permanente (porta, navegação e save). *(smoke: atalho, autosave, livro e estado salvo)*
- **Telhado (jogável)**: escada dos fundos da ala sobe ao terraço (autosave), com caixas-d'água, respiros, platibanda com colisão, luar, a torre de transmissão piscando no horizonte e o **barracão do zelador** (*Bilhete do zelador*). *(smoke)*
- **Nova arma — Martelo industrial**: pego no barracão do telhado; entra no inventário de armas (lista real, persistida e migrada de saves v1 que só tinham o machado). Mais lento e pesado: golpes leves com mais poise, golpe forte esmagador. **R / LB troca de arma** (modelo, dados de ataque, HUD e inventário mudam juntos). *(unit + smoke: coleta, troca, dano)*
- **Objeto ambiental — cilindros de oxigênio**: qualquer golpe explode o cilindro (raio de 3,2 m, dano e stagger em inimigos, 35 de dano no jogador se estiver perto, reação em cadeia com outros cilindros, clarão, tremor e ruído). Explosões persistem no save. *(smoke: explosão fere um Rastejador próximo)*
- **Segredo 2 — o Expurgo**: uma **parede rachada** na ala resiste ao machado (só o **golpe forte do martelo** a derruba). Atrás: **Pedra de afiar** (machado +30% de dano permanente, indicado como "afiado" no HUD e no inventário), 2 bandagens e o *Último bilhete do zelador*. Parede, afiação e itens persistem. *(smoke: machado imune, martelo derruba, recompensa)*
- **Orçamento de luzes**: só as 16 lâmpadas mais próximas do jogador ficam ativas (contagem constante, sem recompilar shaders) — o hospital cresceu para 52 luzes. *(smoke)*
- **Chefe — O Cirurgião**: fases, golpes de bisturi em combo, agarrão (escapa martelando botões), investida que o atordoa ao bater em mesas/pilares; o avental absorve dano e o **frasco nas costas** é o ponto fraco (golpe forte de cima para baixo). Porta da sala tranca durante a luta; barra de vida própria. *(smoke: luta completa até a morte do chefe)*
- **Portão de serviço** liberado após o chefe → pátio → tela de fim de capítulo com estatísticas e gancho para o Capítulo 2 (placeholder).
- **Save versionado** (`localStorage`, chave `ocdc_save`, versão 1, com migração de v0): checkpoints automáticos (início, sala de máquinas, chegada ao subsolo, necrotério, lavanderia, administração, capela, ala cirúrgica, telhado, recuperação, antes do chefe, pátio) e livros de registro manuais. Morte → tela de morte → recarregar último registro. *(unit + smoke)*
- **Áudio** 100% sintetizado com Web Audio (passos, golpes, gemidos, portas, faíscas, elevador, ambiente e intensidade dinâmica de trilha), iniciado só após gesto do usuário.
- **HUD**: vida, fôlego, arma, objetivo atual, aviso de interação, dicas, vinheta de dano, barra do chefe.
- **Visual PS2**: render em baixa resolução com pixels nítidos, texturas procedurais em canvas, materiais Lambert, névoa, luzes piscando, energia de emergência.
- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`: testes → build → branch `gh-pages`).

### Sobre modelos e texturas

Não foram usados GLB/texturas de terceiros: **todo o visual é procedural** (geometria low‑poly montada em código, personagens com rig hierárquico animado por código, texturas desenhadas em `<canvas>`). Isso evita problemas de licença e mantém o build leve. Trocar por GLB rigados no futuro é possível sem mexer na lógica (os sistemas usam apenas a hierarquia de ossos do `ProceduralRig`).

## FALTA (para o Capítulo 1 completo, conforme o GDD)

- Modelos/animações artesanais (GLB rigados) e texturas pintadas — hoje tudo é procedural/placeholder estilizado.
- Áreas do hospital ainda ausentes: 3º andar (o telhado é só o terraço + barracão); ala pediátrica/maternidade e arquivo morto do GDD; mais segredos (hoje há dois: câmara fria e expurgo).
- A medalha e a planta não têm uso narrativo além do bônus/mapa; o documento da diretoria aponta para o Cap. 2 sem conteúdo jogável dele.
- Armas além de machado e martelo (facão, lança improvisada, arma de fogo antiga com munição escassa); durabilidade de armas; mais objetos ambientais além dos cilindros de oxigênio e do forno.
- Mapa: sem zoom, e sem marcação manual pelo jogador.
- Dano localizado/desmembramento estilizado, finalizações, opção de reduzir sangue.
- Mais tipos de inimigo; cutscenes; remapeamento de teclas; ajuste fino de dificuldade.
- Streaming por setores (hoje o capítulo é carregado inteiro — é pequeno).
- Capítulo 2 (a tela final é apenas um gancho/placeholder).
- Gamepad implementado mas **não testado** com controle físico; desempenho só medido em render por software no CI local.

## Estrutura

```
src/
  core/      Game (loop fixo 60 Hz, estados), Input, Settings, Save, Audio, EventBus
  world/     CollisionWorld, LevelBuilder, Doors, Interactables, Navigation (A*), Textures, Materials
  gameplay/  PlayerController, CameraController, CombatSystem, ProceduralRig, Inventory, QuestSystem
  ai/        PerceptionSystem, EnemyController, EnemyDirector, SurgeonBoss
  scenes/hospital/  HospitalLevel (geometria, luzes, elevador, grafo), HospitalScript (puzzles, gatilhos, chefe)
  ui/        HUD, Menus
  data/      armas, itens, inimigos, documentos, objetivos
tests/
  unit/run.mjs     testes de colisão, navegação, save, hitbox e dados
  e2e/smoke.mjs    joga o capítulo inteiro no Chromium headless (27 verificações)
```

## Licença

MIT.
