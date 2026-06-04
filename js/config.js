/**
 * config.js — Configuração central do Space Weather Talks
 *
 * Edite este arquivo para:
 *  - Definir o endpoint do Google Apps Script (APPS_SCRIPT_URL)
 *  - Personalizar temas, horários e número de vagas
 *  - Ajustar informações do evento
 *
 * Enquanto APPS_SCRIPT_URL estiver vazio, o site opera em modo demo
 * (dados simulados), pronto para testes antes de configurar o backend.
 */

const CONFIG = {

  // ------------------------------------------------------------------
  // 1. ENDPOINT DO GOOGLE APPS SCRIPT
  //    Após implantar o Web App (ver README), cole a URL aqui.
  //    Exemplo: 'https://script.google.com/macros/s/AKfyc.../exec'
  // ------------------------------------------------------------------
  APPS_SCRIPT_URL: 'https://script.google.com/a/macros/inpe.br/s/AKfycbzh5PzLBzJQOfA7N408VI4DWTsfcEDzVir3aDDgvb8b_ZC66QWlsQWzIbZWwLhAaw6T/exec',

  // ------------------------------------------------------------------
  // 2. INFORMAÇÕES DO EVENTO
  // ------------------------------------------------------------------
  event: {
    name: 'SpaceBR Show 2026',
    location: 'Estande da AEB',
    locationDetail: 'Pavilhão Central – SpaceBR Show 2026',
    organization: 'EMBRACE-INPE',
    talkDuration: '15 minutos',
  },

  // ------------------------------------------------------------------
  // 3. TEMAS
  //    id         : identificador único (usado em URLs de QR code)
  //    name       : nome do tema
  //    question   : versão provocativa do tema (preferida para QR codes)
  //    emoji      : ícone visual
  //    description: texto curto exibido no card e no formulário
  // ------------------------------------------------------------------
  topics: [
    {
      id: 'tempestades-solares',
      name: 'Tempestades Solares',
      question: 'O Sol pode derrubar satélites?',
      emoji: '☀️',
      description:
        'Entenda como as erupções solares afetam a Terra e os sistemas tecnológicos.',
    },
    {
      id: 'gps-ionosfera',
      name: 'GPS e Ionosfera',
      question: 'Por que o GPS erra durante tempestades solares?',
      emoji: '📡',
      description:
        'Descubra como o clima espacial interfere no posicionamento e na navegação.',
    },
    {
      id: 'satellites',
      name: 'Satélites e Clima Espacial',
      question: 'Lançamentos espaciais dependem do clima espacial?',
      emoji: '🛰️',
      description:
        'Saiba como o ambiente espacial impacta a operação e a vida útil dos satélites.',
    },
    {
      id: 'gics',
      name: 'GICs e Redes Elétricas',
      question: 'O Brasil corre risco de GICs?',
      emoji: '⚡',
      description:
        'Correntes Induzidas Geomagneticamente podem afetar transformadores e redes de energia.',
    },
    {
      id: 'inteligencia-artificial',
      name: 'Inteligência Artificial',
      question: 'IA consegue prever tempestades geomagnéticas?',
      emoji: '🤖',
      description:
        'Como machine learning e IA estão revolucionando a previsão do clima espacial.',
    },
    {
      id: 'clima-brasil',
      name: 'Clima Espacial no Brasil',
      question: 'Por que a Anomalia Magnética do Atlântico Sul é importante?',
      emoji: '🇧🇷',
      description:
        'O Brasil ocupa uma posição única no globo para o estudo do clima espacial.',
    },
  ],

  // ------------------------------------------------------------------
  // 4. SESSÕES (grade fixa de horários)
  //    id      : identificador único (usado em QR codes de sessão)
  //    topicId : deve corresponder a um id da lista de topics acima
  //    time    : horário no formato 'HH:MM'
  //    day     : identificador do dia (ex.: 'Dia 1', 'Dia 2')
  //    spots   : capacidade total da sessão
  //
  //    Para gerar QR codes por sessão, use a URL:
  //    https://<seu-site>/?sessao=<id>
  //    Para QR codes por tema:
  //    https://<seu-site>/?tema=<topicId>
  // ------------------------------------------------------------------
  sessions: [
    // --- Dia 1 ---
    { id: 'session-1',  topicId: 'tempestades-solares',     time: '10:00', day: 'Dia 1', spots: 10 },
    { id: 'session-2',  topicId: 'gps-ionosfera',           time: '10:30', day: 'Dia 1', spots: 10 },
    { id: 'session-3',  topicId: 'satellites',              time: '11:00', day: 'Dia 1', spots: 10 },
    { id: 'session-4',  topicId: 'inteligencia-artificial', time: '11:30', day: 'Dia 1', spots: 10 },
    { id: 'session-5',  topicId: 'gics',                    time: '14:00', day: 'Dia 1', spots: 10 },
    { id: 'session-6',  topicId: 'clima-brasil',            time: '14:30', day: 'Dia 1', spots: 10 },
    { id: 'session-7',  topicId: 'tempestades-solares',     time: '15:00', day: 'Dia 1', spots: 10 },
    { id: 'session-8',  topicId: 'gps-ionosfera',           time: '15:30', day: 'Dia 1', spots: 10 },
    // --- Dia 2 ---
    { id: 'session-9',  topicId: 'satellites',              time: '10:00', day: 'Dia 2', spots: 10 },
    { id: 'session-10', topicId: 'tempestades-solares',     time: '10:30', day: 'Dia 2', spots: 10 },
    { id: 'session-11', topicId: 'gics',                    time: '11:00', day: 'Dia 2', spots: 10 },
    { id: 'session-12', topicId: 'inteligencia-artificial', time: '11:30', day: 'Dia 2', spots: 10 },
    { id: 'session-13', topicId: 'clima-brasil',            time: '14:00', day: 'Dia 2', spots: 10 },
    { id: 'session-14', topicId: 'gps-ionosfera',           time: '14:30', day: 'Dia 2', spots: 10 },
    { id: 'session-15', topicId: 'tempestades-solares',     time: '15:00', day: 'Dia 2', spots: 10 },
    { id: 'session-16', topicId: 'satellites',              time: '15:30', day: 'Dia 2', spots: 10 },
  ],
};
