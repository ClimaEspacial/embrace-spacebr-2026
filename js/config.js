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
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz04y3_F3B03sQAc02RBfBCTfs5yUuHF0o1KsAVoSdoQ8Oy5aSJxSEFs76E-Ikv9syO/exec',

  // ------------------------------------------------------------------
  // 2. INFORMAÇÕES DO EVENTO
  // ------------------------------------------------------------------
  event: {
    name: 'SpaceBR Show 2026',
    location: 'Estande da AEB',
    locationDetail: 'Pavilhão Central – SpaceBR Show 2026',
    organization: 'EMBRACE-INPE',
    talkDuration: '30 minutos',
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
      id: 'lancamentos-foguetes',
      name: 'Monitoramento de clima espacial durante lançamentos de foguetes',
      question: 'Como o clima espacial é monitorado durante lançamentos de foguetes?',
      emoji: '🚀',
      description:
        'Entenda como condições de clima espacial são acompanhadas para apoiar operações de lançamento.',
    },
    {
      id: 'aviacao-eventos-extremos',
      name: 'Os perigos causados à aviação durante eventos extremos de clima espacial',
      question: 'Eventos extremos de clima espacial podem afetar a aviação?',
      emoji: '✈️',
      description:
        'Saiba como eventos extremos podem impactar rotas, comunicações e segurança na aviação.',
    },
    {
      id: 'gics-rede-eletrica',
      name: 'Quando o Sol ameaça a rede elétrica: entendendo as Correntes Geomagneticamente Induzidas (GICs)',
      question: 'Como o Sol pode afetar a rede elétrica por meio das GICs?',
      emoji: '⚡',
      description:
        'Veja como correntes geomagneticamente induzidas podem afetar transformadores e sistemas de energia.',
    },
    {
      id: 'gps-drones-agricultura',
      name: 'Do espaço para o campo: como o clima espacial afeta GPS, drones e agricultura de precisão',
      question: 'O clima espacial pode afetar GPS, drones e agricultura de precisão?',
      emoji: '🌾',
      description:
        'Descubra como perturbações no ambiente espacial impactam posicionamento, drones e operações no campo.',
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
    { id: 'session-1', topicId: 'lancamentos-foguetes',    time: '10:30', day: '16/06', spots: 15 },
    { id: 'session-2', topicId: 'aviacao-eventos-extremos', time: '14:30', day: '16/06', spots: 15 },
    { id: 'session-3', topicId: 'gics-rede-eletrica',       time: '10:30', day: '17/06', spots: 15 },
    { id: 'session-4', topicId: 'gps-drones-agricultura',   time: '14:30', day: '17/06', spots: 15 },
  ],
};
