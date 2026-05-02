"use strict";
// ================================================================
// YUVAVERSE — EVENTS-PAGE.JS
// All-events page: categories, sort, view toggle, paginated grid
// API shape: { events: [{id,title,description,date,venue,price,
//              imageUrl,bannerUrl,eventType,maxTeamSize,
//              currentRegistrations,maxRegistrations,
//              _count:{registrations}}],
//              pagination: {total,totalPages,currentPage,limit} }
// ================================================================
(function () {

  let currentPage     = 1;
  let currentSearch   = '';
  let currentCat      = '';       // maps to eventType filter param
  let currentSort     = 'newest'; // newest | oldest | name
  let searchTimer     = null;
  const LIMIT = 9;

  // ── Helpers ────────────────────────────────────────────────────
  function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();
  }
  function fmtTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
  function fmtPrice(price) {
    if (price === 0 || price === '0' || price == null) return 'Free';
    return `₹${price}`;
  }

  // ── Avatar strip ────────────────────────────────────────────────
  const AVATAR_COLORS = ['#6C63FF','#a78bfa','#22d3ee','#f472b6','#4ade80'];
  function buildAvatars(count) {
    const num = count > 0 ? Math.min(count, 3) : 0;
    if (num === 0) return '';
    let html = '<div class="ev-card__avatars">';
    for (let i = 0; i < num; i++) {
      html += `<div class="ev-card__avatar" style="background:${AVATAR_COLORS[i]}"></div>`;
    }
    html += '</div>';
    return html;
  }

  // ── Gradient picker ─────────────────────────────────────────────
  const GRADIENTS = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'linear-gradient(135deg,#2176ff,#33bdd8)',
  ];
  function pickGradient(str) {
    let n = 0;
    for (let i = 0; i < (str || '').length; i++) n += str.charCodeAt(i);
    return GRADIENTS[n % GRADIENTS.length];
  }

  // ── Event type badge color map ───────────────────────────────────
  const TYPE_COLORS = {
    Workshop:    { bg: '#ede9fe', color: '#6d28d9' },
    Hackathon:   { bg: '#dbeafe', color: '#1e40af' },
    Competition: { bg: '#fce7f3', color: '#be185d' },
    Seminar:     { bg: '#d1fae5', color: '#065f46' },
    Meetup:      { bg: '#fef3c7', color: '#92400e' },
    Cultural:    { bg: '#ffe4e6', color: '#be123c' },
  };

  // ── Build a single card ─────────────────────────────────────────
  function buildCard(ev) {
    const isFree    = ev.price === 0 || ev.price === '0' || ev.price == null;
    const price     = fmtPrice(ev.price);
    const dateStr   = fmtDate(ev.date);
    const timeStr   = fmtTime(ev.date);
    const going     = ev._count?.registrations ?? 0;
    const imgSrc    = ev.bannerUrl || ev.imageUrl || '';
    const grad      = pickGradient(ev.title);
    const isTeam    = ev.maxTeamSize > 1;

    // Event type info
    const typeInfo = ev.eventType
      ? `<div class="ev-card__meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z"/></svg>
          <span>${ev.eventType}</span>
         </div>`
      : '';

    // Team info
    const teamInfo = isTeam
      ? `<div class="ev-card__meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Team ≤${ev.maxTeamSize}</span>
         </div>`
      : '';

    // Registration deadline info
    let deadlineInfo = '';
    if (ev.registrationDeadline) {
      const dl = new Date(ev.registrationDeadline);
      const now = new Date();
      const closed = dl < now;
      const dlStr = dl.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      deadlineInfo = `<div class="ev-card__meta-item" ${closed ? 'style="color:var(--clr-error, #dc2626)"' : ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${closed ? 'Reg. Closed' : `Closes ${dlStr}`}</span>
      </div>`;
    }

    // Slots info
    let slotsInfo = '';
    if (ev.maxRegistrations != null) {
      const filled    = ev.currentRegistrations ?? ev._count?.registrations ?? 0;
      const remaining = ev.maxRegistrations - filled;
      const full      = remaining <= 0;
      slotsInfo = `<div class="ev-card__meta-item" ${full ? 'style="color:var(--clr-error, #dc2626)"' : ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        <span>${full ? 'Seats Full' : `${filled}/${ev.maxRegistrations} seats`}</span>
      </div>`;
    }

    return `
<div class="ev-card" role="listitem">
  <div class="ev-card__image" style="background:${grad}">
    ${imgSrc ? `<img src="${imgSrc}" alt="${ev.title}" loading="lazy"/>` : ''}
    <div class="ev-card__badges">
      <span class="ev-card__badge ${isFree ? 'ev-card__badge--free' : 'ev-card__badge--paid'}">${price}</span>
    </div>
  </div>
  <div class="ev-card__body">
    <h3 class="ev-card__title">${ev.title || 'Untitled Event'}</h3>
    <div class="ev-card__venue">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>${ev.venue || 'TBA'}</span>
    </div>
    <div class="ev-card__meta">
      ${ev.date ? `
      <div class="ev-card__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${dateStr}</span>
      </div>
      <div class="ev-card__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${timeStr}</span>
      </div>` : ''}
      ${typeInfo}
      ${teamInfo}
      ${deadlineInfo}
      ${slotsInfo}
    </div>
    <div class="ev-card__footer">
      <div class="ev-card__attendees">
        ${buildAvatars(going)}
        <span class="ev-card__going">${going > 0 ? `${going}+ going` : 'Be the first!'}</span>
      </div>
      <a href="/event-detail.html?id=${ev.id}" class="ev-card__register" id="registerBtn-${ev.id}">
        ${isTeam ? 'Register Team →' : 'Register Now →'}
      </a>
    </div>
  </div>
</div>`;
  }

  // ── Skeleton cards ──────────────────────────────────────────────
  function buildSkeleton() {
    return `
<div class="ev-card ev-card--skeleton" aria-hidden="true">
  <div class="ev-card__image" style="aspect-ratio:16/9"></div>
  <div class="ev-card__body" style="gap:0.6rem">
    <div class="skel" style="height:18px;width:75%;border-radius:6px"></div>
    <div class="skel" style="height:13px;width:50%;border-radius:4px"></div>
    <div class="skel" style="height:13px;width:60%;border-radius:4px"></div>
    <div class="skel" style="height:32px;width:120px;margin-top:0.5rem;border-radius:999px"></div>
  </div>
</div>`;
  }

  // ── Empty state ─────────────────────────────────────────────────
  function buildEmpty(msg) {
    return `<div class="ev-empty">
      <div class="ev-empty__icon">🎉</div>
      <p class="ev-empty__title">No events found</p>
      <p>${msg}</p>
    </div>`;
  }

  // ── Load events from API ────────────────────────────────────────
  async function loadEvents() {
    const grid       = document.getElementById('eventsGrid');
    const pagination = document.getElementById('pagination');
    if (!grid) return;

    // Show skeletons
    grid.innerHTML = Array(LIMIT).fill(0).map(buildSkeleton).join('');

    const query = new URLSearchParams({
      page:  String(currentPage),
      limit: String(LIMIT),
      sort:  currentSort,
    });
    if (currentSearch) query.set('search', currentSearch);
    if (currentCat)    query.set('eventType', currentCat);  // server-side filter

    let res;
    try {
      res = await ApiClient.get(`/events?${query}`);
    } catch (_) {
      res = { success: false };
    }

    if (!res.success) {
      grid.innerHTML = buildEmpty('Could not load events. Please try again.');
      if (pagination) pagination.innerHTML = '';
      return;
    }

    const { events, pagination: pg } = res.data;
    const filtered = events || [];

    if (!filtered.length) {
      grid.innerHTML = buildEmpty(
        currentSearch
          ? `No events match "${currentSearch}".`
          : currentCat
          ? `No "${currentCat}" events right now — check back soon!`
          : 'No upcoming events yet — check back soon!'
      );
      if (pagination) pagination.innerHTML = '';
      return;
    }

    grid.innerHTML = filtered.map(buildCard).join('');
    renderPagination(pg);
  }

  // ── Pagination ──────────────────────────────────────────────────
  function renderPagination(pg) {
    const el = document.getElementById('pagination');
    if (!el || !pg || pg.totalPages <= 1) {
      if (el) el.innerHTML = '';
      return;
    }

    let html = `<button class="page-btn page-btn--nav" data-page="${pg.currentPage - 1}" ${pg.currentPage === 1 ? 'disabled' : ''}>&#8592;</button>`;
    for (let i = 1; i <= pg.totalPages; i++) {
      html += `<button class="page-btn${i === pg.currentPage ? ' page-btn--active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn page-btn--nav" data-page="${pg.currentPage + 1}" ${pg.currentPage === pg.totalPages ? 'disabled' : ''}>&#8594;</button>`;
    el.innerHTML = html;

    el.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset.page);
        if (!isNaN(p) && p >= 1 && p <= pg.totalPages) {
          currentPage = p;
          loadEvents();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  // ── Category pills — now sends eventType to server ──────────────
  function initCategories() {
    document.querySelectorAll('.ev-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.ev-cat-pill').forEach(p => {
          p.classList.remove('ev-cat-pill--active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('ev-cat-pill--active');
        pill.setAttribute('aria-selected', 'true');
        currentCat  = pill.dataset.cat || '';
        currentPage = 1;
        loadEvents();
      });
    });
  }

  // ── View toggle ─────────────────────────────────────────────────
  function initViewToggle() {
    const grid    = document.getElementById('eventsGrid');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    if (!gridBtn || !listBtn || !grid) return;

    gridBtn.addEventListener('click', () => {
      grid.classList.remove('ev-grid--list');
      gridBtn.classList.add('ev-view-btn--active');
      listBtn.classList.remove('ev-view-btn--active');
      gridBtn.setAttribute('aria-pressed', 'true');
      listBtn.setAttribute('aria-pressed', 'false');
    });

    listBtn.addEventListener('click', () => {
      grid.classList.add('ev-grid--list');
      listBtn.classList.add('ev-view-btn--active');
      gridBtn.classList.remove('ev-view-btn--active');
      listBtn.setAttribute('aria-pressed', 'true');
      gridBtn.setAttribute('aria-pressed', 'false');
    });
  }

  // ── Sort — sends to server ───────────────────────────────────────
  function initSort() {
    const sel = document.getElementById('sortSelect');
    if (!sel) return;
    sel.value = currentSort;
    sel.addEventListener('change', () => {
      currentSort = sel.value;
      currentPage = 1;
      loadEvents();
    });
  }

  // ── Search ──────────────────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = input.value.trim();
        currentPage   = 1;
        loadEvents();
      }, 380);
    });
  }

  // ── Boot ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initCategories();
    initViewToggle();
    initSort();
    initSearch();
    loadEvents();
  });

})();
