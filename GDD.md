# O Culto das Cinzas

**Documento de visão e design do jogo (GDD) — projeto original em Three.js**  
**Status:** conceito e planejamento; funcionalidades descritas são metas, não recursos já implementados.  
**Plataforma inicial:** navegador desktop (teclado/mouse e gamepad), com publicação via GitHub Pages.  
**Gênero:** survival horror de ação em terceira pessoa, exploração, combate corpo a corpo e puzzles.  
**Inspiração de referência:** a atmosfera e a brutalidade de *Nightmare Creatures II*, combinadas com exploração interconectada, câmera sobre o ombro e sistemas modernos. **Não é um remake** e não reutilizará personagens, mapas, áudio, modelos ou recursos protegidos de outras franquias.

> **Pitch:** Em uma cidade industrial fictícia dos anos 1930, um sobrevivente de experimentos médicos escapa de um hospital e descobre uma organização que transforma pessoas em criaturas. Com armas improvisadas, ele deve atravessar bairros decadentes, instalações subterrâneas e locais de culto para descobrir sua identidade e interromper um ritual capaz de destruir a cidade.

---

## 1. Visão do projeto

Queremos um jogo de terror de ação em **Three.js**, jogável diretamente no navegador, com visual **PS2 low poly refinado**, direção artística sombria, personagens e monstros em GLB, animações expressivas, combates físicos e ambientes interconectados. O jogo deve funcionar de modo convincente **antes** de crescer em tamanho: priorizar qualidade de controles, câmera, colisões, combate, IA, carregamento e som sobre quantidade de conteúdo.

### Pilares de design

1. **Combate com peso:** cada golpe precisa ter alcance, risco, reação visível, impacto sonoro e possibilidade de contra-ataque.
2. **Terror de antecipação:** ruídos, pistas ambientais, iluminação e comportamento de inimigos criam medo sem depender apenas de sustos repentinos.
3. **Exploração que recompensa:** áreas interligadas, chaves, mecanismos, atalhos, segredos e documentos que acrescentam significado à história.
4. **Monstros reconhecíveis:** silhuetas, movimentos, sentidos, ataques e vulnerabilidades próprios — não apenas diferentes quantidades de vida.
5. **Jogabilidade responsiva:** câmera estável, movimentação precisa, animações que respeitam colisões, gamepads e opções de acessibilidade.
6. **Desempenho previsível:** streaming por setor, LOD, redução de draw calls e opções gráficas; evitar carregamentos e travamentos durante o combate.

### O que manter da inspiração

- Protagonista vulnerável, mas capaz de confrontar criaturas com armas corpo a corpo.
- Hospitais e instalações decadentes; ruas antigas, esgotos, catacumbas e arquiteturas góticas/industriais.
- Horror corporal estilizado; monstros de aparência perturbadora e ataques variados.
- Finalizações situacionais, armas especiais e um tom opressivo.
- Exploração vertical, ambientes com múltiplas rotas e segredos.

### O que melhorar deliberadamente

| Limitação comum em jogos clássicos do gênero | Nossa solução proposta |
| --- | --- |
| Golpes lentos ou pouco confiáveis | Entrada em buffer, janelas de cancelamento controladas e hitboxes sincronizadas com as animações |
| Câmera presa em paredes ou ângulos ruins | Câmera sobre o ombro com prevenção de oclusão e enquadramento adaptativo |
| Combate repetitivo | Defesa, esquiva, contra-ataque, agarrões, ataques em grupo e inimigos com padrões próprios |
| IA que parece enxergar através de paredes | Campo visual com oclusão, investigação de ruídos e memória temporária da última posição vista |
| Corredores que só exigem achar chaves | Áreas com atalhos, exploração vertical, puzzles, recursos e eventos que mudam o cenário |
| Sustos previsíveis | Ritmo alternado de silêncio, investigação, confronto, fuga e momentos seguros |
| Áudio e carregamento inconsistentes | Mixer com controle de vozes, pré-carregamento prioritário e transições de setor |
| Partida perdida por checkpoints ruins | Autosaves seguros, saves manuais e validação de progresso para evitar bloqueios |

---

## 2. Identidade e universo

### Título provisório

**O Culto das Cinzas**. Pode mudar sem afetar a arquitetura do jogo.

### Local, época e estética

**Véspera**, uma cidade fictícia de 1934 marcada pela fuligem das fábricas, pelos hospitais financiados por sociedades privadas e por uma antiga rede subterrânea. A cidade mistura bairros operários, bondes, pontes de ferro, necrotérios, instituições médicas, museus e edifícios de pedra. Chuva, névoa e iluminação elétrica instável são elementos visuais recorrentes.

Paleta narrativa: carvão, ferrugem, verde hospitalar gasto e âmbar de lâmpadas antigas. O contraste vem de sinais de alarme, brasas, maquinaria e pequenas áreas de iluminação acolhedora.

### História principal

**Elias Varga** desperta parcialmente enfaixado numa ala médica isolada, sem compreender por que seu corpo foi submetido a cirurgias e tratamentos experimentais. Ao fugir, percebe que os pacientes foram transformados em criaturas violentas. Registros clínicos apontam para a **Confraria do Véu**, responsável por experiências que misturam ciência, substâncias industriais e rituais.

