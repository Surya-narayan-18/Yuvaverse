// ================================================================
// YUVAVERSE — ADMIN/EVENTS.JS
// Admin event management: create, edit (Cloudinary banner upload),
// list, delete, and a standalone "Notify Registrants" modal.
// ================================================================
import { checkAuth } from './authGuard.js';
const token = checkAuth();

// ── DOM refs — Create/Edit modal ─────────────────────────────────────────────
const createModal   = document.getElementById('create-modal');
const modalTitle    = document.getElementById('modal-title');
const form          = document.getElementById('create-event-form');
const fieldsWrapper = document.getElementById('dynamic-fields-wrapper');
const bannerInput   = document.getElementById('ev-banner');
const previewWrap   = document.getElementById('banner-preview');
const previewImg    = document.getElementById('banner-preview-img');
const saveBtn       = document.getElementById('save-btn');

// ── DOM refs — Notify modal ───────────────────────────────────────────────────
const notifyModal    = document.getElementById('notify-modal');
const notifyEventLbl = document.getElementById('notify-event-name');
const notifySubject  = document.getElementById('notify-subject');
const notifyMessage  = document.getElementById('notify-message');
const sendNotifyBtn  = document.getElementById('send-notify-btn');

// ── DOM refs — Toast ──────────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');

// ── DOM refs — Delete confirm modal ──────────────────────────────────────────
const confirmModal = document.getElementById('confirm-modal');
const confirmMsg   = document.getElementById('confirm-msg');
const confirmYes   = document.getElementById('confirm-yes');
const confirmNo    = document.getElementById('confirm-no');

// Returns a Promise<boolean> — resolves true if user clicks Yes
function showConfirm(eventTitle) {
  confirmMsg.textContent = `"${eventTitle}" and all its registrations will be permanently deleted. This cannot be undone.`;
  confirmModal.classList.add('active');
  return new Promise((resolve) => {
    function onYes() { cleanup(); resolve(true);  }
    function onNo()  { cleanup(); resolve(false); }
    function onBackdrop(e) { if (e.target === confirmModal) { cleanup(); resolve(false); } }
    function cleanup() {
      confirmYes.removeEventListener('click', onYes);
      confirmNo.removeEventListener('click', onNo);
      confirmModal.removeEventListener('click', onBackdrop);
      confirmModal.classList.remove('active');
    }
    confirmYes.addEventListener('click', onYes);
    confirmNo.addEventListener('click', onNo);
    confirmModal.addEventListener('click', onBackdrop);
  });
}

// ── State ─────────────────────────────────────────────────────────────────────
let editingEventId  = null; // null = create mode
let notifyingEventId = null;

// ── Toast helper ─────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className   = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 4000);
}

// ── Banner live preview ───────────────────────────────────────────────────────
function showPreview(file) {
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewWrap.style.display = 'block';
}
function clearPreview() {
  previewImg.src = '';
  previewWrap.style.display = 'none';
  bannerInput.value = '';
}
bannerInput.addEventListener('change', () => {
  const file = bannerInput.files?.[0];
  if (file) showPreview(file);
});
document.getElementById('remove-banner')?.addEventListener('click', clearPreview);

// ── Create/Edit modal open / close ───────────────────────────────────────────
function openCreateModal() {
  editingEventId = null;
  modalTitle.textContent = 'Create New Event';
  saveBtn.textContent    = 'Save Event';
  form.reset();
  fieldsWrapper.innerHTML = '';
  clearPreview();
  createModal.classList.add('active');
}

