// ================================================================
// YUVAVERSE — ADMIN/EVENTS.TS
// Admin event management: create/edit (with Cloudinary banner upload),
// list (with banner thumbnail + price badge), and delete.
// ================================================================

import { checkAuth } from './authGuard.js';

const token = checkAuth();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modal         = document.getElementById('create-modal') as HTMLDivElement;
const modalTitle    = document.getElementById('modal-title') as HTMLHeadingElement;
const form          = document.getElementById('create-event-form') as HTMLFormElement;
const fieldsWrapper = document.getElementById('dynamic-fields-wrapper') as HTMLDivElement;
const bannerInput   = document.getElementById('ev-banner') as HTMLInputElement;
const previewWrap   = document.getElementById('banner-preview') as HTMLDivElement;
const previewImg    = document.getElementById('banner-preview-img') as HTMLImageElement;
const saveBtn       = document.getElementById('save-btn') as HTMLButtonElement;

// Track which event we are editing (null = create mode)
let editingEventId: string | null = null;

// ── Banner live preview ───────────────────────────────────────────────────────
function showPreview(file: File): void {
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewWrap.style.display = 'block';
}
function clearPreview(): void {
  previewImg.src = '';
  previewWrap.style.display = 'none';
  bannerInput.value = '';
}

bannerInput.addEventListener('change', () => {
  const file = bannerInput.files?.[0];
  if (file) showPreview(file);
});
document.getElementById('remove-banner')?.addEventListener('click', clearPreview);

// ── Modal open / close ────────────────────────────────────────────────────────
function openCreateModal(): void {
  editingEventId = null;
  modalTitle.textContent = 'Create New Event';
  saveBtn.textContent    = 'Save Event';
  form.reset();
  fieldsWrapper.innerHTML = '';
  clearPreview();
  modal.classList.add('active');
}

