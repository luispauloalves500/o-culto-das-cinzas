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
| Inventário e documentos | Tab | Y |
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
- **Documentos de lore** (7) legíveis e guardados no inventário.
- **Atalho**: escada do subsolo de volta ao térreo e porta trancada que só abre por dentro, ligando à enfermaria. *(smoke)*
- **Ala Leste (quarentena, térreo)**: porta metálica liberada quando a energia volta; enfermaria com leitos, cortinas, posto de enfermagem, sala de isolamento e livro de registro; *Enfermeiro* em patrulha e um *Interno* adormecido que desperta quando você pega a **chave do necrotério**; documento *Prontuário coletivo*; porta com ferrolho que abre por dentro para o **patamar da escada** (atalho de volta ao laço principal — descer por ela também conta como chegar ao subsolo). *(smoke)*
- **Necrotério (subsolo)**: névoa e luz verde-doentia; bancos de gavetas procedurais numeradas (as gavetas 5, 13, 20 e 26 abrem de verdade, animadas e persistidas no save), mesas de autópsia com corpos, carrinho, pia e ralos; porta trancada por **chave**; autosave na entrada; documento *Livro de entradas*; bandagem escondida na gaveta 20 (só aparece com ela aberta). Novo arquétipo **Rastejador** (paciente amputado, adormecido sob um lençol): baixo demais para o golpe leve horizontal — só o **golpe forte** de cima para baixo o atinge —, agarra tornozelos e é atraído pelo rangido das gavetas. *(smoke: luta real até a morte; golpe leve confirma 0 de dano)*
- **Área secreta — câmara fria do Morais**: só abre empurrando o fundo da **gaveta 13** depois de ler a pista do prontuário (condição real, não apenas proximidade). Recompensa: **2 bandagens** + a *Carta não enviada da Dra. Helena Arcos*. *(smoke + unit de navegação)*
- **Anotações**: objetivos opcionais (pistas da Ala Leste, chave, gaveta 13) numa segunda linha do HUD e no inventário, junto das portas trancadas já tentadas. *(unit)*
- **Chefe — O Cirurgião**: fases, golpes de bisturi em combo, agarrão (escapa martelando botões), investida que o atordoa ao bater em mesas/pilares; o avental absorve dano e o **frasco nas costas** é o ponto fraco (golpe forte de cima para baixo). Porta da sala tranca durante a luta; barra de vida própria. *(smoke: luta completa até a morte do chefe)*
- **Portão de serviço** liberado após o chefe → pátio → tela de fim de capítulo com estatísticas e gancho para o Capítulo 2 (placeholder).
- **Save versionado** (`localStorage`, chave `ocdc_save`, versão 1, com migração de v0): checkpoints automáticos (início, sala de máquinas, chegada ao subsolo, necrotério, antes do chefe, pátio) e livros de registro manuais. Morte → tela de morte → recarregar último registro. *(unit + smoke)*
- **Áudio** 100% sintetizado com Web Audio (passos, golpes, gemidos, portas, faíscas, elevador, ambiente e intensidade dinâmica de trilha), iniciado só após gesto do usuário.
- **HUD**: vida, fôlego, arma, objetivo atual, aviso de interação, dicas, vinheta de dano, barra do chefe.
- **Visual PS2**: render em baixa resolução com pixels nítidos, texturas procedurais em canvas, materiais Lambert, névoa, luzes piscando, energia de emergência.
- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`: testes → build → branch `gh-pages`).

### Sobre modelos e texturas

Não foram usados GLB/texturas de terceiros: **todo o visual é procedural** (geometria low‑poly montada em código, personagens com rig hierárquico animado por código, texturas desenhadas em `<canvas>`). Isso evita problemas de licença e mantém o build leve. Trocar por GLB rigados no futuro é possível sem mexer na lógica (os sistemas usam apenas a hierarquia de ossos do `ProceduralRig`).

## FALTA (para o Capítulo 1 completo, conforme o GDD)

- Modelos/animações artesanais (GLB rigados) e texturas pintadas — hoje tudo é procedural/placeholder estilizado.
- Áreas do GDD ainda ausentes no hospital: capela, ala cirúrgica superior/andares acima do térreo, lavanderia e o **forno** atrás do pátio (citado na carta da Dra. Helena); mais segredos.
- Armas além do machado (facão, martelo industrial, lança improvisada, arma de fogo antiga com munição escassa) e objetos ambientais.
- **Mapa** de áreas visitadas (tecla M). (As anotações de portas bloqueadas já existem no inventário.)
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
