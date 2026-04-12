// ================================================================
// YUVAVERSE — MAIN.TS  (Global utilities — module: None)
// Compiles to src/public/js/main.js
// Included FIRST in every HTML page via <script src="/js/main.js">
// ================================================================

// ─── Types (shared across all pages) ─────────────────────────────

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  price: number;
  imageUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  _count?: { registrations: number };
}

interface PaginationData {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

// ─── Theme System ─────────────────────────────────────────────────

const ThemeSystem = (() => {
  const KEY = 'yuvaverse-theme';
  const root = document.documentElement;

  function getPreferred(): 'dark' | 'light' {
    const stored = localStorage.getItem(KEY) as 'dark' | 'light' | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme: 'dark' | 'light'): void {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  function toggle(): void {
    const current = (root.getAttribute('data-theme') ?? 'light') as 'dark' | 'light';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function init(): void {
    apply(getPreferred());
    document.getElementById('themeToggle')?.addEventListener('click', toggle);
  }

  return { init, apply, toggle };
})();

// ─── Toast Notification System ────────────────────────────────────

const ToastSystem = (() => {
  type ToastType = 'success' | 'error' | 'info';

  const ICONS: Record<ToastType, string> = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="#3498DB" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const TITLES: Record<ToastType, string> = {
    success: 'Success',
    error:   'Error',
    info:    'Info',
  };

  function show(message: string, type: ToastType = 'info', duration = 4500): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${ICONS[type]}</span>
      <div class="toast__body">
        <div class="toast__title">${TITLES[type]}</div>
        <div class="toast__msg">${message}</div>
      </div>`;

    container.appendChild(toast);

    const remove = (): void => {
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

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const json = await res.json() as ApiResponse<T>;
    return json;
  }

  async function get<T>(path: string, token?: string): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, token);
  }

  async function post<T>(path: string, body: unknown, token?: string): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body, token);
  }

  return { get, post };
})();

// ─── Skeleton Loader ──────────────────────────────────────────────

function renderSkeletonCards(container: HTMLElement, count = 3): void {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="event-card event-card--skeleton" aria-hidden="true">
      <div class="skeleton skeleton--image"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--text"></div>
      <div class="skeleton skeleton--text skeleton--text--short"></div>
      <div class="skeleton skeleton--btn"></div>
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

function buildEventCard(event: EventData, index: number): string {
  const date = new Date(event.date);
  const day   = date.getDate().toString().padStart(2,'0');
  const month = date.toLocaleString('en-IN',{ month:'short' }).toUpperCase();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const priceLabel = event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`;
  const badgeClass = event.price === 0 ? 'badge--free' : 'badge--price';
  const regCount = event._count?.registrations ?? 0;
  const seatsLabel = regCount > 50 ? `<span class="badge badge--live"><span class="live-dot"></span>Filling Fast</span>` : '';
  const bannerSrc = event.bannerUrl ?? event.imageUrl;
  const imgHtml = bannerSrc
    ? `<img src="${bannerSrc}" alt="${event.title}" loading="lazy"/>`
    : '';

  return `
  <article class="event-card fade-up" style="animation-delay:${index * 80}ms">
    <div class="event-card__image" style="--card-gradient:${gradient}">
      ${imgHtml}
      <div class="event-card__badges">
        <span class="badge ${badgeClass}">${priceLabel}</span>
        ${seatsLabel}
      </div>
      <div class="event-card__date-chip">
        <span class="date-chip__day">${day}</span>
        <span class="date-chip__month">${month}</span>
      </div>
    </div>
    <div class="event-card__body">
      <h3 class="event-card__title">${event.title}</h3>
      <p class="event-card__venue">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${event.venue}
      </p>
      <p class="event-card__desc">${event.description}</p>
      <div class="event-card__footer">
        <span class="event-card__registrations">${regCount} registered</span>
        <a href="/event-detail.html?id=${event.id}" class="btn btn--accent btn--sm">Register Now</a>
      </div>
    </div>
  </article>`;
}

function renderEmptyState(container: HTMLElement, message = 'No events found.'): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">🎭</div>
      <h3 class="empty-state__title">Nothing here yet</h3>
      <p class="empty-state__msg">${message}</p>
    </div>`;
}

// ─── Navbar Behaviour ─────────────────────────────────────────────

function initNavbar(): void {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('navbar--scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  hamburger?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('navbar__links--open') ?? false;
    hamburger.classList.toggle('hamburger--open', open);
  });

  // Mark active link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') ?? '';
    if (href === currentPath || (currentPath === '/' && href === '/') || (href !== '/' && currentPath.includes(href.replace('.html','')))) {
      link.classList.add('nav-link--active');
    }
  });
}

// ─── Init on DOM Ready ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  ThemeSystem.init();
  initNavbar();
});