function openEditModal(ev) {
  editingEventId         = ev.id;
  modalTitle.textContent = 'Edit Event';
  saveBtn.textContent    = 'Update Event';

  // Pre-fill fields
  document.getElementById('ev-title').value  = ev.title;
  document.getElementById('ev-desc').value   = ev.description ?? '';
  document.getElementById('ev-venue').value  = ev.venue;
  document.getElementById('ev-price').value  = String(ev.price);

  // New fields
  document.getElementById('ev-type').value     = ev.eventType || '';
  document.getElementById('ev-max-team').value = String(ev.maxTeamSize ?? 1);
  document.getElementById('ev-max-regs').value = ev.maxRegistrations != null ? String(ev.maxRegistrations) : '';

  // Registration deadline — convert ISO to datetime-local (YYYY-MM-DDTHH:MM)
  const deadlineEl = document.getElementById('ev-reg-deadline');
  if (deadlineEl) {
    if (ev.registrationDeadline) {
      const dd  = new Date(ev.registrationDeadline);
      const pad = (n) => String(n).padStart(2, '0');
      deadlineEl.value = `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}T${pad(dd.getHours())}:${pad(dd.getMinutes())}`;
    } else {
      deadlineEl.value = '';
    }
  }

  // datetime-local format → YYYY-MM-DDTHH:MM
  if (ev.date) {
    const d   = new Date(ev.date);
    const pad = (n) => String(n).padStart(2, '0');
    document.getElementById('ev-date').value =
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Existing banner preview
  const existingBanner = ev.bannerUrl ?? ev.imageUrl;
  if (existingBanner) { previewImg.src = existingBanner; previewWrap.style.display = 'block'; }
  else                { clearPreview(); }

  // Custom fields
  fieldsWrapper.innerHTML = '';
  if (Array.isArray(ev.customFields)) {
    ev.customFields.forEach(cf => addFieldRow(cf.label, cf.type));
  }

  createModal.classList.add('active');
}

function closeCreateModal() {
  createModal.classList.remove('active');
  editingEventId = null;
  form.reset();
  fieldsWrapper.innerHTML = '';
  clearPreview();
  modalTitle.textContent = 'Create New Event';
  saveBtn.textContent    = 'Save Event';
}

document.getElementById('open-create-modal')?.addEventListener('click', openCreateModal);
document.getElementById('close-create-modal')?.addEventListener('click', closeCreateModal);

// Close create/edit modal when clicking backdrop
createModal?.addEventListener('click', (e) => {
  if (e.target === createModal) closeCreateModal();
});

// ── Notify modal open / close ─────────────────────────────────────────────────
function openNotifyModal(ev) {
  notifyingEventId         = ev.id;
  notifyEventLbl.textContent = `📅 ${ev.title}`;
  notifySubject.value      = `Important Update: ${ev.title}`;
  notifyMessage.value      = '';
  sendNotifyBtn.textContent = '📨 Send to All Registrants';
  sendNotifyBtn.disabled    = false;
  notifyModal.classList.add('active');
}

function closeNotifyModal() {
  notifyModal.classList.remove('active');
  notifyingEventId = null;
}

document.getElementById('close-notify-modal')?.addEventListener('click', closeNotifyModal);

// Close notify modal when clicking backdrop
notifyModal?.addEventListener('click', (e) => {
  if (e.target === notifyModal) closeNotifyModal();
});

// ── Dynamic custom fields builder ─────────────────────────────────────────────
function addFieldRow(label = '', type = 'text') {
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

  const customFields = [];
  document.querySelectorAll('.custom-field-row').forEach(row => {
    const label = row.querySelector('.field-label').value.trim();
    const type  = row.querySelector('.field-type').value;
    if (label) customFields.push({ label, type, required: true });
  });

  const fd = new FormData();
  fd.append('title',        document.getElementById('ev-title').value);
  fd.append('description',  document.getElementById('ev-desc').value);
  fd.append('date',         document.getElementById('ev-date').value);
  fd.append('venue',        document.getElementById('ev-venue').value);
  fd.append('price',        document.getElementById('ev-price').value);
  fd.append('customFields', JSON.stringify(customFields));
  // New group registration fields
  fd.append('eventType',            document.getElementById('ev-type').value);
  fd.append('maxTeamSize',          document.getElementById('ev-max-team').value);
  fd.append('maxRegistrations',     document.getElementById('ev-max-regs').value);
  fd.append('registrationDeadline', document.getElementById('ev-reg-deadline')?.value ?? '');
  const bannerFile = bannerInput.files?.[0];
  if (bannerFile) fd.append('banner', bannerFile);

  saveBtn.disabled    = true;
  saveBtn.textContent = editingEventId ? 'Updating…' : 'Saving…';

  const isEdit = editingEventId !== null;
  const url    = isEdit ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
  const method = isEdit ? 'PATCH' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      closeCreateModal();
      loadEvents();
      showToast(isEdit ? '✅ Event updated!' : '✅ Event created!', 'success');
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to ${isEdit ? 'update' : 'save'} event: ${json.message ?? res.statusText}`);
    }
  } catch (err) {
    console.error('Event save error:', err);
    alert('Network error — please try again.');
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
  }
});

// ── Send announcement email ───────────────────────────────────────────────────
sendNotifyBtn?.addEventListener('click', async () => {
  if (!notifyingEventId) return;

  const subject = notifySubject.value.trim();
  const message = notifyMessage.value.trim();

  if (!subject || !message) {
    showToast('Please fill in both Subject and Message.', 'error');
    return;
  }

  sendNotifyBtn.textContent = 'Sending…';
  sendNotifyBtn.disabled    = true;

  try {
    const res  = await fetch(`/api/admin/events/${notifyingEventId}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subject, message }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      closeNotifyModal();
      showToast(`✅ Sent to ${json.data?.emailsSent ?? 0} registrant(s)!`, 'success');
    } else {
      showToast(`❌ ${json.message ?? 'Failed to send emails.'}`, 'error');
    }
  } catch (err) {
    console.error('Notify error:', err);
    showToast('❌ Network error — please try again.', 'error');
  } finally {
    sendNotifyBtn.textContent = '📨 Send to All Registrants';
    sendNotifyBtn.disabled    = false;
  }
});