Uma médica dissidente, **Dra. Helena Arcos**, deixa mensagens e materiais que ajudam o protagonista a reconstruir sua memória. O principal antagonista, **Dr. Silas Vernet**, pretende ativar uma estrutura de transmissão instalada numa torre industrial para completar um experimento em escala urbana.

A revelação central: Elias não foi apenas uma vítima aleatória. Ele foi escolhido por sobreviver a tratamentos que mataram ou transformaram outros pacientes. Sua resistência pode ser a chave para interromper o processo — mas não sem consequências.

### Tom narrativo

- Terror adulto, melancólico e misterioso; evitar humor involuntário e exposição excessiva.
- Narrativa ambiental: prontuários, fotografias, diários, máquinas, gravações e salas que contam o que aconteceu.
- Poucas cutscenes longas; eventos devem ocorrer sempre que possível dentro do cenário jogável.
- Final com consequência narrativa, sem substituir o clímax por um único botão cronometrado.
- Escrita, monstros, diálogos e música **originais**.

### Personagens principais

| Personagem | Papel |
| --- | --- |
| Elias Varga | Protagonista; sobrevivente de procedimentos experimentais e lutador improvisado |
| Dra. Helena Arcos | Médica dissidente; informa, orienta e nem sempre revela toda a verdade |
| Dr. Silas Vernet | Antagonista; cientista e liderança da Confraria |
| O Vigia | Perseguidor recorrente que obriga o jogador a mudar de rota e usar o cenário |
| Sobreviventes da cidade | Pequenos encontros opcionais; contam histórias e podem fornecer informações ou recursos |

---

## 3. Campanha e estrutura de fases

**Meta de campanha:** 8 capítulos conectados, aproximadamente 6–8 horas de jogo principal após balanceamento. Esse número é estimativa de design, não uma duração validada.

| Capítulo | Local | Jogabilidade e acontecimentos | Chefe / destaque |
| --- | --- | --- | --- |
| 1 — Despertar | Hospital São Dimas | Tutorial contextual, enfermarias, necrotério, ala de cirurgia, setores interligados e fuga | **O Cirurgião**: demonstra agarrões e pontos fracos |
| 2 — Fumaça | Bairro Operário | Ruas, depósitos, edifícios acessíveis, atalho pelo bonde, primeiros sobreviventes | Caçadores atraídos por ruídos e emboscadas |
| 3 — A Confraria | Sede e arquivos subterrâneos | Documentos, mecanismos, segurança antiga e investigação da organização | **O Sacristão**: ataques de área e invocação limitada |
| 4 — Cidade Morta | Centro antigo de Véspera | Praças, lojas, telhados, interiores, perseguição e mudanças no nível | **O Vigia**: primeiro confronto, não necessariamente definitivo |
| 5 — Águas Negras | Fábrica de bombeamento e canais | Água, passarelas, máquinas perigosas, energia e rotas verticais | **A Afogada**: criatura anfíbia e controle de território |
| 6 — O Acervo | Museu de Ciências Proibidas | Exposição, vitrines quebráveis, mecanismos, salas de conservação e puzzles | **O Colecionador**: usa partes do cenário contra o jogador |
| 7 — Sob a Pedra | Catacumbas e metrô antigo | Túneis, criptas, atalhos, acústica de perseguição e revelações | Retorno do Vigia com novas capacidades |
| 8 — A Última Chama | Complexo industrial e torre de transmissão | Escalada, sabotagem de máquinas, confrontos e decisão final | **Vernet / Manifestação**: chefe em fases com mecânicas aprendidas |

### Regras do desenho das fases

- **Interconexão:** sempre que fizer sentido, criar atalhos que liguem setores visitados e tornem o retorno interessante.
- **Legibilidade:** marcos visuais e sinalização física; evitar corredores visualmente indistinguíveis.
- **Portas reais:** portas abrem/fecham, respeitam colisão, ficam persistentes quando apropriado e podem levar a novas salas/setores sem teleportes confusos.
- **Mapas funcionais:** mapa de áreas já visitadas, objetivo atual discreto e anotações de portas bloqueadas; sem marcar todos os recursos automaticamente.
- **Puzzles contextualizados:** sistema elétrico, elevadores, canais, mecanismos, códigos e documentos — não apenas colecionar chaves coloridas.
- **Ritmo:** alternar encontros de combate, exploração, tensão, descoberta e descanso.
- **Evitar softlocks:** nenhuma chave, porta, elevador ou decisão de combate pode deixar o jogo sem caminho de progresso.

---

## 4. Personagem e movimentação

### Movimento principal

- Caminhar, correr, andar lentamente, virar, recuar, agachar, subir e descer escadas, saltar apenas em pontos apropriados, interagir e empurrar objetos específicos.
- Movimento relativo à câmera, com opção alternativa de direção clássica; controles **não** podem inverter ao atravessar portas ou mudar o enquadramento.
- Aceleração e desaceleração suaves sem sensação de atraso excessivo.
- Rotação controlada pelo estado: exploração, mira, defesa, ataque, agarrão e animações contextuais.
- **Root motion** apenas em movimentos que exigem sincronização precisa, com validação de colisão e deslocamento; para locomoção padrão, preferir controle por código com animação combinada.

