// ================================================================
// YUVAVERSE — ADMIN/EVENTS.TS
// Admin event management: create (with Cloudinary banner upload),
// list (with banner thumbnail + price badge), and delete.
// ================================================================

import { checkAuth } from './authGuard.js';

const token = checkAuth();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modal         = document.getElementById('create-modal') as HTMLDivElement;
const form          = document.getElementById('create-event-form') as HTMLFormElement;
const fieldsWrapper = document.getElementById('dynamic-fields-wrapper') as HTMLDivElement;
const bannerInput   = document.getElementById('ev-banner') as HTMLInputElement;
const previewWrap   = document.getElementById('banner-preview') as HTMLDivElement;
const previewImg    = document.getElementById('banner-preview-img') as HTMLImageElement;
const saveBtn       = document.getElementById('save-btn') as HTMLButtonElement;

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
function openModal(): void { modal.classList.add('active'); }
function closeModal(): void {
  modal.classList.remove('active');
  form.reset();
  fieldsWrapper.innerHTML = '';
  clearPreview();
}

document.getElementById('open-create-modal')?.addEventListener('click', openModal);
document.getElementById('close-create-modal')?.addEventListener('click', closeModal);

// ── Dynamic custom fields builder ─────────────────────────────────────────────
document.getElementById('add-field-btn')?.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.innerHTML = `
    <input type="text" placeholder="Question label (e.g. Branch)" class="field-label">
    <select class="field-type">
      <option value="text">Text</option>
      <option value="number">Number</option>
    </select>
    <button type="button" class="remove-field">✕</button>
  `;
  row.querySelector('.remove-field')?.addEventListener('click', () => row.remove());
  fieldsWrapper.appendChild(row);
});

// ── Form submit — uses FormData so the banner file is sent as multipart ───────
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

  // Only attach the file if one was chosen
  const bannerFile = bannerInput.files?.[0];
  if (bannerFile) fd.append('banner', bannerFile);

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    // NOTE: Do NOT set Content-Type header — the browser sets it automatically
    // (with the multipart boundary) when body is FormData.
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (res.ok) {
      closeModal();
      loadEvents();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to save event: ${(json as { message?: string }).message ?? res.statusText}`);
    }
  } catch (err) {
    console.error('Event creation error:', err);
    alert('Network error — please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Event';
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
          <td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem;">
            No events yet. Click "+ Create Event" to add one.
          </td>
        </tr>`;
      return;
    }

    json.data.forEach(ev => {
      const date         = new Date(ev.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      const fieldsCount  = ev.customFields ? (ev.customFields as unknown[]).length : 0;
      const priceLabel   = ev.price === 0 ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">Free</span>`
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
        <td>
          <button class="btn btn-delete" data-id="${ev.id}"
            style="background:#ef4444;color:white;padding:0.25rem 0.6rem;font-size:0.8rem;">
            Delete
          </button>
        </td>
      `;

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
  date: string;
  venue: string;
  price: number;
  imageUrl: string | null;
  bannerUrl: string | null;
  customFields: unknown;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadEvents());