function openEditModal(ev: EventRow): void {
  editingEventId = ev.id;
  modalTitle.textContent = 'Edit Event';
  saveBtn.textContent    = 'Update Event';

  // Pre-fill text fields
  (document.getElementById('ev-title')   as HTMLInputElement).value  = ev.title;
  (document.getElementById('ev-desc')    as HTMLTextAreaElement).value = ev.description ?? '';
  (document.getElementById('ev-venue')   as HTMLInputElement).value  = ev.venue;
  (document.getElementById('ev-price')   as HTMLInputElement).value  = String(ev.price);

  // Convert ISO date → datetime-local format  (YYYY-MM-DDTHH:MM)
  if (ev.date) {
    const d = new Date(ev.date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    (document.getElementById('ev-date') as HTMLInputElement).value = local;
  }

  // Show existing banner as preview (if any)
  const existingBanner = ev.bannerUrl ?? ev.imageUrl;
  if (existingBanner) {
    previewImg.src       = existingBanner;
    previewWrap.style.display = 'block';
  } else {
    clearPreview();
  }

  // Re-populate custom fields
  fieldsWrapper.innerHTML = '';
  if (Array.isArray(ev.customFields)) {
    (ev.customFields as { label: string; type: string }[]).forEach(cf => {
      addFieldRow(cf.label, cf.type);
    });
  }

  modal.classList.add('active');
}

function closeModal(): void {
  modal.classList.remove('active');
  editingEventId = null;
  form.reset();
  fieldsWrapper.innerHTML = '';
  clearPreview();
  modalTitle.textContent = 'Create New Event';
  saveBtn.textContent    = 'Save Event';
}

document.getElementById('open-create-modal')?.addEventListener('click', openCreateModal);
document.getElementById('close-create-modal')?.addEventListener('click', closeModal);

// ── Dynamic custom fields builder ─────────────────────────────────────────────
function addFieldRow(label = '', type = 'text'): void {
  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.innerHTML = `
    <input type="text" placeholder="Question label (e.g. Branch)" class="field-label" value="${label.replace(/"/g, '&quot;')}">
    <select class="field-type">
      <option value="text"${type === 'text' ? ' selected' : ''}>Text</option>
      <option value="number"${type === 'number' ? ' selected' : ''}>Number</option>
    </select>
    <button type="button" class="remove-field">✕</button>
  `;
  row.querySelector('.remove-field')?.addEventListener('click', () => row.remove());
  fieldsWrapper.appendChild(row);
}

document.getElementById('add-field-btn')?.addEventListener('click', () => addFieldRow());

// ── Form submit — create (POST) or update (PATCH) ─────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Gather dynamic custom fields
  const customFields: { label: string; type: string; required: boolean }[] = [];
  document.querySelectorAll('.custom-field-row').forEach(row => {
    const label = (row.querySelector('.field-label') as HTMLInputElement).value.trim();
    const type  = (row.querySelector('.field-type') as HTMLSelectElement).value;
    if (label) customFields.push({ label, type, required: true });
  });

  // Build FormData — the server expects multipart/form-data because
  // the uploadBanner middleware sits in front of the controller.
  const fd = new FormData();
  fd.append('title',        (document.getElementById('ev-title') as HTMLInputElement).value);
  fd.append('description',  (document.getElementById('ev-desc') as HTMLTextAreaElement).value);
  fd.append('date',         (document.getElementById('ev-date') as HTMLInputElement).value);
  fd.append('venue',        (document.getElementById('ev-venue') as HTMLInputElement).value);
  fd.append('price',        (document.getElementById('ev-price') as HTMLInputElement).value);
  fd.append('customFields', JSON.stringify(customFields));

  // Only attach the file if one was newly chosen
  const bannerFile = bannerInput.files?.[0];
  if (bannerFile) fd.append('banner', bannerFile);

  saveBtn.disabled = true;
  saveBtn.textContent = editingEventId ? 'Updating…' : 'Saving…';

  const isEdit   = editingEventId !== null;
  const url      = isEdit ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
  const method   = isEdit ? 'PATCH' : 'POST';

  try {
    // NOTE: Do NOT set Content-Type header — the browser sets it automatically
    // (with the multipart boundary) when body is FormData.
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (res.ok) {
      closeModal();
      loadEvents();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to ${isEdit ? 'update' : 'save'} event: ${(json as { message?: string }).message ?? res.statusText}`);
    }
  } catch (err) {
    console.error('Event save error:', err);
    alert('Network error — please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
  }
});

// ── Load & render events table ────────────────────────────────────────────────
async function loadEvents(): Promise<void> {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;

  try {
    const res  = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json() as { data: EventRow[] };

    tbody.innerHTML = '';

    if (!json.data?.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:#9ca3af;padding:2rem;">
            No events yet. Click "+ Create Event" to add one.
          </td>
        </tr>`;
      return;
    }

    json.data.forEach(ev => {
      const date         = new Date(ev.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      const fieldsCount  = ev.customFields ? (ev.customFields as unknown[]).length : 0;
      const priceLabel   = ev.price === 0
        ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">Free</span>`
        : `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">₹${Number(ev.price).toLocaleString('en-IN')}</span>`;

      // Banner thumbnail — prefer bannerUrl, fall back to imageUrl
      const thumbSrc = ev.bannerUrl ?? ev.imageUrl;
      const thumbHtml = thumbSrc
        ? `<img class="event-banner-thumb" src="${thumbSrc}" alt="Banner">`
        : `<div class="no-banner">No banner</div>`;

      const typeStr = ev.eventType || '-';
      const teamStr = (ev.maxTeamSize && ev.maxTeamSize > 1) ? `${ev.maxTeamSize} max` : 'Solo';
      
      const totalRegistrations = (ev._count?.registrations || 0) + (ev._count?.teams || 0);
      const slotsStr = ev.maxRegistrations ? `${totalRegistrations}/${ev.maxRegistrations}` : `${totalRegistrations} / ∞`;
      
      let isClosed = false;
      if (ev.registrationDeadline && new Date() > new Date(ev.registrationDeadline)) isClosed = true;
      if (ev.maxRegistrations && totalRegistrations >= ev.maxRegistrations) isClosed = true;
      
      const statusHtml = isClosed
        ? `<span style="color:#ef4444;font-size:0.8rem;font-weight:600;">Closed</span>`
        : `<span style="color:#10b981;font-size:0.8rem;font-weight:600;">Active</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${thumbHtml}</td>
        <td style="white-space:nowrap;">${date}</td>
        <td><strong>${ev.title}</strong></td>
        <td>${ev.venue}</td>
        <td>${priceLabel}</td>
        <td style="font-size:0.85rem;color:#4b5563;">${typeStr}</td>
        <td style="font-size:0.85rem;color:#4b5563;">${teamStr}</td>
        <td style="font-size:0.85rem;color:#4b5563;">${slotsStr}</td>
        <td>${statusHtml}</td>
        <td><span style="background:#e5e7eb;padding:2px 8px;border-radius:12px;font-size:0.75rem;">${fieldsCount} Q</span></td>
        <td style="white-space:nowrap;">
          ${ev.price > 0 ? `<button class="btn btn-revenue" data-id="${ev.id}" data-title="${ev.title.replace(/"/g, '&quot;')}"
            style="background:#059669;color:white;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            💰 Revenue
          </button>` : ''}
          <button class="btn btn-notify" data-id="${ev.id}" data-title="${ev.title.replace(/"/g, '&quot;')}"
            style="background:#8b5cf6;color:white;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            Email
          </button>
          <button class="btn btn-edit" data-id="${ev.id}"
            style="background:#3b82f6;color:white;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            Edit
          </button>
          <button class="btn btn-delete" data-id="${ev.id}"
            style="background:#ef4444;color:white;padding:0.25rem 0.6rem;font-size:0.8rem;">
            Delete
          </button>
        </td>
      `;

      tr.querySelector('.btn-revenue')?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        openRevenueModal(btn.dataset.id!, btn.dataset.title!);
      });
      tr.querySelector('.btn-notify')?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        openNotifyModal(btn.dataset.id!, btn.dataset.title!);
      });
      tr.querySelector('.btn-edit')?.addEventListener('click', () => openEditModal(ev));
      tr.querySelector('.btn-delete')?.addEventListener('click', () => {
        if (confirm(`Delete "${ev.title}"? All its registrations will also be removed.`)) {
          deleteEvent(ev.id);
        }
      });

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

