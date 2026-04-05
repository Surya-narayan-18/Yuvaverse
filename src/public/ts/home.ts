// ================================================================
// YUVAVERSE — HOME.TS
// Fetches the next 3 upcoming events for the homepage grid
// ================================================================

(function () {
  async function loadUpcomingEvents(): Promise<void> {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;

    renderSkeletonCards(grid, 3);

    const res = await ApiClient.get<{ events: EventData[] }>('/events?limit=3');

    if (!res.success || !res.data.events.length) {
      renderEmptyState(grid, 'Stay tuned — exciting events are coming soon!');
      return;
    }

    grid.innerHTML = res.data.events.map((ev, i) => buildEventCard(ev, i)).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadUpcomingEvents().catch(() => {
      const grid = document.getElementById('eventsGrid');
      if (grid) renderEmptyState(grid, 'Could not load events. Please try again later.');
    });

    // Smooth scroll for hero CTA
    document.getElementById('scrollDown')?.addEventListener('click', () => {
      document.getElementById('upcoming')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