### Máquina de estados do jogador

`idle → walk/run → dodge/block/attack/interact → hit/stagger/grab → recover → idle`

Estados de transição especiais: abrir porta, subir escada, finalização, morte, cutscene e pausa. Eventos devem impedir ações incompatíveis sem produzir personagem travado ou andando sozinho.

### Sistema de câmera

- Terceira pessoa sobre o ombro, inspirada no enquadramento de ação dos jogos da era PS2/PS3, sem reproduzir assets ou interface específica.
- Distância adaptável em corredores, com colisão/oclusão por *sphere cast* ou solução equivalente.
- Deslocamento lateral configurable, sensibilidade e inversão vertical opcionais.
- Ao mirar/combater, aproximação moderada com inimigo e arma legíveis.
- Em agarrões e finalizações, pequenas mudanças cinematográficas sem perder a orientação espacial.
- Camera shake leve e regulável; nunca esconder um ataque por movimento excessivo.
- FOV configurável e opção de câmera mais afastada.

---

## 5. Combate e armas

### Princípio

Todo ataque precisa de **sinalização visual**, *startup*, quadro ativo, recuperação e colisão validada. Uma animação bonita não substitui uma hitbox correta.

| Ação | Resultado esperado |
| --- | --- |
| Ataque rápido | Boa resposta, baixo custo, abre combos curtos |
| Ataque forte | Mais dano e desequilíbrio, maior consumo de resistência e recuperação |
| Defesa | Reduz ou anula dano de ataques bloqueáveis, à custa de resistência |
| Esquiva | Reposiciona; curta janela de invulnerabilidade definida e testada |
| Contra-ataque | Ativado por defesa precisa ou vulnerabilidade aberta; risco/recompensa claros |
| Empurrão / chute | Controla distância, pode interromper inimigos fracos |
| Agarrão de inimigo | Animação sincronizada e janela justa de reação; pode ser interrompido por cenário ou golpe aliado |
| Finalização | Ataque contextual contra alvo vulnerável; rápido, sem bloquear o fluxo do combate |
| Golpes em grupo | Arcos, empurrões e posicionamento permitem enfrentar mais de um oponente |
| Dano localizado | Pode alterar ataque/movimento da criatura quando tecnicamente viável; sem física cara em todos os inimigos |

### Armas propostas

| Arma | Identidade |
| --- | --- |
| Machado | Principal: médio alcance, golpes pesados e finalizações |
| Facão | Mais rápido, menor desequilíbrio no alvo |
| Martelo industrial | Rompe defesa, lento e pesado |
| Lança improvisada | Mantém distância, alcance longo e recuperação vulnerável |
| Arma de fogo antiga | Munição escassa, recurso de emergência; não transformar o projeto num shooter |
| Objetos ambientais | Garrafas, ferramentas e mecanismos disponíveis apenas em pontos específicos |

### Regras fundamentais

- O golpe só acerta quando a área da arma entra na área válida do alvo; não usar dano por proximidade genérica.
- Inimigos e jogador reagem a dano com animações, deslocamento pequeno e som sincronizado.
- Efeitos de sangue e desmembramento estilizado devem ter limites de partículas, opção de redução e respeito à performance.
- `hit stop` de alguns milissegundos é um efeito local de impacto, nunca uma pausa arbitrária que quebre áudio ou simulação.
- Combos curtos e fáceis de compreender; profundidade vem de defesa, distância, inimigos, ambiente e timing.
- Dificuldades sugeridas: **História**, **Normal** e **Pesadelo**; alterar agressividade/recursos, não apenas multiplicar vida de monstros.

---

## 6. Criaturas, chefes e inteligência artificial

**Meta de conteúdo completo:** 12–16 arquétipos de inimigos (incluindo variantes com comportamento real) e 5–6 confrontos especiais. **MVP:** somente quatro tipos de inimigo e um chefe, todos totalmente funcionais.

### Arquétipos de inimigos

| Arquétipo | Assinatura comportamental |
| --- | --- |
| Interno | Lento, perigoso em grupo, tenta agarrar |
| Rastejador | Usa o chão e áreas baixas; aproxima-se por ângulos incomuns |
| Tecelão | Atravessa áreas elevadas; embosca a partir do teto |
| Enfermeiro Corrompido | Alterna investida e golpes curtos |
| Carcereiro | Defende e usa ataques pesados |
| Farejador | Investiga som e última posição conhecida |
| Esfolado | Rápido, esquivas laterais e ataques em sequência |
| Gêmeos de Cinza | Atuam em dupla com papéis diferentes |
| Espectro Industrial | Usa fumaça/ambiente para confundir visão sem ser invisível de forma injusta |
| Portador | Explode ou libera área perigosa quando derrotado |
| Afogado | Usa água e passagens inundadas |
| Acólito | Inimigo humano ou semitransformado que utiliza ferramentas e alertas |
| Brutamontes | Derruba objetos, rompe portas específicas e telegráfa ataques devastadores |
| Vigia | Caçador recorrente que pode perseguir por setores definidos |

### Modelo de IA

Estados base: `idle`, `patrol`, `investigate`, `search`, `chase`, `attack`, `stagger`, `retreat`, `return`, `dead`.

