import { checkAuth } from './authGuard.js';
const token = checkAuth();
document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    setupDragAndDrop();
});
async function loadApplications() {
    try {
        const res = await fetch('/api/admin/applications', { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        const apps = json.data || [];
        // Clear existing
        document.querySelectorAll('.kanban-items').forEach(e => (e.innerHTML = ''));
        // Distribute
        const counts = { NEW: 0, SHORTLISTED: 0, INTERVIEWED: 0, RECRUITED: 0, REJECTED: 0 };
        apps.forEach((app) => {
            if (counts[app.status] !== undefined) {
                counts[app.status]++;
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.draggable = true;
                card.dataset.id = app.id;
                card.innerHTML = `
          <h4>${app.name}</h4>
          <p>${app.email}</p>
          <span class="role">${app.roleAppliedFor}</span>
          ${app.status !== 'REJECTED' ? `<button class="reject-btn" data-id="${app.id}">Reject</button>` : ''}
        `;
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer?.setData('text/plain', app.id);
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                });
                // Reject button logic
                const rejectBtn = card.querySelector('.reject-btn');
                if (rejectBtn) {
                    rejectBtn.addEventListener('click', async () => {
                        if (confirm(`Are you sure you want to reject ${app.name}?`)) {
                            await updateApplicationStatus(app.id, 'REJECTED');
                        }
                    });
                }
                const container = document.querySelector(`.kanban-items[data-status="${app.status}"]`);
                container?.appendChild(card);
            }
        });
        // Update counts
        Object.keys(counts).forEach(status => {
            const el = document.getElementById(`count-${status}`);
            if (el)
                el.textContent = counts[status].toString();
        });
    }
    catch (error) {
        console.error('Error loading applications:', error);
    }
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
            const targetCol = col;
            const newStatus = targetCol.dataset.status;
            const appId = e.dataTransfer?.getData('text/plain');
            if (!newStatus || !appId)
                return;
            // Optimistic UI move
            const card = document.querySelector(`.kanban-card[data-id="${appId}"]`);
            if (card)
                targetCol.appendChild(card);
            // Async Update DB
            await updateApplicationStatus(appId, newStatus);
        });
    });
}
async function updateApplicationStatus(appId, newStatus) {
    try {
        const res = await fetch(`/api/admin/applications/${appId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) {
            throw new Error('Update failed');
        }
        // Update UI
        loadApplications();
    }
    catch (error) {
        alert('Failed to update status on server');
        loadApplications(); // revert UI via reload
    }
}
