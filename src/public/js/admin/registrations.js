import { checkAuth } from './authGuard.js';
const token = checkAuth();
let allRegistrations = [];
let filteredRegistrations = [];
let allTeams = [];
let filteredTeams = [];
// Pagination state for individual registrations
let currentPage = 1;
let totalPages = 1;
const PAGE_LIMIT = 20;
// Active filters (applied server-side for pagination)
let filterEventId = '';
let filterStatus = '';
let filterSearch = '';
document.addEventListener('DOMContentLoaded', () => {
    loadEventsDropdown();
    loadRegistrations();
    // Client-side search → reset to page 1, reload
    document.getElementById('search-filter')?.addEventListener('input', (e) => {
        filterSearch = e.target.value.toLowerCase();
        currentPage = 1;
        loadRegistrations();
    });
    // Event filter dropdown
    document.getElementById('event-filter')?.addEventListener('change', (e) => {
        filterEventId = e.target.value;
        currentPage = 1;
        loadRegistrations();
    });
    // Status filter dropdown
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        filterStatus = e.target.value;
        currentPage = 1;
        loadRegistrations();
    });
    // Teams logic
    setupTabs();
    loadTeamsDropdown();
    loadTeams();
    // Client-side search for teams
    document.getElementById('team-search-filter')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const searched = filteredTeams.filter(t => t.teamName.toLowerCase().includes(term) ||
            t.leaderName.toLowerCase().includes(term) ||
            t.leaderEmail.toLowerCase().includes(term));
        renderTeamsTable(searched);
    });
    // Event filter for teams
    document.getElementById('team-event-filter')?.addEventListener('change', (e) => {
        applyTeamEventFilter(e.target.value);
    });
    // Status filter for teams
    document.getElementById('team-status-filter')?.addEventListener('change', (e) => {
        applyTeamStatusFilter(e.target.value);
    });
    // CSV export — fetch all matching registrations across all pages
    document.getElementById('export-csv-btn')?.addEventListener('click', async () => {
        try {
            // Provide visual feedback
            const btn = document.getElementById('export-csv-btn');
            if (btn)
                btn.textContent = 'Exporting...';
            // Fetch all registrations
            const res = await fetch('/api/admin/registrations?page=1&limit=99999', { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            let rows = json.data?.registrations || [];
            // Apply current filters client-side
            if (filterEventId)
                rows = rows.filter(r => r.eventId === filterEventId || r.event?.id === filterEventId);
            if (filterStatus)
                rows = rows.filter(r => r.status === filterStatus);
            if (filterSearch)
                rows = rows.filter(r => r.studentName.toLowerCase().includes(filterSearch) ||
                    r.studentEmail.toLowerCase().includes(filterSearch) ||
                    (r.collegeId && r.collegeId.toLowerCase().includes(filterSearch)));
            if (!rows.length) {
                if (btn)
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export to CSV';
                return alert('No data to export matching current filters.');
            }
            const eventName = getSelectedEventName();
            const headers = ['Date', 'Student Name', 'Student Email', 'College ID', 'Event', 'Status', 'Payment ID', 'Custom Answers'];
            const csvRows = [headers.join(',')];
            rows.forEach(r => {
                const date = new Date(r.createdAt).toLocaleDateString();
                const customStr = r.customAnswers ? JSON.stringify(r.customAnswers).replace(/"/g, '""') : '';
                const row = [
                    date,
                    `"${r.studentName}"`,
                    `"${r.studentEmail}"`,
                    `"${r.collegeId || ''}"`,
                    `"${r.event?.title || 'Unknown'}"`,
                    r.status,
                    r.razorpayPaymentId || '',
                    `"${customStr}"`
                ];
                csvRows.push(row.join(','));
            });
            const csvData = csvRows.join('\n');
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = eventName
                ? `registrations_${eventName.replace(/\s+/g, '_')}_${Date.now()}.csv`
                : `registrations_all_${Date.now()}.csv`;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            if (btn)
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export to CSV';
        }
        catch (error) {
            console.error('Export error:', error);
            alert('Failed to export CSV due to a network error.');
            const btn = document.getElementById('export-csv-btn');
            if (btn)
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export to CSV';
        }
    });
    // Broadcast modal
    setupBroadcastModal();
});
// ── Load events into dropdown ─────────────────────────────────────────────────
async function loadEventsDropdown() {
    try {
        const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const select = document.getElementById('event-filter');
        if (!select || !json.data)
            return;
        select.innerHTML = '<option value="">All Events</option>';
        json.data.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            opt.textContent = ev.title;
            select.appendChild(opt);
        });
    }
    catch (err) {
        console.error('Failed to load events dropdown:', err);
    }
}
// ── Load registrations (paginated) ────────────────────────────────────────────
async function loadRegistrations() {
    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(PAGE_LIMIT),
        });
        const res = await fetch(`/api/admin/registrations?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        let rows = json.data?.registrations || [];
        // Client-side filtering (on top of server pagination)
        if (filterEventId)
            rows = rows.filter(r => r.eventId === filterEventId || r.event?.id === filterEventId);
        if (filterStatus)
            rows = rows.filter(r => r.status === filterStatus);
        if (filterSearch)
            rows = rows.filter(r => r.studentName.toLowerCase().includes(filterSearch) ||
                r.studentEmail.toLowerCase().includes(filterSearch) ||
                (r.collegeId && r.collegeId.toLowerCase().includes(filterSearch)));
        allRegistrations = rows;
        filteredRegistrations = rows;
        totalPages = json.data?.pagination?.totalPages ?? 1;
        currentPage = json.data?.pagination?.currentPage ?? 1;
        renderTable(filteredRegistrations);
        renderPagination();
    }
    catch (error) {
        console.error('Error loading registrations:', error);
    }
}
// ── Pagination Controls ───────────────────────────────────────────────────────
function renderPagination() {
    let bar = document.getElementById('regs-pagination');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'regs-pagination';
        bar.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin:1rem 0 0.5rem;flex-wrap:wrap;';
        const tbody = document.getElementById('regs-tbody');
        tbody?.closest('table')?.before(bar);
    }
    const from = totalPages === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
    const to = Math.min(currentPage * PAGE_LIMIT, (currentPage - 1) * PAGE_LIMIT + filteredRegistrations.length);
    bar.innerHTML = `
      <span style="font-size:0.85rem;color:#6b7280;flex:1;">
        Showing <strong>${from}–${to}</strong> of page <strong>${currentPage}</strong> / ${totalPages}
        &nbsp;(${PAGE_LIMIT} per page)
      </span>
      <button id="reg-prev" style="padding:0.35rem 0.85rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;"
        ${currentPage <= 1 ? 'disabled style="opacity:.4;cursor:default;"' : ''}>← Prev</button>
      <button id="reg-next" style="padding:0.35rem 0.85rem;border:1px solid #d1d5db;border-radius:6px;background:#111827;color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;"
        ${currentPage >= totalPages ? 'disabled style="opacity:.4;cursor:default;background:#d1d5db;"' : ''}>Next →</button>
    `;
    document.getElementById('reg-prev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadRegistrations();
        }
    });
    document.getElementById('reg-next')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadRegistrations();
        }
    });
}
function getSelectedEventName() {
    const select = document.getElementById('event-filter');
    return select?.options[select.selectedIndex]?.text?.replace('All Events', '') ?? '';
}
// ── Render individual registrations table ─────────────────────────────────────
function renderTable(data) {
    const tbody = document.getElementById('regs-tbody');
    if (!tbody)
        return;
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem;">No registrations found.</td></tr>`;
        return;
    }
    data.forEach((r) => {
        const date = new Date(r.createdAt).toLocaleDateString();
        // Formatting JSON Custom Answers
        let answersHtml = '<span style="color:#9ca3af; font-size:0.8em;">None</span>';
        if (r.customAnswers && Object.keys(r.customAnswers).length > 0) {
            answersHtml = Object.entries(r.customAnswers)
                .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
                .join('');
        }
        // Status Badge
        let badgeClass = 'badge-pending';
        if (r.status === 'SUCCESS')
            badgeClass = 'badge-success';
        else if (r.status === 'FAILED')
            badgeClass = 'badge-failed';
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${date}</td>
      <td>
        <strong>${r.studentName}</strong><br/>
        <span style="font-size:0.8rem; color:var(--text-secondary)">${r.studentEmail}</span>
        ${r.studentPhone ? `<br/><span style="font-size:0.8rem; color:var(--text-secondary)">📞 ${r.studentPhone}</span>` : ''}
      </td>
      <td style="font-size:0.85rem;">${r.collegeId || '<span style="color:#9ca3af">—</span>'}</td>
      <td>${r.event?.title || '-'}</td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td style="font-size:0.8rem;">${answersHtml}</td>
      <td>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <select class="status-select" data-id="${r.id}" data-type="individual"
            style="padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;"
            ${r.status === 'SUCCESS' ? 'disabled title="Successful registrations cannot be changed"' : ''}>
            <option value="PENDING" ${r.status === 'PENDING' ? 'selected' : ''}>Pending</option>
            <option value="SUCCESS" ${r.status === 'SUCCESS' ? 'selected' : ''}>Success</option>
            <option value="FAILED" ${r.status === 'FAILED' ? 'selected' : ''}>Failed</option>
          </select>
          <button class="btn-delete-reg" data-id="${r.id}" style="background:#fff;color:#dc2626;padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;" title="Delete Registration"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></button>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });
    // Attach status change listeners
    document.querySelectorAll('.status-select[data-type="individual"]').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const select = e.target;
            const id = select.dataset.id;
            const newStatus = select.value;
            // Find previous value
            const prevValue = [...select.options].find(o => o.value !== newStatus && o.defaultSelected)?.value
                || [...select.options].find(o => o.value !== newStatus)?.value;
            showConfirmModal(`Change Status to "${newStatus}"?`, `This will update the registration status to <strong>${newStatus}</strong>. Do you want to continue?`, async () => {
                await updateIndividualStatus(id, newStatus, select);
            }, () => {
                // Revert to previous selection
                select.value = prevValue || 'PENDING';
            });
        });
    });
    // Attach delete listeners
    document.querySelectorAll('.btn-delete-reg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showConfirmModal('Delete Registration?', 'Are you sure you want to permanently delete this registration? This action cannot be undone.', () => {
                deleteIndividualRegistration(id);
            }, () => { } // Do nothing on cancel
            );
        });
    });
}
// ── Delete individual registration ────────────────────────────────────────────
async function deleteIndividualRegistration(id) {
    try {
        const res = await fetch(`/api/admin/registrations/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            showToast('Registration deleted successfully', 'success');
            loadRegistrations(); // Reload the table
        }
        else {
            showToast('Failed to delete registration: ' + (json.error || 'Unknown error'), 'error');
        }
    }
    catch (error) {
        showToast('Network error while deleting registration', 'error');
    }
}
// ── Update individual registration status ─────────────────────────────────────
async function updateIndividualStatus(id, status, selectEl) {
    try {
        const res = await fetch(`/api/admin/registrations/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Status updated to ${status}`, 'success');
            // Update the registration in local data
            const idx = allRegistrations.findIndex(r => r.id === id);
            if (idx !== -1)
                allRegistrations[idx].status = status;
            const fidx = filteredRegistrations.findIndex(r => r.id === id);
            if (fidx !== -1)
                filteredRegistrations[fidx].status = status;
            // Update badge in the same row
            const row = selectEl?.closest('tr');
            if (row) {
                const badge = row.querySelector('.badge');
                if (badge) {
                    badge.className = `badge ${status === 'SUCCESS' ? 'badge-success' : status === 'FAILED' ? 'badge-failed' : 'badge-pending'}`;
                    badge.textContent = status;
                }
            }
        }
        else {
            showToast('Failed to update status: ' + (json.error || 'Unknown error'), 'error');
            loadRegistrations();
        }
    }
    catch (error) {
        showToast('Network error while updating status', 'error');
        loadRegistrations();
    }
}
// ── Tab Switching ─────────────────────────────────────────────────────────────
function setupTabs() {
    const tabInd = document.getElementById('tab-individual');
    const tabTeam = document.getElementById('tab-teams');
    const pnlInd = document.getElementById('panel-individual');
    const pnlTeam = document.getElementById('panel-teams');
    if (!tabInd || !tabTeam || !pnlInd || !pnlTeam)
        return;
    tabInd.addEventListener('click', () => {
        tabInd.classList.add('active');
        tabTeam.classList.remove('active');
        pnlInd.style.display = 'block';
        pnlTeam.style.display = 'none';
    });
    tabTeam.addEventListener('click', () => {
        tabTeam.classList.add('active');
        tabInd.classList.remove('active');
        pnlTeam.style.display = 'block';
        pnlInd.style.display = 'none';
    });
}
// ── Load teams into dropdown ──────────────────────────────────────────────────
async function loadTeamsDropdown() {
    try {
        const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const select = document.getElementById('team-event-filter');
        if (!select || !json.data)
            return;
        select.innerHTML = '<option value="">All Events</option>';
        json.data.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            opt.textContent = ev.title;
            select.appendChild(opt);
        });
    }
    catch (err) {
        console.error('Failed to load teams dropdown:', err);
    }
}
// ── Load all teams ────────────────────────────────────────────────────────────
async function loadTeams() {
    try {
        const res = await fetch('/api/admin/teams', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        allTeams = json.data || [];
        filteredTeams = [...allTeams];
        renderTeamsTable(filteredTeams);
    }
    catch (error) {
        console.error('Error loading teams:', error);
    }
}
// ── Apply team event filter ───────────────────────────────────────────────────
function applyTeamEventFilter(eventId) {
    const statusId = document.getElementById('team-status-filter')?.value || '';
    let base = eventId
        ? allTeams.filter(t => t.eventId === eventId || t.event?.id === eventId)
        : [...allTeams];
    filteredTeams = statusId ? base.filter(t => t.status === statusId) : base;
    const searchEl = document.getElementById('team-search-filter');
    if (searchEl)
        searchEl.value = '';
    renderTeamsTable(filteredTeams);
}
// ── Apply team status filter ──────────────────────────────────────────────────
function applyTeamStatusFilter(status) {
    const eventId = document.getElementById('team-event-filter')?.value || '';
    let base = eventId
        ? allTeams.filter(t => t.eventId === eventId || t.event?.id === eventId)
        : [...allTeams];
    filteredTeams = status ? base.filter(t => t.status === status) : base;
    renderTeamsTable(filteredTeams);
}
// ── Render teams table ────────────────────────────────────────────────────────
function renderTeamsTable(data) {
    const tbody = document.getElementById('teams-tbody');
    if (!tbody)
        return;
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:2rem;">No team registrations found.</td></tr>`;
        return;
    }
    data.forEach((t) => {
        const date = new Date(t.createdAt).toLocaleDateString();
        let membersHtml = '<span style="color:#9ca3af; font-size:0.8em;">No extra members</span>';
        if (t.members && t.members.length > 0) {
            membersHtml = t.members.map(m => `<div>${m.name} <span style="color:#6b7280;font-size:0.85em;">(${m.email})</span></div>`).join('');
        }
        let badgeClass = 'badge-pending';
        if (t.status === 'SUCCESS')
            badgeClass = 'badge-success';
        else if (t.status === 'FAILED')
            badgeClass = 'badge-failed';
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${date}</td>
      <td><strong>${t.teamName}</strong><br><span style="font-size:0.8rem;color:#6b7280">${t.memberCount} members</span></td>
      <td>
        <strong>${t.leaderName}</strong><br/>
        <span style="font-size:0.8rem; color:var(--text-secondary)">${t.leaderEmail}</span>
      </td>
      <td style="font-size:0.85rem;">${membersHtml}</td>
      <td>${t.event?.title || '-'}</td>
      <td><span class="badge ${badgeClass}">${t.status}</span></td>
      <td><span style="font-size:0.85rem;color:#4b5563;">${t.razorpayPaymentId || '-'}</span></td>
      <td>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <select class="status-select" data-id="${t.id}" data-type="team"
            style="padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;"
            ${t.status === 'SUCCESS' ? 'disabled title="Successful team registrations cannot be changed"' : ''}>
            <option value="PENDING" ${t.status === 'PENDING' ? 'selected' : ''}>Pending</option>
            <option value="SUCCESS" ${t.status === 'SUCCESS' ? 'selected' : ''}>Success</option>
            <option value="FAILED" ${t.status === 'FAILED' ? 'selected' : ''}>Failed</option>
          </select>
          <button class="btn-delete-team" data-id="${t.id}" style="background:#fff;color:#dc2626;padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;" title="Delete Team"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></button>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });
    // Attach status change listeners for teams
    document.querySelectorAll('.status-select[data-type="team"]').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const select = e.target;
            const id = select.dataset.id;
            const newStatus = select.value;
            const prevValue = [...select.options].find(o => o.value !== newStatus && o.defaultSelected)?.value
                || [...select.options].find(o => o.value !== newStatus)?.value;
            showConfirmModal(`Change Team Status to "${newStatus}"?`, `This will update the team registration status to <strong>${newStatus}</strong>. Do you want to continue?`, async () => {
                await updateTeamStatus(id, newStatus, select);
            }, () => {
                select.value = prevValue || 'PENDING';
            });
        });
    });
    // Attach delete listeners
    document.querySelectorAll('.btn-delete-team').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            showConfirmModal('Delete Team Registration?', 'Are you sure you want to permanently delete this team? This action cannot be undone.', () => {
                deleteTeamRegistration(id);
            }, () => { } // Do nothing on cancel
            );
        });
    });
}
// ── Delete team registration ──────────────────────────────────────────────────
async function deleteTeamRegistration(id) {
    try {
        const res = await fetch(`/api/admin/teams/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            showToast('Team deleted successfully', 'success');
            loadTeams(); // Reload the table
        }
        else {
            showToast('Failed to delete team: ' + (json.error || 'Unknown error'), 'error');
        }
    }
    catch (error) {
        showToast('Network error while deleting team', 'error');
    }
}
// ── Update team status ────────────────────────────────────────────────────────
async function updateTeamStatus(id, status, selectEl) {
    try {
        const res = await fetch(`/api/admin/teams/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Team status updated to ${status}`, 'success');
            const idx = allTeams.findIndex(t => t.id === id);
            if (idx !== -1)
                allTeams[idx].status = status;
            const fidx = filteredTeams.findIndex(t => t.id === id);
            if (fidx !== -1)
                filteredTeams[fidx].status = status;
            const row = selectEl?.closest('tr');
            if (row) {
                const badge = row.querySelector('.badge');
                if (badge) {
                    badge.className = `badge ${status === 'SUCCESS' ? 'badge-success' : status === 'FAILED' ? 'badge-failed' : 'badge-pending'}`;
                    badge.textContent = status;
                }
            }
        }
        else {
            showToast('Failed to update team status: ' + (json.error || 'Unknown error'), 'error');
            loadTeams();
        }
    }
    catch (error) {
        showToast('Network error while updating team status', 'error');
        loadTeams();
    }
}
// ── Confirmation Modal ────────────────────────────────────────────────────────
let _confirmYesCb = null;
let _confirmNoCb = null;
function showConfirmModal(title, message, onYes, onNo) {
    let modal = document.getElementById('status-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'status-confirm-modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);align-items:center;justify-content:center;z-index:999;padding:1rem;';
        modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:2rem;max-width:400px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:center;">
        <div style="margin-bottom:0.75rem;display:flex;justify-content:center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <h3 id="scm-title" style="margin:0 0 0.5rem;font-size:1.1rem;color:#111827;"></h3>
        <p id="scm-msg" style="margin:0 0 1.5rem;font-size:0.875rem;color:#6b7280;line-height:1.5;"></p>
        <div style="display:flex;gap:0.75rem;">
          <button id="scm-no" style="flex:1;padding:0.65rem 1rem;border:1px solid #d1d5db;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.9rem;background:#fff;color:#374151;">Cancel</button>
          <button id="scm-yes" style="flex:1;padding:0.65rem 1rem;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.9rem;background:#111827;color:white;">Confirm</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        document.getElementById('scm-yes')?.addEventListener('click', () => {
            if (modal)
                modal.style.display = 'none';
            if (_confirmYesCb)
                _confirmYesCb();
        });
        document.getElementById('scm-no')?.addEventListener('click', () => {
            if (modal)
                modal.style.display = 'none';
            if (_confirmNoCb)
                _confirmNoCb();
        });
    }
    const titleEl = document.getElementById('scm-title');
    const msgEl = document.getElementById('scm-msg');
    if (titleEl)
        titleEl.textContent = title;
    if (msgEl)
        msgEl.innerHTML = message;
    _confirmYesCb = onYes;
    _confirmNoCb = onNo;
    modal.style.display = 'flex';
}
// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast)
        return;
    toast.textContent = msg;
    toast.className = `show ${type}`;
    setTimeout(() => { toast.className = ''; }, 3500);
}
// ── Broadcast Modal ───────────────────────────────────────────────────────────
function setupBroadcastModal() {
    const openBtn = document.getElementById('open-broadcast-btn');
    const closeBtn = document.getElementById('close-broadcast-btn');
    const modal = document.getElementById('broadcast-modal');
    const sendBtn = document.getElementById('broadcast-send-btn');
    openBtn?.addEventListener('click', async () => {
        if (modal)
            modal.classList.add('active');
        // Load stats — fetch page 1 with large limit just to get total count
        try {
            const res = await fetch('/api/admin/registrations?page=1&limit=1', { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            const total = json.data?.pagination?.total ?? 0;
            // For simplicity show total successful from a dedicated endpoint isn't available,
            // so fetch all with high limit for stats (only runs when admin opens modal)
            const statsRes = await fetch('/api/admin/registrations?page=1&limit=9999', { headers: { Authorization: `Bearer ${token}` } });
            const statsJson = await statsRes.json();
            const regs = statsJson.data?.registrations || [];
            const successRegs = regs.filter(r => r.status === 'SUCCESS');
            const uniqueEmails = new Set(successRegs.map(r => r.studentEmail));
            const statUnique = document.getElementById('stat-unique');
            const statTotal = document.getElementById('stat-total');
            const statDupes = document.getElementById('stat-dupes');
            if (statUnique)
                statUnique.textContent = String(uniqueEmails.size);
            if (statTotal)
                statTotal.textContent = String(successRegs.length);
            if (statDupes)
                statDupes.textContent = String(successRegs.length - uniqueEmails.size);
        }
        catch (err) {
            console.error('Failed to load broadcast stats:', err);
        }
    });
    closeBtn?.addEventListener('click', () => {
        if (modal)
            modal.classList.remove('active');
        const bf = document.getElementById('broadcast-form');
        const rc = document.getElementById('result-card');
        if (bf)
            bf.style.display = 'block';
        if (rc)
            rc.style.display = 'none';
    });
    sendBtn?.addEventListener('click', async () => {
        const subject = document.getElementById('broadcast-subject').value.trim();
        const message = document.getElementById('broadcast-message').value.trim();
        if (!subject || !message) {
            showToast('Please enter both subject and message', 'error');
            return;
        }
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending…';
        try {
            const res = await fetch('/api/admin/registrations/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ subject, message })
            });
            const json = await res.json();
            if (json.success && json.data) {
                const bf = document.getElementById('broadcast-form');
                if (bf)
                    bf.style.display = 'none';
                const rc = document.getElementById('result-card');
                if (rc)
                    rc.style.display = 'block';
                const rs = document.getElementById('res-sent');
                const rf = document.getElementById('res-failed');
                if (rs)
                    rs.textContent = String(json.data.emailsSent);
                if (rf)
                    rf.textContent = String(json.data.failed);
            }
            else {
                showToast('Failed: ' + (json.error || 'Unknown error'), 'error');
            }
        }
        catch (err) {
            showToast('Network error while sending broadcast', 'error');
        }
        finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Send Broadcast';
        }
    });
}