// ── Load & render events table ────────────────────────────────────────────────
async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;

  try {
    const res  = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
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
      const now         = new Date();
      const date        = new Date(ev.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      const fieldsCount = ev.customFields ? ev.customFields.length : 0;
      const priceLabel  = ev.price === 0
        ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">Free</span>`
        : `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">₹${Number(ev.price).toLocaleString('en-IN')}</span>`;
      const thumbSrc  = ev.bannerUrl ?? ev.imageUrl;
      const thumbHtml = thumbSrc
        ? `<img class="event-banner-thumb" src="${thumbSrc}" alt="Banner">`
        : `<div class="no-banner">No banner</div>`;

      // Event Type badge
      const typeColors = { Workshop:'#ede9fe;color:#6d28d9', Hackathon:'#dbeafe;color:#1e40af', Competition:'#fce7f3;color:#be185d', Seminar:'#d1fae5;color:#065f46', Meetup:'#fef3c7;color:#92400e' };
      const typeStyle = ev.eventType ? (typeColors[ev.eventType] || '#f3f4f6;color:#374151') : '#f3f4f6;color:#9ca3af';
      const typeLabel = `<span style="background:${typeStyle.split(';')[0]};${typeStyle.split(';')[1] || ''};padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">${ev.eventType || '—'}</span>`;

      // Team badge
      const teamBadge = (ev.maxTeamSize > 1)
        ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">👥 up to ${ev.maxTeamSize}</span>`
        : `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:0.75rem;">Solo</span>`;

      // Slots badge
      const slotLabel = ev.maxRegistrations != null
        ? `${ev.currentRegistrations}/${ev.maxRegistrations}`
        : `${ev.currentRegistrations}/∞`;

      // Status badge
      let statusLabel, statusColor;
      if (new Date(ev.date) < now) {
        statusLabel = 'Completed'; statusColor = '#f3f4f6;color:#6b7280';
      } else if (ev.maxRegistrations != null && ev.currentRegistrations >= ev.maxRegistrations) {
        statusLabel = 'Full'; statusColor = '#fee2e2;color:#991b1b';
      } else if (ev.registrationDeadline && new Date(ev.registrationDeadline) < now) {
        statusLabel = 'Reg. Closed'; statusColor = '#fef3c7;color:#92400e';
      } else {
        statusLabel = 'Open'; statusColor = '#d1fae5;color:#065f46';
      }
      const statusBadge = `<span style="background:${statusColor.split(';')[0]};${statusColor.split(';')[1] || ''};padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">${statusLabel}</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${thumbHtml}</td>
        <td style="white-space:nowrap;">${date}</td>
        <td><strong>${ev.title}</strong></td>
        <td>${ev.venue}</td>
        <td>${priceLabel}</td>
        <td>${typeLabel}</td>
        <td>${teamBadge}</td>
        <td style="font-size:0.8rem;">${slotLabel}</td>
        <td>${statusBadge}</td>
        <td><span style="background:#e5e7eb;padding:2px 8px;border-radius:12px;font-size:0.75rem;">${fieldsCount} Q</span></td>
        <td>
          <div class="action-cell">
            <button class="btn-sm btn-edit-row"   data-id="${ev.id}">Edit</button>
            <button class="btn-sm btn-notify-row" data-id="${ev.id}">📢 Email</button>
            <button class="btn-sm btn-delete-row" data-id="${ev.id}">Delete</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-row')?.addEventListener('click',   () => openEditModal(ev));
      tr.querySelector('.btn-notify-row')?.addEventListener('click', () => openNotifyModal(ev));
      tr.querySelector('.btn-delete-row')?.addEventListener('click', async () => {
        const confirmed = await showConfirm(ev.title);
        if (confirmed) deleteEvent(ev.id);
      });

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

async function deleteEvent(id) {
  try {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      loadEvents();
      showToast('🗑️ Event deleted.', 'success');
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to delete: ${json.message ?? res.statusText}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Error deleting event.');
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadEvents());