- **Visão:** distância + ângulo + teste de oclusão; paredes e portas fechadas bloqueiam visão.
- **Audição:** eventos de ruído com intensidade, distância e obstáculos; andar e correr geram sinais diferentes.
- **Memória:** após perder contato, investigar a última posição detectada por um período limitado.
- **Navegação:** caminhos por *navmesh* ou rede de pontos conectados entre salas; nunca atravessar paredes.
- **Coordenação:** limitar simultaneamente os atacantes próximos e permitir flanqueamento, evitando enxame injusto.
- **Otimização:** IA distante usa atualização reduzida; áudio/percepção são resolvidos em intervalos, não com centenas de raycasts por frame.
- **Perseguição:** perseguidor especial deve ter regras claras de onde pode entrar, quebrar obstáculos e desistir.

### Chefes

Cada chefe deve avaliar uma habilidade aprendida: desviar de uma investida, identificar um ponto vulnerável, aproveitar cobertura, ativar máquinas ou manter distância. Chefes não devem depender apenas de barras de vida enormes; a arena e as fases do encontro precisam importar.

---

## 7. Exploração, puzzles e progressão

- Inventário compacto com itens essenciais, chaves, documentos e consumíveis.
- Recursos limitados, porém balanceados para permitir recuperação após erros.
- Armas podem ganhar técnicas ou pequenos melhoramentos; **sem árvore extensa de habilidades** na primeira versão.
- Interações com portas, gavetas, alavancas, painéis, elevadores, válvulas e objetos de puzzle.
- Sistemas do ambiente com estados persistentes: porta destrancada, energia ligada, ponte baixada, chefe vencido, documento coletado.
- Mapa acessível no menu, mostrando apenas áreas descobertas e pontos úteis que o jogador identificou.
- Documentos opcionais aprofundam o mundo; o objetivo principal deve permanecer compreensível mesmo sem ler todos.
- Áreas secretas trazem munição, medicamentos, pistas narrativas, melhorias ou rotas mais seguras.
- O jogador pode retornar a capítulos quando a narrativa permitir, mas não precisa visitar toda a cidade em mundo aberto.

### Progressão exemplo do hospital (vertical slice)

1. Elias acorda numa enfermaria e aprende a se mover, pegar objetos e examinar uma porta.
2. Um som atrás da parede indica o primeiro inimigo; o jogador encontra o machado e aprende ataque, defesa e esquiva.
3. A energia do corredor falha; é preciso restabelecê-la na sala de máquinas.
4. A sala de máquinas liga um elevador, mas também abre um setor que antes estava isolado.
5. O jogador encontra um documento que explica por que os pacientes foram mantidos em quarentena.
6. Uma criatura patrulha o setor e investiga barulho; é possível evitar ou enfrentar o encontro.
7. Um atalho conecta a ala cirúrgica à enfermaria inicial.
8. Encontro com O Cirurgião: chefe que usa agarrão, investida e obstáculos da sala.
9. Após derrotá-lo, é possível abrir o portão de serviço, salvar e sair para o bairro industrial.

**Duração desejada dessa fatia jogável:** aproximadamente 20–30 minutos depois de testada e balanceada.

---

## 8. Direção de arte e animação

### Visual

- Estética **PS2 low poly aprimorada**: proporções e silhuetas claras, geometria eficiente, boas texturas e materiais coerentes.
- Personagens e monstros em **GLB/glTF**, com rig correto, escala consistente e nomes de animação padronizados.
- Cenários modulares: paredes, portas, escadas, trilhos, tubulações, passarelas, móveis e objetos reaproveitáveis.
- Iluminação prioritariamente estática/pré-calculada, complementada por poucas luzes dinâmicas de alto impacto.
- Reflexos, sombras e pós-processamento opcionais conforme preset; névoa deve reforçar profundidade sem esconder falhas de carregamento.
- Sangue, poeira, fumaça, faíscas e chuva com instanciamento, pools e limites configuráveis.

### Convenções de assets

- Unidades em **metros** e eixo vertical coerente no pipeline; documentar orientação frontal.
- Malhas com UVs válidas, normais corretas, pivôs no lugar correto e escalas aplicadas no editor de origem.
- Esqueleto humanoide-base para personagens compatíveis; esqueletos específicos para criaturas não humanoides.
- Animações sugeridas: `Idle`, `Walk`, `Run`, `Turn`, `Attack_Light_1`, `Attack_Light_2`, `Attack_Heavy`, `Block`, `Dodge`, `Hit`, `Grab`, `Finisher`, `Death`, `Interact`.
- Importar modelos já animados sem apagar ossos/clipes existentes; retarget somente após validação do rig.
- Ajustar mãos, pés, armas e pontos de contato com IK ou offsets apropriados quando necessário.
- Criar LODs para objetos pesados; monstros próximos preservam expressividade e silhueta.
- Preparar texturas em resolução adequada, comprimir com KTX2/Basis quando viável e conservar uma alternativa quando necessário.

### Cuidados essenciais

- Nunca substituir um GLB por uma segunda malha sobreposta: **trocar a instância antiga** e liberar geometria/material quando sem uso.
- Evitar personagens girando no próprio eixo involuntariamente, pose T aparecendo, armas deslocadas e animações deslizando pelo chão.
- Usar caixas de colisão e hitboxes de gameplay independentes da malha renderizada; atualizá-las com os ossos quando exigido.

