import { checkAuth } from './authGuard.js';

const token = checkAuth();
let allRegistrations: RegistrationRow[] = [];
let filteredRegistrations: RegistrationRow[] = [];

interface RegistrationRow {
  id: string;
  studentName: string;
  studentEmail: string;
  collegeId: string;
  status: string;
  razorpayPaymentId: string | null;
  customAnswers: Record<string, string> | null;
  createdAt: string;
  eventId: string;
  event?: { id: string; title: string };
}

interface EventOption {
  id: string;
  title: string;
}

document.addEventListener('DOMContentLoaded', () => {
  loadEventsDropdown();
  loadRegistrations();

  // Client-side search (applies within current event filter)
  document.getElementById('search-filter')?.addEventListener('input', (e) => {
    const term = (e.target as HTMLInputElement).value.toLowerCase();
    const base = filteredRegistrations;
    const searched = base.filter(r =>
      r.studentName.toLowerCase().includes(term) ||
      r.studentEmail.toLowerCase().includes(term)
    );
    renderTable(searched);
  });

  // Event filter dropdown
  document.getElementById('event-filter')?.addEventListener('change', (e) => {
    const selectedEventId = (e.target as HTMLSelectElement).value;
    applyEventFilter(selectedEventId);
  });

  // CSV export — uses currently filtered data
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    if (!filteredRegistrations.length) return alert('No data to export');

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
});

// ── Load events into dropdown ─────────────────────────────────────────────────
async function loadEventsDropdown(): Promise<void> {
  try {
    const res  = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json() as { data: EventOption[] };
    const select = document.getElementById('event-filter') as HTMLSelectElement;
    if (!select || !json.data) return;

    // Clear existing options except "All Events"
    select.innerHTML = '<option value="">All Events</option>';
    json.data.forEach(ev => {
      const opt = document.createElement('option');
      opt.value       = ev.id;
      opt.textContent = ev.title;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load events dropdown:', err);
  }
}

// ── Load all registrations ────────────────────────────────────────────────────
async function loadRegistrations(): Promise<void> {
  try {
    const res  = await fetch('/api/admin/registrations', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json() as { data: RegistrationRow[] };
    allRegistrations      = json.data || [];
    filteredRegistrations = [...allRegistrations];
    renderTable(filteredRegistrations);
  } catch (error) {
    console.error('Error loading registrations:', error);
  }
}

// ── Apply event filter ────────────────────────────────────────────────────────
function applyEventFilter(eventId: string): void {
  filteredRegistrations = eventId
    ? allRegistrations.filter(r => r.eventId === eventId || r.event?.id === eventId)
    : [...allRegistrations];

  // Clear search box when changing event filter
  const searchEl = document.getElementById('search-filter') as HTMLInputElement;
  if (searchEl) searchEl.value = '';

  renderTable(filteredRegistrations);
}

function getSelectedEventName(): string {
  const select = document.getElementById('event-filter') as HTMLSelectElement;
  return select?.options[select.selectedIndex]?.text?.replace('All Events', '') ?? '';
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(data: RegistrationRow[]): void {
  const tbody = document.getElementById('regs-tbody');
  if (!tbody) return;
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
      const id = (e.target as HTMLButtonElement).dataset.id;
      if (confirm('Are you sure you want to trigger a refund via Razorpay?')) {
        await triggerRefund(id!);
      }
    });
  });
}

// ── Refund ────────────────────────────────────────────────────────────────────
async function triggerRefund(id: string): Promise<void> {
  try {
    const res  = await fetch(`/api/admin/registrations/${id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json() as { success: boolean; error?: string };
    if (json.success) {
      alert('Refund successful!');
      loadRegistrations();
    } else {
      alert('Refund failed: ' + json.error);
    }
  } catch (error) {
    alert('Error connecting to refund endpoint');
  }
}
