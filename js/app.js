/**
 * Code.gs — Google Apps Script para Space Weather Talks
 * EMBRACE - INPE · SpaceBR Show 2026
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURAÇÃO
// ─────────────────────────────────────────────────────────────

/** Use apenas o ID da planilha, não a URL inteira */
const SPREADSHEET_ID = '1xjGvAG_gaUCDR_sPrHZTNHKMkZhW_OHJu9_Xa2Vf7Vs';

const SHEET_REGISTRATIONS = 'Inscrições';
const SHEET_SESSIONS = 'Sessões';

// ─────────────────────────────────────────────────────────────
// HANDLERS HTTP
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || '';

    if (action === 'availability') {
      const availability = getAvailability();
      return jsonResponse({ success: true, availability });
    }

    if (action === 'sessions') {
      const sessions = getSessionsFromSheet();
      return jsonResponse({ success: true, sessions });
    }

    return jsonResponse({
      success: false,
      error: 'Ação não reconhecida. Use ?action=availability.',
    });
  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return jsonResponse({ success: false, error: 'Erro interno: ' + err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
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

function getAvailability() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);

  if (!regSheet || !sessSheet) {
    throw new Error('Abas não encontradas. Execute setupSpreadsheet() primeiro.');
  }

  const regData = regSheet.getDataRange().getValues();
  const counts = {};

  for (let i = 1; i < regData.length; i++) {
    const sessionId = regData[i][1];
    if (sessionId) {
      counts[sessionId] = (counts[sessionId] || 0) + 1;
    }
  }

  const sessData = sessSheet.getDataRange().getValues();
  const availability = {};

  for (let i = 1; i < sessData.length; i++) {
    const sessionId = sessData[i][0];
    const capacity = Number(sessData[i][5]) || 10;
    const registered = counts[sessionId] || 0;
    availability[sessionId] = Math.max(0, capacity - registered);
  }

  return availability;
}

function getSessionsFromSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);

  if (!sessSheet) throw new Error('Aba Sessões não encontrada.');

  const data = sessSheet.getDataRange().getValues();
  const sessions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    sessions.push({
      id: row[0],
      topicId: row[1],
      time: row[2],
      day: row[3],
      name: row[4],
      spots: Number(row[5]) || 10,
    });
  }

  return sessions;
}

function getSessionDetails(sessionId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessSheet) throw new Error('Aba Sessões não encontrada.');

  const data = sessSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === sessionId) {
      return {
        id: row[0],
        topicId: row[1],
        time: row[2],
        day: row[3],
        topicName: row[4],
        spots: Number(row[5]) || 10,
      };
    }
  }

  return null;
}

