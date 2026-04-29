import { checkAuth } from './authGuard.js';
const token = checkAuth();
let allRegistrations = [];
let filteredRegistrations = [];
let allTeams = [];
let filteredTeams = [];

document.addEventListener('DOMContentLoaded', () => {
    loadEventsDropdown();
    loadRegistrations();

    // Client-side search (applies within current event filter)
    document.getElementById('search-filter')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const base = filteredRegistrations;
        const searched = base.filter(r => r.studentName.toLowerCase().includes(term) ||
            r.studentEmail.toLowerCase().includes(term));
        renderTable(searched);
    });

    // Event filter dropdown
    document.getElementById('event-filter')?.addEventListener('change', (e) => {
        const selectedEventId = e.target.value;
        applyEventFilter(selectedEventId);
    });

    // Status filter dropdown
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        const selectedStatus = e.target.value;
        applyStatusFilter(selectedStatus);
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

    // CSV export — uses currently filtered data
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
        if (!filteredRegistrations.length)
            return alert('No data to export');
        const eventName = getSelectedEventName();
        const headers = ['Date', 'Student Name', 'Student Email', 'College ID', 'Event', 'Status', 'Payment ID', 'Custom Answers'];
        const csvRows = [headers.join(',')];
        filteredRegistrations.forEach(r => {
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

// ── Load all registrations ────────────────────────────────────────────────────
async function loadRegistrations() {
    try {
        const res = await fetch('/api/admin/registrations', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        allRegistrations = json.data || [];
        filteredRegistrations = [...allRegistrations];
        renderTable(filteredRegistrations);
    }
    catch (error) {
        console.error('Error loading registrations:', error);
    }
}

// ── Apply event filter ────────────────────────────────────────────────────────
function applyEventFilter(eventId) {
    filteredRegistrations = eventId
        ? allRegistrations.filter(r => r.eventId === eventId || r.event?.id === eventId)
        : [...allRegistrations];
    const searchEl = document.getElementById('search-filter');
    if (searchEl)
        searchEl.value = '';
    renderTable(filteredRegistrations);
}

// ── Apply status filter ───────────────────────────────────────────────────────
function applyStatusFilter(status) {
    const eventId = document.getElementById('event-filter')?.value || '';
    let base = eventId
        ? allRegistrations.filter(r => r.eventId === eventId || r.event?.id === eventId)
        : [...allRegistrations];
    filteredRegistrations = status ? base.filter(r => r.status === status) : base;
    renderTable(filteredRegistrations);
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
      </td>
      <td style="font-size:0.85rem;">${r.collegeId || '<span style="color:#9ca3af">—</span>'}</td>
      <td>${r.event?.title || '-'}</td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td style="font-size:0.8rem;">${answersHtml}</td>
      <td>
        <select class="status-select" data-id="${r.id}" data-type="individual"
          style="padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;">
          <option value="PENDING" ${r.status === 'PENDING' ? 'selected' : ''}>Pending</option>
          <option value="SUCCESS" ${r.status === 'SUCCESS' ? 'selected' : ''}>Success</option>
          <option value="FAILED" ${r.status === 'FAILED' ? 'selected' : ''}>Failed</option>
        </select>
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
            const oldStatus = select.querySelector(`option[value="${newStatus}"]`);
            // Find previous value
            const prevValue = [...select.options].find(o => o.value !== newStatus && o.defaultSelected)?.value
                || [...select.options].find(o => o.value !== newStatus)?.value;
            showConfirmModal(
                `Change Status to "${newStatus}"?`,
                `This will update the registration status to <strong>${newStatus}</strong>. Do you want to continue?`,
                async () => {
                    await updateIndividualStatus(id, newStatus, select);
                },
                () => {
                    // Revert to previous selection
                    select.value = prevValue || 'PENDING';
                }
            );
        });
    });
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
            if (idx !== -1) allRegistrations[idx].status = status;
            const fidx = filteredRegistrations.findIndex(r => r.id === id);
            if (fidx !== -1) filteredRegistrations[fidx].status = status;
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
        <select class="status-select" data-id="${t.id}" data-type="team"
          style="padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.8rem;cursor:pointer;">
          <option value="PENDING" ${t.status === 'PENDING' ? 'selected' : ''}>Pending</option>
          <option value="SUCCESS" ${t.status === 'SUCCESS' ? 'selected' : ''}>Success</option>
          <option value="FAILED" ${t.status === 'FAILED' ? 'selected' : ''}>Failed</option>
        </select>
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
            showConfirmModal(
                `Change Team Status to "${newStatus}"?`,
                `This will update the team registration status to <strong>${newStatus}</strong>. Do you want to continue?`,
                async () => {
                    await updateTeamStatus(id, newStatus, select);
                },
                () => {
                    select.value = prevValue || 'PENDING';
                }
            );
        });
    });
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
            if (idx !== -1) allTeams[idx].status = status;
            const fidx = filteredTeams.findIndex(t => t.id === id);
            if (fidx !== -1) filteredTeams[fidx].status = status;
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
        <div style="font-size:2rem;margin-bottom:0.75rem;">⚠️</div>
        <h3 id="scm-title" style="margin:0 0 0.5rem;font-size:1.1rem;color:#111827;"></h3>
        <p id="scm-msg" style="margin:0 0 1.5rem;font-size:0.875rem;color:#6b7280;line-height:1.5;"></p>
        <div style="display:flex;gap:0.75rem;">
          <button id="scm-no" style="flex:1;padding:0.65rem 1rem;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.9rem;background:#f3f4f6;color:#374151;">Cancel</button>
          <button id="scm-yes" style="flex:1;padding:0.65rem 1rem;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.9rem;background:#7c3aed;color:white;">Confirm</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        document.getElementById('scm-yes').addEventListener('click', () => {
            modal.style.display = 'none';
            if (_confirmYesCb) _confirmYesCb();
        });
        document.getElementById('scm-no').addEventListener('click', () => {
            modal.style.display = 'none';
            if (_confirmNoCb) _confirmNoCb();
        });
    }
    document.getElementById('scm-title').textContent = title;
    document.getElementById('scm-msg').innerHTML = message;
    _confirmYesCb = onYes;
    _confirmNoCb = onNo;
    modal.style.display = 'flex';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
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
        modal.classList.add('active');
        // Load stats
        try {
            const res = await fetch('/api/admin/registrations', { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            const regs = json.data || [];
            const successRegs = regs.filter(r => r.status === 'SUCCESS');
            const uniqueEmails = new Set(successRegs.map(r => r.studentEmail));
            document.getElementById('stat-unique').textContent = uniqueEmails.size;
            document.getElementById('stat-total').textContent = successRegs.length;
            document.getElementById('stat-dupes').textContent = successRegs.length - uniqueEmails.size;
        }
        catch (err) {
            console.error('Failed to load broadcast stats:', err);
        }
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('broadcast-form').style.display = 'block';
        document.getElementById('result-card').style.display = 'none';
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
            if (json.success) {
                document.getElementById('broadcast-form').style.display = 'none';
                const rc = document.getElementById('result-card');
                rc.style.display = 'block';
                document.getElementById('res-sent').textContent = json.data.emailsSent;
                document.getElementById('res-failed').textContent = json.data.failed;
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
            sendBtn.textContent = '📨 Send Broadcast';
        }
    });
}
