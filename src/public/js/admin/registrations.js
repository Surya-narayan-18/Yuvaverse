import { checkAuth } from './authGuard.js';
const token = checkAuth();

let allRegistrations      = [];
let filteredRegistrations = [];
let allTeams              = [];
let filteredTeams         = [];

// ── Toast helper ─────────────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className   = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 4500);
}

// ── Broadcast modal ───────────────────────────────────────────────────────────
const broadcastModal   = document.getElementById('broadcast-modal');
const broadcastSendBtn = document.getElementById('broadcast-send-btn');

function openBroadcastModal() {
  // Reset compose form and result card
  document.getElementById('broadcast-subject').value = '';
  document.getElementById('broadcast-message').value = '';
  document.getElementById('broadcast-form').style.display  = 'block';
  document.getElementById('result-card').style.display     = 'none';
  broadcastSendBtn.textContent = '📨 Send Broadcast';
  broadcastSendBtn.disabled    = false;

  // Compute live recipient stats from already-loaded registrations
  updateBroadcastStats();

  broadcastModal.classList.add('active');
}

function closeBroadcastModal() {
  broadcastModal.classList.remove('active');
}

function updateBroadcastStats() {
  // Unique emails from SUCCESS registrations in the current allRegistrations cache.
  // This gives the admin an instant preview without an extra API call.
  const successRegs    = allRegistrations.filter(r => r.status === 'SUCCESS');
  const uniqueEmails   = new Set(successRegs.map(r => r.studentEmail));
  const totalSuccess   = successRegs.length;
  const uniqueCount    = uniqueEmails.size;
  const dupesSkipped   = totalSuccess - uniqueCount;

  document.getElementById('stat-unique').textContent = uniqueCount;
  document.getElementById('stat-total').textContent  = totalSuccess;
  document.getElementById('stat-dupes').textContent  = dupesSkipped;
}

document.getElementById('open-broadcast-btn')?.addEventListener('click', openBroadcastModal);
document.getElementById('close-broadcast-btn')?.addEventListener('click', closeBroadcastModal);

// Close on backdrop click
broadcastModal?.addEventListener('click', (e) => {
  if (e.target === broadcastModal) closeBroadcastModal();
});

// Send broadcast
broadcastSendBtn?.addEventListener('click', async () => {
  const subject = document.getElementById('broadcast-subject').value.trim();
  const message = document.getElementById('broadcast-message').value.trim();

  if (!subject || !message) {
    showToast('Please fill in both Subject and Message.', 'error');
    return;
  }

  broadcastSendBtn.textContent = 'Sending…';
  broadcastSendBtn.disabled    = true;

  try {
    const res  = await fetch('/api/admin/registrations/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subject, message }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      // Hide compose form, show success card
      document.getElementById('broadcast-form').style.display = 'none';
      document.getElementById('res-sent').textContent         = json.data?.emailsSent   ?? 0;
      document.getElementById('res-failed').textContent       = json.data?.failed        ?? 0;
      document.getElementById('result-card').style.display    = 'block';
      showToast(`✅ Broadcast sent to ${json.data?.emailsSent ?? 0} unique recipients!`, 'success');
    } else {
      showToast(`❌ ${json.message ?? 'Failed to send broadcast.'}`, 'error');
      broadcastSendBtn.textContent = '📨 Send Broadcast';
      broadcastSendBtn.disabled    = false;
    }
  } catch (err) {
    console.error('Broadcast error:', err);
    showToast('❌ Network error — please try again.', 'error');
    broadcastSendBtn.textContent = '📨 Send Broadcast';
    broadcastSendBtn.disabled    = false;
  }
});

// ── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadEventsDropdown();
  loadRegistrations();
  loadTeams();

  // Tab switching
  document.querySelectorAll('.reg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const which = tab.dataset.tab;
      document.querySelectorAll('.reg-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-individual').style.display = which === 'individual' ? '' : 'none';
      document.getElementById('panel-teams').style.display      = which === 'teams'      ? '' : 'none';
    });
  });

  // Client-side search — individual
  document.getElementById('search-filter')?.addEventListener('input', (e) => {
    const term     = e.target.value.toLowerCase();
    const searched = filteredRegistrations.filter(
      r => r.studentName.toLowerCase().includes(term) ||
           r.studentEmail.toLowerCase().includes(term)
    );
    renderTable(searched);
  });

  // Dropdown filters — individual
  document.getElementById('event-filter')?.addEventListener('change', applyDropdownFilters);
  document.getElementById('status-filter')?.addEventListener('change', applyDropdownFilters);

  // Client-side search — teams
  document.getElementById('team-search-filter')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const searched = filteredTeams.filter(
      t => t.teamName.toLowerCase().includes(term) ||
           t.leaderName.toLowerCase().includes(term) ||
           t.leaderEmail.toLowerCase().includes(term)
    );
    renderTeamsTable(searched);
  });

  // Dropdown filters — teams
  document.getElementById('team-event-filter')?.addEventListener('change', applyTeamFilters);
  document.getElementById('team-status-filter')?.addEventListener('change', applyTeamFilters);

  // CSV export — uses currently active tab's filtered data
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    const activeTab = document.querySelector('.reg-tab.active')?.dataset.tab;
    if (activeTab === 'teams') {
      if (!filteredTeams.length) return alert('No team data to export');
      const headers = ['Date','Team Name','Leader Name','Leader Email','Leader Phone','Members','Event','Status','Payment ID'];
      const csvRows = [headers.join(',')];
      filteredTeams.forEach(t => {
        const date    = new Date(t.createdAt).toLocaleDateString();
        const members = (t.members || []).map(m => `${m.name} <${m.email}>`).join('; ');
        csvRows.push([
          date,
          `"${t.teamName}"`,
          `"${t.leaderName}"`,
          `"${t.leaderEmail}"`,
          `"${t.leaderPhone || ''}"`,
          `"${members}"`,
          `"${t.event?.title || 'Unknown'}"`,
          t.status,
          t.razorpayPaymentId || '',
        ].join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `team_registrations_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      if (!filteredRegistrations.length) return alert('No data to export');
      const eventName = getSelectedEventName();
      const headers   = ['Date','Student Name','Student Email','College ID','Event','Status','Payment ID','Custom Answers'];
      const csvRows   = [headers.join(',')];
      filteredRegistrations.forEach(r => {
        const date      = new Date(r.createdAt).toLocaleDateString();
        const customStr = r.customAnswers ? JSON.stringify(r.customAnswers).replace(/"/g, '""') : '';
        csvRows.push([
          date,
          `"${r.studentName}"`,
          `"${r.studentEmail}"`,
          `"${r.collegeId || ''}"`,
          `"${r.event?.title || 'Unknown'}"`,
          r.status,
          r.razorpayPaymentId || '',
          `"${customStr}"`,
        ].join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = eventName
        ? `registrations_${eventName.replace(/\s+/g,'_')}_${Date.now()}.csv`
        : `registrations_all_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });
});

// ── Load events into dropdown ─────────────────────────────────────────────────
async function loadEventsDropdown() {
  try {
    const res        = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
    const json       = await res.json();
    const select     = document.getElementById('event-filter');
    const teamSelect = document.getElementById('team-event-filter');
    if (!json.data) return;
    const optionsHtml = '<option value="">All Events</option>' +
      json.data.map(ev => `<option value="${ev.id}">${ev.title}</option>`).join('');
    if (select)     select.innerHTML     = optionsHtml;
    if (teamSelect) teamSelect.innerHTML = optionsHtml;
  } catch (err) {
    console.error('Failed to load events dropdown:', err);
  }
}

// ── Load all registrations ────────────────────────────────────────────────────
async function loadRegistrations() {
  try {
    const res            = await fetch('/api/admin/registrations', { headers: { Authorization: `Bearer ${token}` } });
    const json           = await res.json();
    allRegistrations      = json.data || [];
    filteredRegistrations = [...allRegistrations];
    renderTable(filteredRegistrations);
  } catch (error) {
    console.error('Error loading registrations:', error);
  }
}

// ── Apply dropdown filters ────────────────────────────────────────────────────
function applyDropdownFilters() {
  const eventId = document.getElementById('event-filter')?.value || '';
  const statusId = document.getElementById('status-filter')?.value || '';

  filteredRegistrations = allRegistrations.filter(r => {
    const matchEvent = eventId ? (r.eventId === eventId || r.event?.id === eventId) : true;
    const matchStatus = statusId ? (r.status === statusId) : true;
    return matchEvent && matchStatus;
  });

  const searchEl = document.getElementById('search-filter');
  if (searchEl) searchEl.value = '';
  renderTable(filteredRegistrations);
}

