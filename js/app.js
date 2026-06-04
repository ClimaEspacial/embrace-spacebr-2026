/**
 * app.js — Lógica principal do Space Weather Talks
 *
 * Fluxo:
 *  1. Inicialização: lê parâmetros de URL para deep links de QR code
 *  2. Carrega disponibilidade de vagas (Apps Script ou modo demo)
 *  3. Exibe grade de sessões com filtro por dia
 *  4. Permite clicar numa sessão → formulário de inscrição
 *  5. Envia dados ao Apps Script → exibe confirmação ou erro
 */

// ─────────────────────────────────────────────
// Estado global
// ─────────────────────────────────────────────
const state = {
  selectedSession: null,   // objeto de sessão selecionada
  availability: {},        // { sessionId: vagasDisponíveis }
  currentFilter: 'all',    // filtro ativo: 'all' | 'Dia 1' | 'Dia 2' | <topicId>
  isMockMode: false,       // true quando APPS_SCRIPT_URL está vazio
};

// ─────────────────────────────────────────────
// Helpers de lookup
// ─────────────────────────────────────────────
function getTopic(topicId) {
  return CONFIG.topics.find((t) => t.id === topicId) || null;
}

function getSession(sessionId) {
  return CONFIG.sessions.find((s) => s.id === sessionId) || null;
}

// ─────────────────────────────────────────────
// Navegação entre views
// ─────────────────────────────────────────────
const views = ['view-home', 'view-form', 'view-confirmation', 'view-full-error'];

