// ================================================================
// YUVAVERSE — EVENTS.TS
// All-events page: paginated grid with live search
// ================================================================

(function () {
  let currentPage = 1;
  let currentSearch = '';
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const LIMIT = 9;

  async function loadEvents(page: number, search: string): Promise<void> {
    const grid = document.getElementById('eventsGrid');
    const pagination = document.getElementById('pagination');
    if (!grid) return;

    renderSkeletonCards(grid, LIMIT);

    const query = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) query.set('search', search);

    const res = await ApiClient.get<{ events: EventData[]; pagination: PaginationData }>(`/events?${query}`);

    if (!res.success) {
      renderEmptyState(grid, 'Could not load events. Please try again.');
      return;
    }

    const { events, pagination: pg } = res.data;

    if (!events.length) {
      renderEmptyState(grid, search ? `No events match "${search}".` : 'No events available yet. Check back soon!');
      if (pagination) pagination.innerHTML = '';
      return;
    }

    grid.innerHTML = events.map((ev, i) => buildEventCard(ev, i)).join('');
    renderPagination(pg);
  }

  function renderPagination(pg: PaginationData): void {
    const el = document.getElementById('pagination');
    if (!el || pg.totalPages <= 1) { if (el) el.innerHTML = ''; return; }

    const pages: string[] = [];
    for (let i = 1; i <= pg.totalPages; i++) {
      pages.push(`<button class="page-btn${i === pg.currentPage ? ' page-btn--active' : ''}" data-page="${i}">${i}</button>`);
    }

    el.innerHTML = `
      <button class="page-btn page-btn--nav" data-page="${pg.currentPage - 1}" ${pg.currentPage === 1 ? 'disabled' : ''}>&#8592;</button>
      ${pages.join('')}
      <button class="page-btn page-btn--nav" data-page="${pg.currentPage + 1}" ${pg.currentPage === pg.totalPages ? 'disabled' : ''}>&#8594;</button>`;

    el.querySelectorAll<HTMLButtonElement>('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset['page']);
        if (!isNaN(p) && p >= 1 && p <= pg.totalPages) {
          currentPage = p;
          loadEvents(currentPage, currentSearch).catch(() => null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadEvents(currentPage, currentSearch).catch(() => null);

    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        loadEvents(currentPage, currentSearch).catch(() => null);
      }, 380);
    });
  });
})();