function getSelectedEventName() {
  const select = document.getElementById('event-filter');
  return select?.options[select.selectedIndex]?.text?.replace('All Events','') ?? '';
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('regs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem;">No registrations found.</td></tr>`;
    return;
  }
  data.forEach((r) => {
    const date = new Date(r.createdAt).toLocaleDateString();
    let answersHtml = '<span style="color:#9ca3af; font-size:0.8em;">None</span>';
    if (r.customAnswers && Object.keys(r.customAnswers).length > 0) {
      answersHtml = Object.entries(r.customAnswers)
        .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
        .join('');
    }
    let badgeClass = 'badge-pending';
    if (r.status === 'SUCCESS') badgeClass = 'badge-success';
    else if (r.status === 'FAILED') badgeClass = 'badge-failed';

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
        ${r.status === 'SUCCESS' ? `<button class="refund-btn" data-id="${r.id}">Refund</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach refund listeners
  document.querySelectorAll('.refund-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (confirm('Are you sure you want to trigger a refund via Razorpay?')) {
        await triggerRefund(id);
      }
    });
  });
}

// ── Refund ────────────────────────────────────────────────────────────────────
async function triggerRefund(id) {
  try {
    const res  = await fetch(`/api/admin/registrations/${id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) {
      showToast('✅ Refund successful!', 'success');
      loadRegistrations();
    } else {
      showToast('❌ Refund failed: ' + json.error, 'error');
    }
  } catch (error) {
    showToast('❌ Error connecting to refund endpoint', 'error');
  }
}

// ── Load all teams ─────────────────────────────────────────────────────────────
async function loadTeams() {
  try {
    const res  = await fetch('/api/admin/teams', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    allTeams       = json.data || [];
    filteredTeams  = [...allTeams];
    renderTeamsTable(filteredTeams);
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

// ── Apply team dropdown filters ─────────────────────────────────────────
function applyTeamFilters() {
  const eventId  = document.getElementById('team-event-filter')?.value  || '';
  const statusId = document.getElementById('team-status-filter')?.value || '';
  filteredTeams = allTeams.filter(t => {
    const matchEvent  = eventId  ? (t.eventId === eventId || t.event?.id === eventId) : true;
    const matchStatus = statusId ? (t.status === statusId) : true;
    return matchEvent && matchStatus;
  });
  const searchEl = document.getElementById('team-search-filter');
  if (searchEl) searchEl.value = '';
  renderTeamsTable(filteredTeams);
}

// ── Render teams table ────────────────────────────────────────────────────────
function renderTeamsTable(data) {
  const tbody = document.getElementById('teams-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem;">No team registrations found.</td></tr>`;
    return;
  }
  data.forEach(t => {
    const date       = new Date(t.createdAt).toLocaleDateString();
    const members    = (t.members || []).map(m => `<div style="font-size:0.8rem">${m.name} <span style="color:#9ca3af">&lt;${m.email}&gt;</span></div>`).join('');
    let badgeClass   = 'badge-pending';
    if (t.status === 'SUCCESS') badgeClass = 'badge-success';
    else if (t.status === 'FAILED') badgeClass = 'badge-failed';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td>
        <strong>${t.teamName}</strong><br/>
        <span style="font-size:0.78rem;color:var(--text-secondary)">${t.memberCount} member${t.memberCount !== 1 ? 's' : ''}</span>
      </td>
      <td>
        <strong>${t.leaderName}</strong><br/>
        <span style="font-size:0.8rem;color:var(--text-secondary)">${t.leaderEmail}</span><br/>
        <span style="font-size:0.78rem;color:var(--text-secondary)">${t.leaderPhone || ''}</span>
      </td>
      <td style="font-size:0.82rem">${members || '<span style="color:#9ca3af">—</span>'}</td>
      <td>${t.event?.title || '-'}</td>
      <td><span class="badge ${badgeClass}">${t.status}</span></td>
      <td style="font-size:0.78rem;color:#6b7280">${t.razorpayPaymentId || '<span style="color:#9ca3af">Free / N/A</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}
