/**
 * Code.gs — Google Apps Script para Space Weather Talks
 * AEB · SpaceBR Show 2026
 *
 * Funcionalidades:
 *  - doGet()  → retorna disponibilidade de vagas por sessão
 *  - doPost() → registra inscrição de visitante
 *
 * Setup:
 *  1. Crie uma nova planilha no Google Sheets e copie o ID da URL.
 *  2. No Apps Script, cole este código e defina SPREADSHEET_ID abaixo.
 *  3. Execute setupSpreadsheet() UMA VEZ para criar as abas e pré-carregar as sessões.
 *  4. Implante como Web App: Execute como → Eu | Quem tem acesso → Qualquer pessoa.
 *  5. Cole a URL gerada em js/config.js → CONFIG.APPS_SCRIPT_URL.
 *
 * Ver README.md para instruções detalhadas.
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — edite antes de executar setupSpreadsheet()
// ─────────────────────────────────────────────────────────────

/** ID da planilha (encontre na URL: /spreadsheets/d/<ID>/edit) */
const SPREADSHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI';

/** Nomes das abas */
const SHEET_REGISTRATIONS = 'Inscrições';
const SHEET_SESSIONS      = 'Sessões';

// ─────────────────────────────────────────────────────────────
// HANDLERS HTTP
// ─────────────────────────────────────────────────────────────

/**
 * GET ?action=availability → { success, availability: { sessionId: vagasLivres } }
 * GET ?action=sessions     → { success, sessions: [...] }
 */
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';

    if (action === 'availability') {
      const availability = getAvailability();
      return jsonResponse({ success: true, availability });
    }

    if (action === 'sessions') {
      const sessions = getSessionsFromSheet();
      return jsonResponse({ success: true, sessions });
    }

    return jsonResponse({ success: false, error: 'Ação não reconhecida. Use ?action=availability.' });
  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return jsonResponse({ success: false, error: 'Erro interno: ' + err.message });
  }
}

/**
 * POST body (JSON string com Content-Type: text/plain):
 *   { action: 'register', sessionId, name, email, institution, interests }
 * → { success, message } | { success: false, error }
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Corpo da requisição vazio.' });
    }

    const payload = JSON.parse(e.postData.contents);

    if (payload.action === 'register') {
      const result = registerVisitor(payload);
      return jsonResponse(result);
    }

    return jsonResponse({ success: false, error: 'Ação não reconhecida.' });
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return jsonResponse({ success: false, error: 'Dados inválidos: ' + err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// LÓGICA DE NEGÓCIO
// ─────────────────────────────────────────────────────────────

/**
 * Retorna um objeto { sessionId: vagasDisponíveis } para todas as sessões.
 */
function getAvailability() {
  const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet  = ss.getSheetByName(SHEET_REGISTRATIONS);
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);

  if (!regSheet || !sessSheet) {
    throw new Error('Abas não encontradas. Execute setupSpreadsheet() primeiro.');
  }

  // Conta inscrições por sessão
  const regData   = regSheet.getDataRange().getValues();
  const counts    = {};
  for (let i = 1; i < regData.length; i++) {
    const sessionId = regData[i][1]; // Coluna B
    if (sessionId) counts[sessionId] = (counts[sessionId] || 0) + 1;
  }

  // Subtrai da capacidade máxima de cada sessão
  const sessData     = sessSheet.getDataRange().getValues();
  const availability = {};
  for (let i = 1; i < sessData.length; i++) {
    const sessionId = sessData[i][0]; // Coluna A: ID
    const capacity  = Number(sessData[i][5]) || 10; // Coluna F: Vagas
    const registered = counts[sessionId] || 0;
    availability[sessionId] = Math.max(0, capacity - registered);
  }

  return availability;
}

/**
 * Retorna a lista de sessões cadastradas na planilha.
 */
function getSessionsFromSheet() {
  const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessSheet) throw new Error('Aba Sessões não encontrada.');

  const data     = sessSheet.getDataRange().getValues();
  const sessions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // pula linhas vazias
    sessions.push({
      id:      row[0],
      topicId: row[1],
      time:    row[2],
      day:     row[3],
      name:    row[4],
      spots:   Number(row[5]) || 10,
    });
  }

  return sessions;
}

/**
 * Registra um visitante na planilha após validações.
 * @param {Object} payload - Dados do formulário.
 * @returns {{ success: boolean, message?: string, error?: string }}
 */