---

## 9. Som, música e atmosfera

- Ambiência multicanal: vento, equipamentos, goteiras, metal, passos, ruídos de criaturas e distâncias.
- Sons por material (metal, pedra, madeira, carne/armadura estilizada) e superfícies percorridas.
- Música dinâmica de acordo com o estado da cena: exploração, suspeita, perseguição, combate e chefe.
- Priorizar leitura de gameplay: o som de ataque perigoso ou criatura próxima não pode ser mascarado por música alta.
- Mixer com volume separado para **Música**, **Efeitos**, **Vozes** e **Ambiente**.
- Áudio posicional para eventos no mundo, com limites de vozes simultâneas e reutilização controlada de recursos.
- Autoplay apenas após interação do usuário, conforme exigências do navegador.
- Pausar/resumir contextos e sons corretamente; nenhum zumbido contínuo ou áudio acelerado ao retornar do menu.
- Música e efeitos **originais ou com licença compatível**, nunca extraídos de outros jogos.

---

## 10. Interface, controles e acessibilidade

### HUD

HUD discreto durante a exploração: saúde, resistência, arma equipada e munição quando aplicável. Indicadores contextuais aparecem somente quando necessários. Evitar instruções, ícones e marcadores soltos por toda a tela.

### Controles padrão (reconfiguráveis)

| Ação | Teclado/mouse | Gamepad (padrão sugerido) |
| --- | --- | --- |
| Mover | WASD | Analógico esquerdo |
| Câmera | Mouse | Analógico direito |
| Ataque rápido | Botão esquerdo | RB / R1 |
| Ataque forte | Botão direito | RT / R2 |
| Defesa / mira defensiva | Q | LT / L2 |
| Esquiva | Espaço | B / Círculo |
| Interagir | E | A / Cruz |
| Correr | Shift | Clique no analógico esquerdo |
| Inventário | Tab | Y / Triângulo |
| Mapa | M | Botão de visualização / touchpad compatível |
| Pausa | Esc | Menu / Options |

> **Nota:** estes são controles iniciais propostos; oferecer remapeamento de teclas e botões no menu de opções.

### Opções de acessibilidade

- Sensibilidade de câmera, inversão Y e distância da câmera.
- Reconfiguração de teclas/botões; suporte a controles PC, Xbox, PlayStation e outros via **Gamepad API**, respeitando diferenças de mapeamento.
- Legendas, tamanho de texto e indicadores de ataque opcionais.
- Redução de tremor de câmera, flashes e intensidade de sangue.
- Presets de dificuldade e velocidade de apontamento/câmera.
- Alto contraste para itens interativos quando ativado.
- Mobile fica fora do escopo do primeiro protótipo; versão com touch deve ser planejada **após** estabilidade no desktop.

---

## 11. Arquitetura técnica — Three.js

### Stack proposta

| Componente | Tecnologia / estratégia |
| --- | --- |
| Renderização | **Three.js** + `WebGLRenderer` |
| Build e desenvolvimento | **Vite** com JavaScript ES Modules (TypeScript é opção para evolução) |
| Modelos, cenas e animações | **glTF/GLB**, `GLTFLoader`, `AnimationMixer` e animações por estado |
| Física de mundo | **Rapier 3D** (candidata) ou sistema híbrido com colisores simples; confirmar após protótipo |
| Navegação de IA | Navmesh pré-processado ou grafo navegável por setor |
| Interface | HTML/CSS sobre canvas Three.js; módulos de HUD/menu desacoplados |
| Áudio | Web Audio API / Three.js Audio, com gerenciador de áudio central |
| Persistência | `localStorage` para opções; **IndexedDB** para saves maiores/estruturados |
| Testes | Vitest para lógica e Playwright para fluxos jogáveis no browser |
| Hospedagem | GitHub Pages; build estático em `dist/` |
| Assets | Blender / ferramentas de modelagem, Meshy para rascunhos permitidos, revisão manual e exportação GLB |

Não introduzir bibliotecas extras se o próprio Three.js e um módulo pequeno resolverem o caso. Fixar versões por `package-lock.json` e atualizar com testes.

### Estrutura inicial do repositório

