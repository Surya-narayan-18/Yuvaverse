"use strict";
// ================================================================
// YUVAVERSE — MAIN.TS  (Global utilities — module: None)
// Compiles to src/public/js/main.js
// Included FIRST in every HTML page via <script src="/js/main.js">
// ================================================================
// ─── Theme System ─────────────────────────────────────────────────
const ThemeSystem = (() => {
    const KEY = 'yuvaverse-theme';
    const root = document.documentElement;
    function getPreferred() {
        const stored = localStorage.getItem(KEY);
        if (stored)
            return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function apply(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem(KEY, theme);
        const btn = document.getElementById('themeToggle');
        if (btn)
            btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
    function toggle() {
        const current = (root.getAttribute('data-theme') ?? 'light');
        apply(current === 'dark' ? 'light' : 'dark');
    }
    function init() {
        apply(getPreferred());
        document.getElementById('themeToggle')?.addEventListener('click', toggle);
    }
    return { init, apply, toggle };
})();
// ─── Toast Notification System ────────────────────────────────────
const ToastSystem = (() => {
    const ICONS = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="#3498DB" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const TITLES = {
        success: 'Success',
        error: 'Error',
        info: 'Info',
    };
    function show(message, type = 'info', duration = 4500) {
        const container = document.getElementById('toastContainer');
        if (!container)
            return;
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
      <span class="toast__icon">${ICONS[type]}</span>
      <div class="toast__body">
        <div class="toast__title">${TITLES[type]}</div>
        <div class="toast__msg">${message}</div>
      </div>`;
        container.appendChild(toast);
        const remove = () => {
            toast.classList.add('toast--out');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };
        const timer = setTimeout(remove, duration);
        toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
    }
    return { show };
})();
// ─── API Client ───────────────────────────────────────────────────
const ApiClient = (() => {
    const BASE = '/api';
    async function request(method, path, body, token) {
        const headers = { 'Content-Type': 'application/json' };
        if (token)
            headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body != null ? JSON.stringify(body) : undefined,
        });
        const json = await res.json();
        return json;
    }
    async function get(path, token) {
        return request('GET', path, undefined, token);
    }
    async function post(path, body, token) {
        return request('POST', path, body, token);
    }
    return { get, post };
})();
// ─── Skeleton Loader ──────────────────────────────────────────────
function renderSkeletonCards(container, count = 3) {
    container.innerHTML = Array.from({ length: count }, () => `
    <div class="ev-card ev-card--skeleton" aria-hidden="true">
      <div class="ev-card__image" style="aspect-ratio:16/9"></div>
      <div class="ev-card__body" style="gap:0.6rem">
        <div class="skel" style="height:18px;width:75%;border-radius:6px"></div>
        <div class="skel" style="height:13px;width:50%;border-radius:4px"></div>
        <div class="skel" style="height:13px;width:60%;border-radius:4px"></div>
        <div class="skel" style="height:32px;width:120px;margin-top:0.5rem;border-radius:999px"></div>
      </div>
    </div>`).join('');
}
// ─── Event Card Builder ───────────────────────────────────────────
const CARD_GRADIENTS = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'linear-gradient(135deg,#fccb90,#d57eeb)',
    'linear-gradient(135deg,#2176ff,#33bdd8)',
];
function pickGradient(str) {
    let n = 0;
    for (let i = 0; i < (str || '').length; i++)
        n += str.charCodeAt(i);
    return CARD_GRADIENTS[n % CARD_GRADIENTS.length];
}
const AVATAR_COLORS = ['#6C63FF', '#a78bfa', '#22d3ee', '#f472b6', '#4ade80'];
function buildAvatarStrip(count) {
    const num = Math.min(count, 3);
    if (num === 0)
        return '';
    let html = '<div class="ev-card__avatars">';
    for (let i = 0; i < num; i++) {
        html += `<div class="ev-card__avatar" style="background:${AVATAR_COLORS[i]}"></div>`;
    }
    return html + '</div>';
}
function buildEventCard(event, index) {
    const isFree = event.price === 0 || event.price === 0 || event.price == null;
    const price = isFree ? 'Free' : `₹${event.price}`;
    const d = new Date(event.date);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const going = event._count?.registrations ?? 0;
    const imgSrc = event.bannerUrl || event.imageUrl || '';
    const grad = pickGradient(event.title);
    const isTeam = event.maxTeamSize > 1;
    // Type info
    const typeInfo = event.eventType
        ? `<div class="ev-card__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z"/></svg>
        <span>${event.eventType}</span>
       </div>`
        : '';
    // Team info
    const teamInfo = isTeam
        ? `<div class="ev-card__meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Team ≤${event.maxTeamSize}</span>
       </div>`
        : '';
    // Deadline info
    let deadlineInfo = '';
    if (event.registrationDeadline) {
        const dl = new Date(event.registrationDeadline);
        const closed = dl < new Date();
        const dlStr = dl.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        deadlineInfo = `<div class="ev-card__meta-item" ${closed ? 'style="color:var(--clr-error,#dc2626)"' : ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${closed ? 'Reg. Closed' : `Closes ${dlStr}`}</span>
      </div>`;
    }
    // Slots info
    let slotsInfo = '';
    if (event.maxRegistrations != null) {
        const filled = event.currentRegistrations ?? event._count?.registrations ?? 0;
        const remaining = event.maxRegistrations - filled;
        const full = remaining <= 0;
        slotsInfo = `<div class="ev-card__meta-item" ${full ? 'style="color:var(--clr-error,#dc2626)"' : ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        <span>${full ? 'Seats Full' : `${filled}/${event.maxRegistrations} seats`}</span>
      </div>`;
    }
    return `
<div class="ev-card" role="listitem" style="animation-delay:${index * 80}ms">
  <div class="ev-card__image" style="background:${grad}">
    ${imgSrc ? `<img src="${imgSrc}" alt="${event.title}" loading="lazy"/>` : ''}
    <div class="ev-card__badges">
      <span class="ev-card__badge ${isFree ? 'ev-card__badge--free' : 'ev-card__badge--paid'}">${price}</span>
    </div>
    <button class="ev-card__bookmark" aria-label="Bookmark event">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
  </div>
  <div class="ev-card__body">
    <h3 class="ev-card__title">${event.title || 'Untitled Event'}</h3>
    <div class="ev-card__venue">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>${event.venue || 'TBA'}</span>
    </div>
    <div class="ev-card__meta">
      ${event.date ? `
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
        ${buildAvatarStrip(going)}
        <span class="ev-card__going">${going > 0 ? `${going}+ going` : 'Be the first!'}</span>
      </div>
      <a href="/event-detail.html?id=${event.id}" class="ev-card__register" id="registerBtn-${event.id}">
        ${isTeam ? 'Register Team →' : 'Register Now →'}
      </a>
    </div>
  </div>
</div>`;
}
function renderEmptyState(container, message = 'No events found.') {
    container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">🎭</div>
      <h3 class="empty-state__title">Nothing here yet</h3>
      <p class="empty-state__msg">${message}</p>
    </div>`;
}
// ─── Navbar Behaviour ─────────────────────────────────────────────
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('navbar--scrolled', window.scrollY > 20);
        }, { passive: true });
    }
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    hamburger?.addEventListener('click', () => {
        const open = navLinks?.classList.toggle('navbar__links--open') ?? false;
        hamburger.classList.toggle('hamburger--open', open);
    });
    // Mark active link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') ?? '';
        if (href === currentPath || (currentPath === '/' && href === '/') || (href !== '/' && currentPath.includes(href.replace('.html', '')))) {
            link.classList.add('nav-link--active');
        }
    });
    // Logo and Home link scroll to top on home page
    const homeLinks = document.querySelectorAll('.navbar__logo, #navHome');
    homeLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const currentPath = window.location.pathname;
            // Support local dev server paths (e.g., /src/public/index.html)
            if (currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('/public/')) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}
// ─── Init on DOM Ready ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ThemeSystem.init();
    initNavbar();
});
