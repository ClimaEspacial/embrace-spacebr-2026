/**
 * app.js — Space Weather Talks SPA
 * EMBRACE-INPE · SpaceBR Show 2026
 *
 * Source of truth for session/topic definitions: js/config.js (CONFIG).
 * Live spot counts are fetched from the Apps Script web app (?action=availability).
 * When CONFIG.APPS_SCRIPT_URL is empty the page runs in demo mode (simulated data).
 */

(function () {
  'use strict';

  // ─── DOM refs ────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const views = {
    home:         $('view-home'),
    form:         $('view-form'),
    confirmation: $('view-confirmation'),
    fullError:    $('view-full-error'),
  };

  const demoBanner      = $('demo-banner');
  const filterBar       = $('filter-bar');
  const sessionsLoading = $('sessions-loading');
  const sessionsList    = $('sessions-list');

  // form view
  const formTopicEmoji   = $('form-topic-emoji');
  const formTopicName    = $('form-topic-name');
  const formSessionMeta  = $('form-session-meta');
  const registrationForm = $('registration-form');
  const formError        = $('form-error');
  const btnSubmit        = $('btn-submit');
  const btnBackHome      = $('btn-back-home');

  // confirmation view
  const confTopic    = $('conf-topic');
  const confTime     = $('conf-time');
  const confDay      = $('conf-day');
  const confLocation = $('conf-location');
  const btnNewReg    = $('btn-new-registration');

  // full-page error view
  const fullErrorMsg = $('full-error-message');
  const btnRetry     = $('btn-retry');

  // ─── Constants ───────────────────────────────────────────────
  const DEMO_SUBMIT_DELAY_MS = 1400;

  // ─── State ───────────────────────────────────────────────────
  const DEMO = !CONFIG.APPS_SCRIPT_URL;
  let availability    = {};   // { sessionId: spotsRemaining }
  let selectedSession = null; // session object currently shown in form
  let activeDay       = null; // day filter currently active (null = show all)

  // ─── Helpers ─────────────────────────────────────────────────
  function topicById(id) {
    return CONFIG.topics.find(t => t.id === id) || null;
  }

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.hidden = (key !== name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showFormError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }

  function hideFormError() {
    formError.textContent = '';
    formError.hidden = true;
  }

  function setSubmitLoading(on) {
    btnSubmit.querySelector('.btn-text').hidden    =  on;
    btnSubmit.querySelector('.btn-loading').hidden = !on;
    btnSubmit.disabled = on;
  }

  // ─── Demo helpers ────────────────────────────────────────────
  function buildDemoAvailability() {
    const result = {};
    CONFIG.sessions.forEach(s => {
      result[s.id] = Math.floor(Math.random() * (s.spots + 1));
    });
    return result;
  }

  // ─── Availability badge ───────────────────────────────────────
  function badgeFor(spots) {
    if (spots <= 0) return { cls: 'badge badge-full', label: 'Esgotado' };
    if (spots <= 3) return { cls: 'badge badge-low',  label: `${spots} vagas` };
    return               { cls: 'badge badge-ok',   label: `${spots} vagas` };
  }

  // ─── Session card ─────────────────────────────────────────────
  function createSessionCard(session, topic, spots) {
    const isFull     = spots <= 0;
    const { cls, label } = badgeFor(spots);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'session-card' + (isFull ? ' session-card--full' : '');
    if (isFull) card.disabled = true;

    card.innerHTML = `
      <span class="card-emoji" aria-hidden="true">${topic.emoji}</span>
      <div class="card-body">
        <span class="card-time">${session.time} · ${session.day}</span>
        <span class="card-name">${topic.name}</span>
        <span class="card-question">${topic.question}</span>
      </div>
      <span class="${cls}" aria-label="${label}">${label}</span>
    `;

    if (!isFull) {
      card.addEventListener('click', () => openForm(session, topic, spots));
    }

    return card;
  }

  // ─── Filter bar ──────────────────────────────────────────────
  function renderFilterBar(days) {
    filterBar.innerHTML = '';

    function makeBtn(label, day) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn' + (activeDay === day ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        activeDay = day;
        renderSessions();
      });
      return btn;
    }

    filterBar.appendChild(makeBtn('Todos', null));
    days.forEach(day => filterBar.appendChild(makeBtn(day, day)));
  }

  // ─── Render sessions ─────────────────────────────────────────
  function renderSessions() {
    sessionsList.innerHTML = '';

    const sessions = CONFIG.sessions;
    const days = [...new Set(sessions.map(s => s.day))];
    renderFilterBar(days);

    const filtered = activeDay
      ? sessions.filter(s => s.day === activeDay)
      : sessions;

    if (!filtered.length) {
      sessionsList.innerHTML = '<p class="empty-message">Nenhuma sessão disponível.</p>';
      return;
    }

    // Group by day to show day headings
    const byDay = {};
    filtered.forEach(s => { (byDay[s.day] = byDay[s.day] || []).push(s); });

    Object.entries(byDay).forEach(([day, daySessions]) => {
      const heading = document.createElement('h2');
      heading.className = 'day-heading';
      heading.textContent = day;
      sessionsList.appendChild(heading);

      const row = document.createElement('div');
      row.className = 'sessions-row';

      daySessions.forEach(session => {
        const topic = topicById(session.topicId);
        if (!topic) return;
        const spots = (availability[session.id] != null) ? availability[session.id] : session.spots;
        row.appendChild(createSessionCard(session, topic, spots));
      });

      sessionsList.appendChild(row);
    });
  }

  // ─── Open registration form ───────────────────────────────────
  function openForm(session, topic, spots) {
    selectedSession = session;

    formTopicEmoji.textContent  = topic.emoji;
    formTopicName.textContent   = topic.name;
    formSessionMeta.textContent =
      `${session.time} · ${session.day} · ${CONFIG.event.location}`;

    registrationForm.reset();
    hideFormError();
    setSubmitLoading(false);

    showView('form');
  }

  // ─── Registration submit ──────────────────────────────────────
  async function handleSubmit(evt) {
    evt.preventDefault();
    hideFormError();

    const data        = new FormData(registrationForm);
    const name        = (data.get('name')        || '').trim();
    const institution = (data.get('institution') || '').trim();
    const email       = (data.get('email')       || '').trim();
    const interests   = data.getAll('interests');

    if (!name || !email) {
      showFormError('Por favor, preencha nome e email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormError('Por favor, insira um email válido.');
      return;
    }

    setSubmitLoading(true);

    if (DEMO) {
      await new Promise(r => setTimeout(r, DEMO_SUBMIT_DELAY_MS));
      setSubmitLoading(false);
      showConfirmation(selectedSession, topicById(selectedSession.topicId));
      return;
    }

    try {
      const payload = {
        action: 'register',
        sessionId: selectedSession.id,
        name,
        institution,
        email,
        interests,
      };

      const res  = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        showConfirmation(selectedSession, topicById(selectedSession.topicId));
      } else {
        setSubmitLoading(false);
        showFormError(json.error || 'Erro ao realizar inscrição. Tente novamente.');
      }
    } catch (err) {
      setSubmitLoading(false);
      showFormError('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  }

  // ─── Confirmation ─────────────────────────────────────────────
  function showConfirmation(session, topic) {
    confTopic.textContent    = topic ? topic.name : '';
    confTime.textContent     = session.time;
    confDay.textContent      = session.day;
    confLocation.textContent = CONFIG.event.locationDetail;
    showView('confirmation');
  }

  // ─── Fetch availability ────────────────────────────────────────
  async function fetchAvailability() {
    if (DEMO) {
      availability = buildDemoAvailability();
      return;
    }

    try {
      const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=availability`);
      const json = await res.json();
      if (json.success && json.availability) {
        availability = json.availability;
      }
    } catch (err) {
      // Non-fatal: fall back to configured spot totals
      console.warn('Failed to fetch availability:', err);
      availability = {};
      CONFIG.sessions.forEach(s => { availability[s.id] = s.spots; });
    }
  }

  // ─── URL params ────────────────────────────────────────────────
  // Returns true if the form was opened directly (suppress default session render).
  function applyUrlParams() {
    const params   = new URLSearchParams(window.location.search);
    const sessaoId = params.get('sessao');
    const temaId   = params.get('tema');

    if (sessaoId) {
      const session = CONFIG.sessions.find(s => s.id === sessaoId);
      if (session) {
        const topic = topicById(session.topicId);
        const spots = (availability[session.id] != null) ? availability[session.id] : session.spots;
        if (topic && spots > 0) {
          openForm(session, topic, spots);
          return true;
        }
      }
    }

    if (temaId) {
      // Pre-filter the list to sessions with the matching topicId
      const matchingDay = (CONFIG.sessions.find(s => s.topicId === temaId) || {}).day;
      activeDay = matchingDay || null;
    }

    return false;
  }

  // ─── Init ─────────────────────────────────────────────────────
  async function init() {
    if (DEMO) demoBanner.hidden = false;

    // Loading spinner is visible in HTML by default; hide sessions list while loading
    sessionsLoading.hidden = false;
    sessionsList.hidden    = true;

    await fetchAvailability();

    sessionsLoading.hidden = true;
    sessionsList.hidden    = false;

    const openedForm = applyUrlParams();
    if (!openedForm) {
      renderSessions();
    }
  }

  // ─── Event listeners ──────────────────────────────────────────
  registrationForm.addEventListener('submit', handleSubmit);

  btnBackHome.addEventListener('click', () => {
    selectedSession = null;
    showView('home');
    renderSessions();
  });

  btnNewReg.addEventListener('click', () => {
    selectedSession = null;
    showView('home');
    renderSessions();
  });

  btnRetry.addEventListener('click', () => {
    selectedSession = null;
    showView('home');
    renderSessions();
  });

  // ─── Boot ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