```text
O-Culto-das-Cinzas/
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── assets/
│       ├── models/
│       │   ├── characters/
│       │   ├── enemies/
│       │   ├── environments/
│       │   └── props/
│       ├── textures/
│       ├── audio/
│       │   ├── ambient/
│       │   ├── sfx/
│       │   └── music/
│       ├── ui/
│       └── data/
├── src/
│   ├── main.js
│   ├── core/
│   │   ├── Game.js
│   │   ├── GameLoop.js
│   │   ├── AssetManager.js
│   │   ├── SceneManager.js
│   │   ├── InputManager.js
│   │   ├── AudioManager.js
│   │   ├── SaveManager.js
│   │   └── Settings.js
│   ├── world/
│   │   ├── WorldStreamer.js
│   │   ├── CollisionWorld.js
│   │   ├── Doors.js
│   │   ├── Interactables.js
│   │   ├── Navigation.js
│   │   └── Lighting.js
│   ├── gameplay/
│   │   ├── PlayerController.js
│   │   ├── CameraController.js
│   │   ├── CombatSystem.js
│   │   ├── HitboxSystem.js
│   │   ├── Inventory.js
│   │   ├── QuestSystem.js
│   │   ├── CheckpointSystem.js
│   │   └── AnimationStateMachine.js
│   ├── ai/
│   │   ├── EnemyController.js
│   │   ├── PerceptionSystem.js
│   │   ├── EnemyDirector.js
│   │   └── behaviors/
│   ├── ui/
│   │   ├── HUD.js
│   │   ├── MainMenu.js
│   │   ├── PauseMenu.js
│   │   ├── SettingsMenu.js
│   │   └── MapScreen.js
│   ├── scenes/
│   │   └── hospital/
│   ├── data/
│   │   ├── weapons.js
│   │   ├── enemies.js
│   │   └── chapters.js
│   └── styles/
│       └── main.css
└── tests/
    ├── unit/
    └── e2e/
```

Esta árvore é uma **proposta de organização**; não significa que esses arquivos existam.

### Regras de engenharia

1. Separar simulação, renderização, entrada, áudio e UI. Não colocar o jogo inteiro em um único `index.html`.
2. Loop com `delta time` limitado e passo fixo para a simulação física; interpolar renderização quando adequado.
3. **Pausa real:** congelar IA, física, timers, dano, animações de gameplay e áudio pertinente; manter somente a UI do menu ativa.
4. Sistemas de estado com transições explícitas; nenhuma interação deve deixar controles presos ou o jogador movendo sozinho.
5. Portas, colisões e triggers precisam validar a posição do jogador antes de mudar de setor.
6. Carregar assets sob demanda; pré-carregar conteúdo essencial e compilar shaders prioritários antes de permitir interação.
7. Nunca fazer carregamento pesado síncrono dentro do loop de renderização.
8. Eventos de gameplay desacoplados: exemplo `EnemyDied`, `DoorUnlocked`, `QuestStepCompleted`, `CheckpointReached`.
9. Configurar qualidade gráfica sem recarregar a página quando possível.
10. Erros de asset devem produzir fallback e mensagem de diagnóstico; evitar tela preta silenciosa.
11. Respeitar acessibilidade, contexto de áudio e perda/retorno de foco da aba.
12. Não depender de servidor próprio para o jogo single-player funcionar no GitHub Pages.

---

## 12. Desempenho e carregamento

### Metas a validar em hardware real

- **Desktop:** objetivo de 60 FPS em 1080p com qualidade ajustável. Não prometer o resultado sem medir.
- **Máquinas modestas:** preset baixo com resolução interna reduzida, sombras simplificadas e menos efeitos.
- **Mobile (fase futura):** objetivo próprio de 30 FPS em dispositivos selecionados, com interface adaptada.

### Estratégias

- **Streaming por setores:** deixar hospital, ruas e subterrâneos em grupos; carregar o próximo setor antes da porta ou elevador e descarregar o anterior quando seguro.
- **LOD:** modelos simplificados à distância; não aumentar a qualidade de algo fora da câmera.
- **Frustum culling e occlusion pragmática:** evitar renderizar objetos invisíveis e interiores não conectados ao setor ativo.
- **InstancedMesh:** objetos repetidos como grades, lâmpadas, tubos e outros elementos similares.
- **KTX2/compressão:** reduzir memória de texturas; analisar materiais e tamanho de GLBs.
- **Pools:** reutilizar partículas, projéteis, decals e componentes temporários.
- **Pré-aquecimento:** preparar shaders/materiais e animações prioritários durante tela de carregamento, sem simular o jogo no menu.
- **Limites de IA e som:** atualizar percepção distante menos vezes e estabelecer máximo de vozes audíveis.
- **Métricas:** registrar FPS, tempo de frame, draw calls, triângulos, consumo aproximado de recursos e tempo de carregamento.

### Qualidade gráfica

| Perfil | Ajustes propostos |
| --- | --- |
| Baixo | Pixel ratio limitado, sombras mínimas, efeitos reduzidos e LOD agressivo |
| Médio | Sombras moderadas, partículas balanceadas e materiais completos |
| Alto | Melhor resolução de sombras, distância visual e pós-processamento moderado |
| Personalizado | Ajustes individuais, incluindo render scale, sombras, FXAA/SMAA quando compatíveis e intensidade de efeitos |

> **Antisserrilhamento:** MSAA pode ser usado em configurações compatíveis; alternativas como FXAA ou SMAA podem ser mais viáveis com certos pipelines de pós-processamento. A escolha deve ser testada no navegador, não presumida.

---

## 13. Salvamento e estabilidade

### Saves

- Autosave antes/depois de encontros críticos e em salas seguras.
- Save manual em locais definidos ou menu, conforme dificuldade.
- Dados persistidos: capítulo, setor, posição segura, inventário, vida, recursos, portas, puzzles, inimigos especiais, progresso narrativo e opções relevantes.
- **Versionamento de saves** para futuras atualizações; não salvar referências diretas a objetos Three.js.
- Confirmar que spawn e setor existem antes de carregar; fallback para último checkpoint válido.
- Exportação/importação manual de save em arquivo pode entrar após o MVP.