async function deleteEvent(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadEvents();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to delete: ${(json as { message?: string }).message ?? res.statusText}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Error deleting event.');
  }
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  price: number;
  imageUrl: string | null;
  bannerUrl: string | null;
  customFields: unknown;
  eventType?: string;
  maxTeamSize?: number;
  maxRegistrations?: number | null;
  currentRegistrations?: number;
  registrationDeadline?: string | null;
  _count?: {
    registrations: number;
    teams: number;
  };
}

// ── Notify Modal Logic ────────────────────────────────────────────────────────
const notifyModal = document.getElementById('notify-modal') as HTMLDivElement;
let notifyEventId: string | null = null;

function openNotifyModal(eventId: string, eventTitle: string) {
  notifyEventId = eventId;
  const titleEl = document.getElementById('notify-event-name');
  if (titleEl) titleEl.textContent = eventTitle;
  (document.getElementById('notify-subject') as HTMLInputElement).value = '';
  (document.getElementById('notify-message') as HTMLTextAreaElement).value = '';
  notifyModal.classList.add('active');
}

document.getElementById('close-notify-modal')?.addEventListener('click', () => {
  notifyModal.classList.remove('active');
  notifyEventId = null;
});

document.getElementById('send-notify-btn')?.addEventListener('click', async () => {
  if (!notifyEventId) return;
  const subject = (document.getElementById('notify-subject') as HTMLInputElement).value.trim();
  const message = (document.getElementById('notify-message') as HTMLTextAreaElement).value.trim();
  const btn = document.getElementById('send-notify-btn') as HTMLButtonElement;

  if (!subject || !message) {
    alert('Please enter both subject and message.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(`/api/admin/events/${notifyEventId}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ subject, message })
    });
    const json = await res.json() as { success: boolean; error?: string };
    
    if (json.success) {
      alert('Emails successfully sent to all registrants!');
      notifyModal.classList.remove('active');
    } else {
      alert(`Failed to send emails: ${json.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Notify error:', error);
    alert('Network error while sending emails.');
  } finally {
    btn.disabled = false;
    btn.textContent = '📨 Send to All Registrants';
  }
});

// ── Revenue Modal Logic ───────────────────────────────────────────────────────
const revenueModal = document.getElementById('revenue-modal') as HTMLDivElement;

function openRevenueModal(eventId: string, eventTitle: string) {
  const labelEl = document.getElementById('revenue-event-label');
  if (labelEl) labelEl.textContent = eventTitle;

  const loadingEl = document.getElementById('revenue-loading');
  const dataEl = document.getElementById('revenue-data');

  if (loadingEl) loadingEl.style.display = 'block';
  if (dataEl) dataEl.style.display = 'none';

  revenueModal.classList.add('active');

  // Fetch revenue from API
  fetch(`/api/admin/events/${eventId}/revenue`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(json => {
      if (!json.success) throw new Error(json.error || 'Failed');
      const d = json.data as { revenue: number, price: number, successRegs: number, successTeams: number };
      
      (document.getElementById('rev-total') as HTMLDivElement).textContent = `₹${Number(d.revenue).toLocaleString('en-IN')}`;
      (document.getElementById('rev-price') as HTMLDivElement).textContent = `₹${Number(d.price).toLocaleString('en-IN')}`;
      (document.getElementById('rev-regs') as HTMLDivElement).textContent = String(d.successRegs);
      (document.getElementById('rev-teams') as HTMLDivElement).textContent = String(d.successTeams);
      (document.getElementById('rev-paid') as HTMLDivElement).textContent = String(d.successRegs + d.successTeams);

      if (loadingEl) loadingEl.style.display = 'none';
      if (dataEl) dataEl.style.display = 'block';
    })
    .catch(err => {
      console.error('Revenue fetch error:', err);
      if (loadingEl) loadingEl.textContent = 'Failed to load revenue data.';
    });
}

document.getElementById('close-revenue-modal')?.addEventListener('click', () => {
  revenueModal.classList.remove('active');
});


// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadEvents());
