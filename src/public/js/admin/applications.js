"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authGuard_js_1 = require("./authGuard.js");
const token = (0, authGuard_js_1.checkAuth)();
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
        const counts = { NEW: 0, SHORTLISTED: 0, INTERVIEWED: 0, RECRUITED: 0 };
        apps.forEach((app) => {
            // Ignored if REJECTED is added later
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
        `;
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer?.setData('text/plain', app.id);
                    card.style.opacity = '0.5';
                });
                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                });
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
                // Update counts
                loadApplications();
            }
            catch (error) {
                alert('Failed to update status on server');
                loadApplications(); // revert UI via reload
            }
        });
    });
}