### Estabilidade

- Ao trocar de aba, tratar `visibilitychange`: pausar ou reduzir simulação para evitar salto de delta e áudio dessincronizado.
- Gamepad desconectado não causa personagem andando sozinho; limpar entradas e permitir teclado imediatamente.
- Tratar `webglcontextlost`/retorno quando viável, exibindo mensagem em caso de falha.
- Não reproduzir efeito de sangue, luz ou som indefinidamente depois da morte do objeto.
- Restaurar menu, cursor e pointer lock adequadamente após pausa, morte e carregamento.

---

## 14. Publicação no GitHub Pages

O projeto deve funcionar em um endereço no formato:

`https://SEU-USUARIO.github.io/O-Culto-das-Cinzas/`

### Requisitos

1. Repositório GitHub com `index.html`, `src/`, `public/` e configuração Vite.
2. No `vite.config.js`, configurar `base: './'` **ou** base correspondente ao nome real do repositório.
3. Referenciar assets públicos usando `import.meta.env.BASE_URL` (ex.: `${import.meta.env.BASE_URL}assets/models/...`) para evitar erros 404 em subpastas no Pages.
4. Testar localmente com `npm install`, `npm run dev`, `npm run build` e `npm run preview`.
5. Publicar o conteúdo da pasta `dist/` usando GitHub Actions para Pages.
6. Em **Settings → Pages**, selecionar publicação por **GitHub Actions** e verificar o deploy após cada push na branch principal.
7. Não incluir arquivos de ROM, trilhas ou modelos de jogos comerciais; somente conteúdo criado ou licenciado.

### Exemplo de workflow `.github/workflows/deploy.yml`

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

Este workflow é uma referência; exige que `package.json`/`package-lock.json` e o build Vite existam antes de funcionar. O **README sozinho não é um jogo executável**.

---

## 15. Plano de desenvolvimento por entregas

### Marco 0 — Fundação técnica

- [ ] Inicializar Vite + Three.js, servidor local e build estático.
- [ ] Criar menu inicial, tela de carregamento, opções e pausa.
- [ ] Implantar cena-teste e publicar primeiro build no GitHub Pages.
- [ ] Medir FPS, draw calls, console e carregamento.

**Aceite:** cena abre pelo Pages, redimensiona corretamente, não apresenta 404 e permite pausar/retomar sem movimentação fantasma.

### Marco 1 — Controle, câmera e animação

- [ ] Importar protagonista GLB com rig e animações preservados.
- [ ] Implementar locomoção completa e colisão em cenário-teste.
- [ ] Implementar câmera sobre o ombro com oclusão de paredes.
- [ ] Corrigir viradas, deslocamento de pés e transições de animação.
- [ ] Adicionar Gamepad API e remapeamento básico.

**Aceite:** personagem se movimenta sem atravessar paredes, andar sozinho ou mostrar animação incorreta; câmera continua utilizável em corredores.

### Marco 2 — Combate vertical

- [ ] Machado com ataque rápido/pesado e hitboxes verificadas.
- [ ] Defesa, esquiva, reação a dano, morte e finalização contextual.
- [ ] Dois inimigos com patrulha, perseguição e ataques distintos.
- [ ] Feedback de impacto, efeitos e mixagem de áudio.
- [ ] Indicadores temporários para depuração de hitboxes e estados.

**Aceite:** é possível vencer ou perder confrontos de maneira consistente, sem dano fora da área de golpe ou inimigos atravessando obstáculos.

### Marco 3 — Hospital jogável (MVP)

- [ ] Construir enfermaria, corredor, sala de máquinas, ala cirúrgica, necrotério e saída.
- [ ] Implementar portas, chaves, alavancas, energia, elevador e atalhos.
- [ ] Introduzir quatro arquétipos de inimigo e o chefe O Cirurgião.
- [ ] Implementar inventário, mapa simples, checkpoint e save.
- [ ] Adicionar documentos, eventos ambientais e música dinâmica.
- [ ] Testar roteiro completo da fase do início ao fim.

**Aceite:** jogo de 20–30 minutos, com início, objetivo claro, chefe e saída; reiniciar/continuar preserva estado correto.

### Marco 4 — Qualidade e otimização

- [ ] LOD e descarregamento por setor.
- [ ] Pré-carregamento de animações, GLBs e shaders prioritários.
- [ ] Ajustes gráficos baixo/médio/alto e interface mais profissional.
- [ ] Testar longa sessão, troca de abas, múltiplos gamepads e saves antigos.
- [ ] Corrigir falhas reproduzidas de câmera, colisão, som, IA e performance.

**Aceite:** fase completa estável em navegadores desktop-alvo, sem erros importantes no console ou travadas prolongadas no surgimento de assets.

### Marco 5 — Campanha completa

- [ ] Produzir capítulos 2 a 8 com integração ao núcleo já testado.
- [ ] Expandir arsenal, elenco de inimigos, chefes e histórias ambientais.
- [ ] Balancear dificuldades, recursos, saves e ritmo de exploração.
- [ ] Revisar narrativa e finalizar cenas, trilha, finais e créditos.
- [ ] Fazer QA completo até os créditos, não apenas testes do começo do jogo.