function registerVisitor(payload) {
  const { sessionId, name, institution, email, interests } = payload;

  if (!sessionId || !name || !email) {
    return {
      success: false,
      error: 'Campos obrigatórios ausentes (sessionId, name, email).',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Endereço de email inválido.' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  if (!regSheet) {
    return { success: false, error: 'Aba de inscrições não encontrada.' };
  }

  const availability = getAvailability();

  if (!(sessionId in availability)) {
    return { success: false, error: 'Sessão não encontrada.' };
  }

  if (availability[sessionId] <= 0) {
    return {
      success: false,
      error: 'Desculpe, não há mais vagas disponíveis nesta sessão.',
    };
  }

  const regData = regSheet.getDataRange().getValues();
  for (let i = 1; i < regData.length; i++) {
    if (
      String(regData[i][2]).toLowerCase() === String(email).toLowerCase() &&
      regData[i][1] === sessionId
    ) {
      return {
        success: false,
        error: 'Este email já está inscrito nesta sessão.',
      };
    }
  }

  const timestamp = new Date().toISOString();
  const interestsStr = Array.isArray(interests)
    ? interests.join(', ')
    : String(interests || '');

  regSheet.appendRow([
    timestamp,
    sessionId,
    email,
    name,
    institution || '',
    interestsStr,
  ]);

  const sessionInfo = getSessionDetails(sessionId);
  Logger.log('sessionId recebido: ' + sessionId);
  Logger.log('email recebido: ' + email);
  Logger.log('name recebido: ' + name);
  Logger.log('sessionInfo encontrado: ' + JSON.stringify(sessionInfo));

  if (sessionInfo) {
    try {
      Logger.log('Tentando enviar email para: ' + email);
      Logger.log('Quota restante: ' + MailApp.getRemainingDailyQuota());
      sendConfirmationEmail(email, name, sessionInfo);
      Logger.log('Email enviado com sucesso para: ' + email);
    } catch (err) {
      Logger.log('Erro ao enviar email de confirmação: ' + err.message);
    }
  } else {
    Logger.log('Nenhuma sessão encontrada para sessionId: ' + sessionId);
  }

  Logger.log('Inscrição registrada: ' + email + ' → ' + sessionId);
  return { success: true, message: 'Inscrição realizada com sucesso!', emailVersion: 'v2-email-on' };;
}

// ─────────────────────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────────────────────

function sendConfirmationEmail(email, name, sessionInfo) {
  if (!sessionInfo) {
    throw new Error('sessionInfo não foi informado para sendConfirmationEmail.');
  }

  let formattedTime = sessionInfo.time || '';
  if (formattedTime instanceof Date) {
    formattedTime = Utilities.formatDate(
      formattedTime,
      Session.getScriptTimeZone(),
      'HH:mm'
    );
  }

  const subject = 'Confirmação de inscrição — Space Weather Talks';

  const body = [
    `Olá, ${name}!`,
    '',
    'Sua inscrição foi confirmada.',
    '',
    `Tema: ${sessionInfo.topicName || ''}`,
    `Horário: ${formattedTime}`,
    `Dia: ${sessionInfo.day || ''}`,
    'Local: Espaço do EMBRACE - INPE no estande da AEB',
    '',
    'Se necessário, chegue com alguns minutos de antecedência.',
    '',
    'Nos vemos em breve!',
    '',
    'EMBRACE - INPE',
    'SpaceBR Show 2026',
  ].join('\n');

  MailApp.sendEmail(email, subject, body);
}

function testSendEmail() {
  MailApp.sendEmail(
    'email',
    'Teste — Space Weather Talks',
    'Se você recebeu este email, o envio está funcionando.'
  );
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
// ─────────────────────────────────────────────────────────────

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessSheet) sessSheet = ss.insertSheet(SHEET_SESSIONS);
  sessSheet.clearContents();

  const sessHeaders = ['ID', 'Tema ID', 'Horário', 'Dia', 'Nome do Tema', 'Vagas'];
  sessSheet.getRange(1, 1, 1, sessHeaders.length)
    .setValues([sessHeaders])
    .setFontWeight('bold');

  const sessions = [
    [
      'session-1',
      'lancamentos-foguetes',
      '10:30',
      '16/06',
      'Monitoramento de clima espacial durante lançamentos de foguetes',
      15
    ],
    [
      'session-2',
      'aviacao-eventos-extremos',
      '14:30',
      '16/06',
      'Os perigos causados à aviação durante eventos extremos de clima espacial',
      15
    ],
    [
      'session-3',
      'gics-rede-eletrica',
      '10:30',
      '17/06',
      'Quando o Sol ameaça a rede elétrica: entendendo as Correntes Geomagneticamente Induzidas (GICs)',
      15
    ],
    [
      'session-4',
      'gps-drones-agricultura',
      '14:30',
      '17/06',
      'Do espaço para o campo: como o clima espacial afeta GPS, drones e agricultura de precisão',
      15
    ],
  ];

  sessSheet.getRange(2, 1, sessions.length, 6).setValues(sessions);

  let regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  if (!regSheet) regSheet = ss.insertSheet(SHEET_REGISTRATIONS);
  regSheet.clearContents();

  const regHeaders = ['Timestamp', 'Session ID', 'Email', 'Nome', 'Instituição', 'Interesses'];
  regSheet.getRange(1, 1, 1, regHeaders.length)
    .setValues([regHeaders])
    .setFontWeight('bold');

  Logger.log('✅ Planilha configurada com sucesso! As abas "Sessões" e "Inscrições" foram criadas.');
}

function testSessionLookup() {
  const sessionInfo = getSessionDetails('session-1');
  Logger.log(JSON.stringify(sessionInfo));
}

function testRegisterMock() {
  const result = registerVisitor({
    action: 'register',
    sessionId: 'session-1',
    name: 'Teste Email',
    institution: 'INPE',
    email: 'jpmarchezi+teste2@gmail.com',
    interests: ['Cursos e treinamentos']
  });

  Logger.log(JSON.stringify(result));
}