function registerVisitor(payload) {
  const { sessionId, name, institution, email, interests } = payload;

  // Validação de campos obrigatórios
  if (!sessionId || !name || !email) {
    return { success: false, error: 'Campos obrigatórios ausentes (sessionId, name, email).' };
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Endereço de email inválido.' };
  }

  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  if (!regSheet) return { success: false, error: 'Aba de inscrições não encontrada.' };

  // Verifica disponibilidade de vagas
  const availability = getAvailability();
  if (!(sessionId in availability)) {
    return { success: false, error: 'Sessão não encontrada.' };
  }
  if (availability[sessionId] <= 0) {
    return { success: false, error: 'Desculpe, não há mais vagas disponíveis nesta sessão.' };
  }

  // Verifica inscrição duplicada (mesmo email + mesma sessão)
  const regData = regSheet.getDataRange().getValues();
  for (let i = 1; i < regData.length; i++) {
    if (
      String(regData[i][2]).toLowerCase() === email.toLowerCase() &&
      regData[i][1] === sessionId
    ) {
      return { success: false, error: 'Este email já está inscrito nesta sessão.' };
    }
  }

  // Grava a inscrição
  const timestamp     = new Date().toISOString();
  const interestsStr  = Array.isArray(interests) ? interests.join(', ') : String(interests || '');

  regSheet.appendRow([
    timestamp,         // A: Timestamp
    sessionId,         // B: Session ID
    email,             // C: Email
    name,              // D: Nome
    institution || '', // E: Instituição
    interestsStr,      // F: Interesses
  ]);
  const sessionInfo = getSessionDetails(sessionId);
  if (sessionInfo) {
    try {
      sendConfirmationEmail(email, name, sessionInfo);
    } catch (err) {
      Logger.log('Erro ao enviar email de confirmação: ' + err.message);
    }
  }

  Logger.log('Inscrição registrada: ' + email + ' → ' + sessionId);
  return { success: true, message: 'Inscrição realizada com sucesso!' };
}

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────
// SETUP INICIAL DA PLANILHA
// Execute esta função UMA VEZ pelo Editor de Apps Script:
// menu Executar → setupSpreadsheet
// ─────────────────────────────────────────────────────────────

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Aba: Sessões ──────────────────────────────────────────
  let sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessSheet) sessSheet = ss.insertSheet(SHEET_SESSIONS);
  sessSheet.clearContents();

  const sessHeaders = ['ID', 'Tema ID', 'Horário', 'Dia', 'Nome do Tema', 'Vagas'];
  sessSheet.getRange(1, 1, 1, sessHeaders.length)
    .setValues([sessHeaders])
    .setFontWeight('bold');

  // Grade padrão de sessões (espelha js/config.js)
  const sessions = [
    ['session-1',  'tempestades-solares',    '10:00', 'Dia 1', 'Tempestades Solares',        10],
    ['session-2',  'gps-ionosfera',          '10:30', 'Dia 1', 'GPS e Ionosfera',             10],
    ['session-3',  'satellites',             '11:00', 'Dia 1', 'Satélites e Clima Espacial',  10],
    ['session-4',  'inteligencia-artificial','11:30', 'Dia 1', 'Inteligência Artificial',     10],
    ['session-5',  'gics',                   '14:00', 'Dia 1', 'GICs e Redes Elétricas',      10],
    ['session-6',  'clima-brasil',           '14:30', 'Dia 1', 'Clima Espacial no Brasil',    10],
    ['session-7',  'tempestades-solares',    '15:00', 'Dia 1', 'Tempestades Solares',        10],
    ['session-8',  'gps-ionosfera',          '15:30', 'Dia 1', 'GPS e Ionosfera',             10],
    ['session-9',  'satellites',             '10:00', 'Dia 2', 'Satélites e Clima Espacial',  10],
    ['session-10', 'tempestades-solares',    '10:30', 'Dia 2', 'Tempestades Solares',        10],
    ['session-11', 'gics',                   '11:00', 'Dia 2', 'GICs e Redes Elétricas',      10],
    ['session-12', 'inteligencia-artificial','11:30', 'Dia 2', 'Inteligência Artificial',     10],
    ['session-13', 'clima-brasil',           '14:00', 'Dia 2', 'Clima Espacial no Brasil',    10],
    ['session-14', 'gps-ionosfera',          '14:30', 'Dia 2', 'GPS e Ionosfera',             10],
    ['session-15', 'tempestades-solares',    '15:00', 'Dia 2', 'Tempestades Solares',        10],
    ['session-16', 'satellites',             '15:30', 'Dia 2', 'Satélites e Clima Espacial',  10],
  ];
  sessSheet.getRange(2, 1, sessions.length, 6).setValues(sessions);

  // ── Aba: Inscrições ───────────────────────────────────────
  let regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  if (!regSheet) regSheet = ss.insertSheet(SHEET_REGISTRATIONS);
  regSheet.clearContents();

  const regHeaders = ['Timestamp', 'Session ID', 'Email', 'Nome', 'Instituição', 'Interesses'];
  regSheet.getRange(1, 1, 1, regHeaders.length)
    .setValues([regHeaders])
    .setFontWeight('bold');

  Logger.log('✅ Planilha configurada com sucesso!');
  SpreadsheetApp.getUi().alert('Planilha configurada! As abas "Sessões" e "Inscrições" foram criadas.');
}

const sessionInfo = getSessionDetails(sessionId);
if (sessionInfo) {
  try {
    sendConfirmationEmail(email, name, sessionInfo);
  } catch (err) {
    Logger.log('Erro ao enviar email de confirmação: ' + err.message);
  }
}

function sendConfirmationEmail(email, name, sessionInfo) {
  const subject = 'Confirmação — Space Weather Talks';

  const body = [
    `Olá, ${name}!`,
    '',
    'Sua inscrição foi confirmada.',
    '',
    `Tema: ${sessionInfo.topicName}`,
    `Horário: ${sessionInfo.time}`,
    `Dia: ${sessionInfo.day}`,
    'Local: Espaço do EMBRACE - INPE no estande da AEB',
    '',
    'Nos vemos em breve!',
    '',
    'EMBRACE - INPE',
    'SpaceBR Show 2026',
  ].join('\n');

  MailApp.sendEmail(email, subject, body);
}