**Aceite:** campanha terminável, objetivos sem bloqueio, save consistente entre capítulos e medição real de desempenho.

### Marco 6 — Expansões opcionais (apenas após o jogo estar sólido)

- [ ] Versão mobile com controles por toque e presets específicos.
- [ ] Novos modos/desafios, extras desbloqueáveis e conquistas locais.
- [ ] Tradução para outros idiomas.
- [ ] Conteúdos adicionais que não comprometam o núcleo.

---

## 16. Testes, auditoria e critérios de qualidade

### Checklist de QA repetido a cada versão

- [ ] O jogo abre no GitHub Pages sem arquivos ausentes ou tela preta.
- [ ] Toda porta abre quando permitido, fecha corretamente e respeita colisão.
- [ ] Nenhum cenário importante tem objetos flutuando, mal orientados ou fora do chão.
- [ ] O personagem não anda sozinho, atravessa paredes ou perde controles ao pausar.
- [ ] Armas, mãos e hitboxes estão alinhadas em todas as animações.
- [ ] IA não enxerga através de paredes fechadas e não fica travada em quinas comuns.
- [ ] Grupos de inimigos mantêm ataques justos e performance aceitável.
- [ ] Matar inimigos e mudar de setor não deixa sons, corpos ou timers vazando indefinidamente.
- [ ] Mapa, objetivos, puzzles e checkpoint persistem após carregar save.
- [ ] Áudio mantém velocidade normal e não produz zumbidos ao retomar ou alternar abas.
- [ ] Controles teclado/mouse e gamepads mapeiam corretamente; desconexão é segura.
- [ ] Build de produção funciona com caminhos relativos e sem dependências de servidor.
- [ ] A campanha/fase testada pode ser concluída até o final sem intervenção do desenvolvedor.

### Testes automatizados sugeridos

- **Vitest:** inventário, máquina de estados, cálculo de dano, checkpoints, save migrations, portas/objetivos.
- **Playwright:** abrir menu, iniciar jogo, pausar, retomar, abrir mapa, salvar/carregar e completar fluxo de tutorial com controles simulados.
- **Smoke test de produção:** carregar `dist/` por HTTP e validar pedidos de GLB/texturas/sons e exceções de console.
- **Perfil de performance:** cenas carregadas, grupo de inimigos e troca entre setores.

Em cada revisão, documentar **o que foi alterado**, **o que foi testado de verdade**, **problemas pendentes** e **resultado do build publicado**. Nunca chamar um sistema de funcional apenas por existir código não executado.

---

## 17. Regras de escopo e prioridades

### Prioridade absoluta

**Controle → câmera → colisão → animações → combate → IA → fase completa → otimização → expansão.**

Não acrescentar dezenas de inimigos, dezenas de mapas ou funções decorativas enquanto os controles, a câmera ou a fase do hospital ainda estiverem quebrados.

### Fora do primeiro MVP

- Mundo aberto inteiro e navegação livre por toda a cidade.
- Multiplayer online, servidores e contas.
- Crafting complexo, construção de bases ou veículos dirigíveis.
- Sistema de progressão com centenas de upgrades.
- Mobile com interface definitiva antes de estabilizar desktop.
- Gráficos hiper-realistas que inviabilizem execução em navegador.

### Critérios para aprovar uma melhoria

Uma funcionalidade entra quando melhora pelo menos um destes pontos: **tensão**, **clareza**, **impacto do combate**, **liberdade de exploração**, **estabilidade** ou **desempenho**. Cada alteração deve vir com critério verificável, e não apenas uma descrição estética.

---

## 18. Propriedade intelectual e publicação

Este é um **jogo original**, inspirado em qualidades gerais do gênero e de obras clássicas. Não copiar nomes, monstros, protagonista, mapas, diálogos, modelos 3D, texturas, músicas, efeitos sonoros, logos ou código de jogos comerciais.

Qualquer contribuição externa deve registrar sua licença e origem. Manter créditos de bibliotecas, fontes, assets e faixas com licenças compatíveis. Definir uma licença para o **código** e políticas claras para **assets** antes de aceitar contribuições externas ou abrir o projeto publicamente.

---

## 19. Próximo passo prático

**Primeira tarefa de implementação:** criar o repositório e uma **sala jogável de hospital** em Three.js com:

1. menu e carregamento reais;
2. personagem GLB que caminha, corre e gira corretamente;
3. câmera sobre o ombro sem atravessar paredes;
4. colisões de chão, paredes e uma porta interativa;
5. um inimigo simples que patrulha, ouve/avalia visão, persegue e recebe dano;
6. golpe de machado com animação e hitbox sincronizadas;
7. pausa completa, áudio básico e indicador de desempenho;
8. build estático funcional no GitHub Pages.

Quando essa sala estiver funcionando e testada, expandir até completar o **Capítulo 1 — Hospital São Dimas**. Só depois iniciar a cidade e os capítulos seguintes.

---

**Resumo da proposta:** *O Culto das Cinzas* será um survival horror original em Three.js com combate corpo a corpo brutal e responsivo, monstros inteligentes, atmosfera perturbadora, cenários interligados, estética PS2 refinada, excelente câmera e uma campanha completa. O desenvolvimento será incremental, com uma fase validada de cada vez e publicação contínua no GitHub Pages.
