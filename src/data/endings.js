// Capítulo 8 — os três finais da decisão diante da lâmpada da Primeira Cinza (dados puros, testáveis).
export const C8_ENDINGS = {
  guardiao: {
    title: 'O Guardião',
    choice: 'Elias segurou a chama.',
    text: 'A brasa atravessou o vidro e assentou no peito de Elias, morna, onde devia estar o coração. As bobinas apagaram; a transmissão das onze e cinquenta e nove não saiu. Inês desceu a torre segurando a mão do irmão — fria, e firme.',
  },
  herdeira: {
    title: 'A Herdeira',
    choice: 'Helena levou a chama.',
    text: 'Helena Arcos fechou a lâmpada na maleta de chumbo e desceu a torre sem olhar para trás. Véspera dormiu em silêncio naquela noite. Inês e Elias saíram pelo pátio de carvão com o dia nascendo — livres, e sem saber para onde a maleta foi.',
  },
  cinzas: {
    title: 'Cinzas ao Vento',
    choice: 'Elias quebrou a lâmpada.',
    text: 'O vidro estourou e a Primeira Cinza saiu pelos janelões como fuligem comum, fraca, sem dono, sobre os telhados de Véspera. Ninguém a ouviu. Inês abraçou o irmão no alto da torre — e não conseguiu dizer o nome dele. A voz foi junto com a chama.',
  },
};
export const C8_ENDING_IDS = Object.keys(C8_ENDINGS);

/** epílogo: texto do final + ecos dos documentos lidos e das escolhas do caminho */
export function endingEpilogue(id, { docs = [], flags = {} } = {}) {
  const E = C8_ENDINGS[id];
  if (!E) return null;
  const lines = [E.text];
  const readDiary = docs.includes('diario_helena');
  if (id === 'herdeira') lines.push(readDiary
    ? 'Na última página do diário de Helena havia uma lista em branco com um título só: "Protocolo II". Você leu antes de entregar a chama.'
    : 'Meses depois, uma carta sem remetente chega à pensão de Inês: "Obrigada pela confiança. — H."');
  if (id === 'guardiao') lines.push(readDiary
    ? 'Helena escreveu que o número zero "segura sem queimar". Ela tinha razão. Ela quase sempre tem.'
    : 'Às vezes, no escuro, Elias ouve a cinza respirar junto com ele.');
  if (id === 'cinzas') lines.push(flags.c8_readRelatorio
    ? 'O relatório de transmissão dizia que a porta precisava de uma voz. Agora não há porta — nem voz.'
    : 'Inês aprende a escrever rápido. No primeiro bilhete, só: "Valeu a pena."');
  return { id, title: E.title, choice: E.choice, lines };
}

export const CREDITS = [
  ['O Culto das Cinzas', 'um survival horror em Three.js'],
  ['Criação, roteiro e direção', 'luispauloalves500'],
  ['Motor e ferramentas', 'Three.js · Vite · JavaScript (licença MIT)'],
  ['Visual', 'cenários, personagens e criaturas procedurais'],
  ['Som', 'efeitos e trilha sintetizados em tempo real (WebAudio)'],
  ['Protagonista', 'Elias — modelo GLB REV6 com machado'],
  ['Elenco', 'Elias · Inês · Dra. Helena Arcos · Dr. Silas Vernet · a Primeira Cinza'],
  ['Obrigado por jogar', 'Véspera dorme. Por enquanto.'],
];
