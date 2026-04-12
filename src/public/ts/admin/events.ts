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

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${thumbHtml}</td>
        <td style="white-space:nowrap;">${date}</td>
        <td><strong>${ev.title}</strong></td>
        <td>${ev.venue}</td>
        <td>${priceLabel}</td>
        <td><span style="background:#e5e7eb;padding:2px 8px;border-radius:12px;font-size:0.75rem;">${fieldsCount} Q</span></td>
        <td style="white-space:nowrap;">
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

// ── Event row type ────────────────────────────────────────────────────────────
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
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadEvents());
