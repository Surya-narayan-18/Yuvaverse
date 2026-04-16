import { checkAuth } from './authGuard.js';
const token = checkAuth();

// All valid kanban statuses (including REJECTED)
const ALL_STATUSES = ['NEW', 'SHORTLISTED', 'INTERVIEWED', 'RECRUITED', 'REJECTED'];

// ── Toast helper ─────────────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className   = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadApplications();
  setupDragAndDrop();
});

async function loadApplications() {
  try {
    const res  = await fetch('/api/admin/applications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const apps = json.data || [];

    // Clear all columns
    document.querySelectorAll('.kanban-items').forEach(e => (e.innerHTML = ''));

    // Count per status
    const counts = Object.fromEntries(ALL_STATUSES.map(s => [s, 0]));

    apps.forEach((app) => {
      if (!ALL_STATUSES.includes(app.status)) return;
      counts[app.status]++;

      const card = createCard(app);
      const container = document.querySelector(`.kanban-items[data-status="${app.status}"]`);
      container?.appendChild(card);
    });

    // Update count badges
    ALL_STATUSES.forEach(status => {
      const el = document.getElementById(`count-${status}`);
      if (el) el.textContent = counts[status].toString();
    });
  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

function createCard(app) {
  const card     = document.createElement('div');
  card.className = 'kanban-card';
  card.draggable = true;
  card.dataset.id = app.id;

  // Show reject button only for non-rejected cards
  const rejectBtn = app.status !== 'REJECTED'
    ? `<button class="reject-btn" data-id="${app.id}">✕ Reject</button>`
    : '';

  card.innerHTML = `
    <h4>${app.name}</h4>
    <p>${app.email}</p>
    <span class="role">${app.roleAppliedFor}</span>
    ${rejectBtn}
  `;

  // Drag events
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', app.id);
    card.style.opacity = '0.5';
  });
  card.addEventListener('dragend', () => {
    card.style.opacity = '1';
  });

  // Reject button — fast path directly calls updateStatus
  card.querySelector('.reject-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await updateStatus(app.id, 'REJECTED');
  });

  return card;
}

function setupDragAndDrop() {
  const columns = document.querySelectorAll('.kanban-items');
  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const newStatus = col.dataset.status;
      const appId     = e.dataTransfer?.getData('text/plain');
      if (!newStatus || !appId) return;

      // Optimistic UI — move card immediately
      const card = document.querySelector(`.kanban-card[data-id="${appId}"]`);
      if (card) col.appendChild(card);

      await updateStatus(appId, newStatus);
    });
  });
}

async function updateStatus(appId, newStatus) {
  try {
    const res = await fetch(`/api/admin/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Update failed');
    showToast(`✅ Status updated to ${newStatus}`, 'success');
    loadApplications(); // reload to reflect new card state (reject btn, etc.)
  } catch (error) {
    showToast('❌ Failed to update status', 'error');
    loadApplications(); // revert
  }
}