function showView(id) {
  views.forEach((v) => {
    const el = document.getElementById(v);
    if (el) {
      el.hidden = v !== id;
      if (v !== id) {
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('aria-hidden');
      }
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────
// Carregamento de disponibilidade
// ─────────────────────────────────────────────
async function loadAvailability() {
  state.isMockMode = !CONFIG.APPS_SCRIPT_URL;

  if (state.isMockMode) {
    // Modo demo: gera vagas aleatórias para visualização (inclui 0 = esgotado)
    CONFIG.sessions.forEach((s) => {
      state.availability[s.id] = Math.floor(Math.random() * (s.spots + 1));
    });
    return;
  }

  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=availability`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success && data.availability) {
      state.availability = data.availability;
    } else {
      throw new Error(data.error || 'Resposta inesperada do servidor.');
    }
  } catch (err) {
    console.warn('[SpaceWeather] Disponibilidade em tempo real indisponível — usando capacidade máxima.', err);
    // Fallback: assume todas as vagas disponíveis
    CONFIG.sessions.forEach((s) => {
      state.availability[s.id] = s.spots;
    });
  }
}

// ─────────────────────────────────────────────
// Renderização de cards de sessão
// ─────────────────────────────────────────────
function renderSessions(filterTopicId) {
  const listEl = document.getElementById('sessions-list');
  const loadingEl = document.getElementById('sessions-loading');

  loadingEl.hidden = true;

  // Determina filtro ativo
  if (filterTopicId) {
    state.currentFilter = filterTopicId;
  }

  let sessions = CONFIG.sessions;

  if (state.currentFilter !== 'all') {
    // Filtro por dia (ex.: 'Dia 1')
    if (CONFIG.sessions.some((s) => s.day === state.currentFilter)) {
      sessions = sessions.filter((s) => s.day === state.currentFilter);
    } else {
      // Filtro por tema
      sessions = sessions.filter((s) => s.topicId === state.currentFilter);
    }
  }

  if (sessions.length === 0) {
    listEl.innerHTML = '<p class="empty-message">Nenhuma sessão encontrada para este filtro.</p>';
    return;
  }

  // Agrupa por dia
  const byDay = {};
  sessions.forEach((s) => {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  });

  let html = '';
  Object.keys(byDay).forEach((day) => {
    html += `<h2 class="day-heading">${day}</h2><div class="sessions-row">`;
    byDay[day].forEach((session) => {
      const topic = getTopic(session.topicId);
      if (!topic) return;

      const avail = state.availability[session.id] ?? session.spots;
      const isFull = avail <= 0;
      const isLow = !isFull && avail <= 3;

      const availClass = isFull ? 'badge-full' : isLow ? 'badge-low' : 'badge-ok';
      const availText = isFull ? 'Esgotado' : `${avail} vaga${avail !== 1 ? 's' : ''}`;

      html += `
        <button
          class="session-card${isFull ? ' session-card--full' : ''}"
          data-session-id="${session.id}"
          ${isFull ? 'disabled aria-disabled="true"' : ''}
          aria-label="${topic.emoji} ${topic.name} — ${session.time} — ${availText}"
        >
          <span class="card-emoji">${topic.emoji}</span>
          <div class="card-body">
            <span class="card-time">${session.time}</span>
            <span class="card-name">${topic.name}</span>
            <span class="card-question">${topic.question}</span>
          </div>
          <span class="badge ${availClass}">${availText}</span>
        </button>`;
    });
    html += '</div>';
  });

  listEl.innerHTML = html;

  // Eventos nos cards
  listEl.querySelectorAll('.session-card:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => {
      const session = getSession(btn.dataset.sessionId);
      if (session) openForm(session);
    });
  });
}

// ─────────────────────────────────────────────
// Filtro de dias/temas
// ─────────────────────────────────────────────
function renderFilterBar(activeFilter) {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  // Coleta dias únicos presentes na grade
  const days = [...new Set(CONFIG.sessions.map((s) => s.day))];

  let html = `<button class="filter-btn${activeFilter === 'all' ? ' active' : ''}" data-filter="all">Todos</button>`;
  days.forEach((day) => {
    html += `<button class="filter-btn${activeFilter === day ? ' active' : ''}" data-filter="${day}">${day}</button>`;
  });

  bar.innerHTML = html;

  bar.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentFilter = btn.dataset.filter;
      renderFilterBar(state.currentFilter);
      renderSessions();
    });
  });
}

// ─────────────────────────────────────────────
// Formulário de inscrição
// ─────────────────────────────────────────────
function openForm(session) {
  state.selectedSession = session;
  const topic = getTopic(session.topicId);
  if (!topic) return;

  document.getElementById('form-topic-emoji').textContent = topic.emoji;
  document.getElementById('form-topic-name').textContent = topic.name;
  document.getElementById('form-session-meta').textContent =
    `${session.time} · ${session.day} · ${CONFIG.event.location}`;

  // Reseta o formulário
  document.getElementById('registration-form').reset();
  setFormError('');
  setFormLoading(false);

  showView('view-form');
}

function setFormError(message) {
  const el = document.getElementById('form-error');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

function setFormLoading(loading) {
  const btn = document.getElementById('btn-submit');
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loadingEl = btn.querySelector('.btn-loading');
  btn.disabled = loading;
  if (text) text.hidden = loading;
  if (loadingEl) loadingEl.hidden = !loading;
}

// ─────────────────────────────────────────────
// Envio ao Apps Script
// ─────────────────────────────────────────────
async function submitRegistration(sessionId, formData) {
  if (state.isMockMode) {
    await new Promise((r) => setTimeout(r, 1400));
    return { success: true };
  }

  const payload = {
    action: 'register',
    sessionId,
    name: formData.name,
    institution: formData.institution,
    email: formData.email,
    interests: formData.interests,
  };

  // Usamos 'text/plain' para evitar pre-flight CORS em Apps Script
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Erro de servidor: ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────────
// Confirmação
// ─────────────────────────────────────────────
function showConfirmation(session) {
  if (!session) {
    showView('view-full-error');
    const errorEl = document.getElementById('full-error-message');
    if (errorEl) {
      errorEl.textContent = 'Não foi possível carregar os dados da sessão confirmada.';
    }
    return;
  }

  const topic = getTopic(session.topicId);
  document.getElementById('conf-topic').textContent =
    topic ? `${topic.emoji} ${topic.name}` : session.topicId || '';

  document.getElementById('conf-time').textContent = session.time || '';
  document.getElementById('conf-day').textContent = session.day || '';
  document.getElementById('conf-location').textContent = CONFIG.event.locationDetail || '';

  showView('view-confirmation');
}

// ─────────────────────────────────────────────
// Handler do formulário
// ─────────────────────────────────────────────
function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;

  // Validação básica
  const name = form.elements['name'].value.trim();
  const institution = form.elements['institution'].value.trim();
  const email = form.elements['email'].value.trim();

  if (!name) {
    setFormError('Por favor, informe seu nome.');
    form.elements['name'].focus();
    return;
  }

  if (!email) {
    setFormError('Por favor, informe seu email.');
    form.elements['email'].focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setFormError('Email inválido. Verifique e tente novamente.');
    form.elements['email'].focus();
    return;
  }

  // Coleta interesses marcados
  const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked'))
    .map((cb) => cb.value);

  const formData = { name, institution, email, interests };
  const session = state.selectedSession;
  if (!session) {
    setFormLoading(false);
    setFormError('Sessão não encontrada. Volte e selecione uma sessão novamente.');
    return;
  }

  setFormError('');
  setFormLoading(true);

  submitRegistration(session.id, formData)
    .then((data) => {
      console.log('Resposta do backend:', data);
      setFormLoading(false);
      if (data.success) {
        // Decrementa vaga localmente para feedback imediato
        if (typeof state.availability[session.id] === 'number') {
          state.availability[session.id] = Math.max(0, state.availability[session.id] - 1);
        }
        showConfirmation(session);
      } else {
        setFormError(data.error || 'Não foi possível completar a inscrição. Tente novamente.');
      }
    })
    .catch((err) => {
      setFormLoading(false);
      console.error('[SpaceWeather] Erro ao enviar inscrição:', err);
      setFormError(
        'Erro de conexão. Verifique sua internet e tente novamente.',
      );
    });
}

// ─────────────────────────────────────────────
// Banner de modo demo
// ─────────────────────────────────────────────
function maybeShowDemoBanner() {
  if (!state.isMockMode) return;
  const banner = document.getElementById('demo-banner');
  if (banner) banner.hidden = false;
}

// ─────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  const topicParam = params.get('tema');
  const sessionParam = params.get('sessao');

  const loadingEl = document.getElementById('sessions-loading');
  if (loadingEl) loadingEl.hidden = false;

  await loadAvailability();

  if (loadingEl) loadingEl.hidden = true;

  maybeShowDemoBanner();

  if (sessionParam) {
    const session = getSession(sessionParam);
    if (session && (state.availability[session.id] ?? session.spots) > 0) {
      openForm(session);
      return;
    }
  }

  if (topicParam && getTopic(topicParam)) {
    state.currentFilter = topicParam;
  }

  showView('view-home');
  renderFilterBar(state.currentFilter);
  renderSessions(topicParam || null);
}
// ─────────────────────────────────────────────
// Event listeners
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Formulário
  const form = document.getElementById('registration-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Botão voltar (formulário → home)
  const btnBack = document.getElementById('btn-back-home');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      showView('view-home');
      renderFilterBar(state.currentFilter);
      renderSessions();
    });
  }

  // Botão "reservar outra" (confirmação → home)
  const btnNew = document.getElementById('btn-new-registration');
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      showView('view-home');
      renderFilterBar(state.currentFilter);
      renderSessions();
    });
  }

  // Botão voltar (erro → home)
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      showView('view-home');
      renderFilterBar(state.currentFilter);
      renderSessions();
    });
  }

  init();
});
