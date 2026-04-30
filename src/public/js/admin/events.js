// ================================================================
// YUVAVERSE — ADMIN/EVENTS.TS
// Admin event management: create/edit (with Cloudinary banner upload),
// list (with banner thumbnail + price badge), and delete.
// ================================================================
import { checkAuth } from './authGuard.js';
const token = checkAuth();
// Removed Flatpickr globals
// ── DOM refs ──────────────────────────────────────────────────────────────────
const modal = document.getElementById('create-modal');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('create-event-form');
const fieldsWrapper = document.getElementById('dynamic-fields-wrapper');
const bannerInput = document.getElementById('ev-banner');
const previewWrap = document.getElementById('banner-preview');
const previewImg = document.getElementById('banner-preview-img');
const saveBtn = document.getElementById('save-btn');
// Track which event we are editing (null = create mode)
let editingEventId = null;
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
    if (file)
        showPreview(file);
});
document.getElementById('remove-banner')?.addEventListener('click', clearPreview);
// ── Modal open / close ────────────────────────────────────────────────────────
function openCreateModal() {
    editingEventId = null;
    modalTitle.textContent = 'Create New Event';
    saveBtn.textContent = 'Save Event';
    form.reset();
    fieldsWrapper.innerHTML = '';
    clearPreview();
    // Set min dates to current local time to prevent past date selection
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const minLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateInput = document.getElementById('ev-date');
    const dlInput = document.getElementById('ev-reg-deadline');
    if (dateInput)
        dateInput.min = minLocal;
    if (dlInput)
        dlInput.min = minLocal;
    clearValidationHint('reg-deadline-hint');
    modal.classList.add('active');
}
function openEditModal(ev) {
    editingEventId = ev.id;
    modalTitle.textContent = 'Edit Event';
    saveBtn.textContent = 'Update Event';
    // Pre-fill text fields
    document.getElementById('ev-title').value = ev.title;
    document.getElementById('ev-desc').value = ev.description ?? '';
    document.getElementById('ev-venue').value = ev.venue;
    document.getElementById('ev-price').value = String(ev.price);
    const dateInput = document.getElementById('ev-date');
    const dlInput = document.getElementById('ev-reg-deadline');
    // Set min date bounds on edit as well
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const minLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (dateInput)
        dateInput.min = minLocal;
    if (dlInput)
        dlInput.min = minLocal;
    clearValidationHint('reg-deadline-hint');
    // Convert ISO date → datetime-local format  (YYYY-MM-DDTHH:MM)
    if (ev.date) {
        const d = new Date(ev.date);
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        if (dateInput) {
            dateInput.value = local;
            if (dlInput)
                dlInput.max = local;
        }
    }
    // Pre-fill Event Settings fields
    const typeSelect = document.getElementById('ev-type');
    if (typeSelect)
        typeSelect.value = ev.eventType ?? '';
    const maxTeamInput = document.getElementById('ev-max-team');
    if (maxTeamInput)
        maxTeamInput.value = String(ev.maxTeamSize ?? 1);
    const maxRegsInput = document.getElementById('ev-max-regs');
    if (maxRegsInput)
        maxRegsInput.value = ev.maxRegistrations != null ? String(ev.maxRegistrations) : '';
    // Convert registrationDeadline ISO → datetime-local
    if (dlInput) {
        if (ev.registrationDeadline) {
            const dd = new Date(ev.registrationDeadline);
            dlInput.value = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}T${pad(dd.getHours())}:${pad(dd.getMinutes())}`;
        }
        else {
            dlInput.value = '';
        }
    }
    // Show existing banner as preview (if any)
    const existingBanner = ev.bannerUrl ?? ev.imageUrl;
    if (existingBanner) {
        previewImg.src = existingBanner;
        previewWrap.style.display = 'block';
    }
    else {
        clearPreview();
    }
    // Re-populate custom fields
    fieldsWrapper.innerHTML = '';
    if (Array.isArray(ev.customFields)) {
        ev.customFields.forEach(cf => {
            addFieldRow(cf.label, cf.type);
        });
    }
    modal.classList.add('active');
}
function closeModal() {
    modal.classList.remove('active');
    editingEventId = null;
    form.reset();
    fieldsWrapper.innerHTML = '';
    clearPreview();
    clearValidationHint('reg-deadline-hint');
    modalTitle.textContent = 'Create New Event';
    saveBtn.textContent = 'Save Event';
}
document.getElementById('open-create-modal')?.addEventListener('click', openCreateModal);
document.getElementById('close-create-modal')?.addEventListener('click', closeModal);
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
    // Gather dynamic custom fields
    const customFields = [];
    document.querySelectorAll('.custom-field-row').forEach(row => {
        const label = row.querySelector('.field-label').value.trim();
        const type = row.querySelector('.field-type').value;
        if (label)
            customFields.push({ label, type, required: true });
    });
    // Build FormData — the server expects multipart/form-data because
    // the uploadBanner middleware sits in front of the controller.
    const fd = new FormData();
    fd.append('title', document.getElementById('ev-title').value);
    fd.append('description', document.getElementById('ev-desc').value);
    fd.append('date', document.getElementById('ev-date').value);
    fd.append('venue', document.getElementById('ev-venue').value);
    fd.append('price', document.getElementById('ev-price').value);
    fd.append('customFields', JSON.stringify(customFields));
    // Only attach the file if one was newly chosen
    const bannerFile = bannerInput.files?.[0];
    if (bannerFile)
        fd.append('banner', bannerFile);
    saveBtn.disabled = true;
    saveBtn.textContent = editingEventId ? 'Updating…' : 'Saving…';
    const isEdit = editingEventId !== null;
    const url = isEdit ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
    const method = isEdit ? 'PATCH' : 'POST';
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
        }
        else {
            const json = await res.json().catch(() => ({}));
            alert(`Failed to ${isEdit ? 'update' : 'save'} event: ${json.message ?? res.statusText}`);
        }
    }
    catch (err) {
        console.error('Event save error:', err);
        alert('Network error — please try again.');
    }
    finally {
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Update Event' : 'Save Event';
    }
});
// ── Load & render events table ────────────────────────────────────────────────
async function loadEvents() {
    const tbody = document.getElementById('events-tbody');
    if (!tbody)
        return;
    try {
        const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
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
            const date = new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const fieldsCount = ev.customFields ? ev.customFields.length : 0;
            const priceLabel = ev.price === 0
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
            if (ev.registrationDeadline && new Date() > new Date(ev.registrationDeadline))
                isClosed = true;
            if (ev.maxRegistrations && totalRegistrations >= ev.maxRegistrations)
                isClosed = true;
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
            style="background:#fff;color:#111827;border:1px solid #d1d5db;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Revenue
          </button>` : ''}
          <button class="btn btn-notify" data-id="${ev.id}" data-title="${ev.title.replace(/"/g, '&quot;')}"
            style="background:#fff;color:#111827;border:1px solid #d1d5db;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><path d="M11 10.5 7 10.5 7 13.5 11 13.5 16 17 16 7 11 10.5z"></path></svg> Email
          </button>
          <button class="btn btn-edit" data-id="${ev.id}"
            style="background:#111827;color:white;border:1px solid #111827;padding:0.25rem 0.6rem;font-size:0.8rem;margin-right:0.35rem;">
            Edit
          </button>
          <button class="btn btn-delete" data-id="${ev.id}"
            style="background:#fff;color:#dc2626;border:1px solid #d1d5db;padding:0.25rem 0.6rem;font-size:0.8rem;">
            Delete
          </button>
        </td>
      `;
            tr.querySelector('.btn-revenue')?.addEventListener('click', (e) => {
                const btn = e.target;
                openRevenueModal(btn.dataset.id, btn.dataset.title);
            });
            tr.querySelector('.btn-notify')?.addEventListener('click', (e) => {
                const btn = e.target;
                openNotifyModal(btn.dataset.id, btn.dataset.title);
            });
            tr.querySelector('.btn-edit')?.addEventListener('click', () => openEditModal(ev));
            tr.querySelector('.btn-delete')?.addEventListener('click', () => {
                if (confirm(`Delete "${ev.title}"? All its registrations will also be removed.`)) {
                    deleteEvent(ev.id);
                }
            });
            tbody.appendChild(tr);
        });
    }
    catch (error) {
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
        }
        else {
            const json = await res.json().catch(() => ({}));
            alert(`Failed to delete: ${json.message ?? res.statusText}`);
        }
    }
    catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting event.');
    }
}
// ── Notify Modal Logic ────────────────────────────────────────────────────────
const notifyModal = document.getElementById('notify-modal');
let notifyEventId = null;
function openNotifyModal(eventId, eventTitle) {
    notifyEventId = eventId;
    const titleEl = document.getElementById('notify-event-name');
    if (titleEl)
        titleEl.textContent = eventTitle;
    document.getElementById('notify-subject').value = '';
    document.getElementById('notify-message').value = '';
    notifyModal.classList.add('active');
}
document.getElementById('close-notify-modal')?.addEventListener('click', () => {
    notifyModal.classList.remove('active');
    notifyEventId = null;
});
document.getElementById('send-notify-btn')?.addEventListener('click', async () => {
    if (!notifyEventId)
        return;
    const subject = document.getElementById('notify-subject').value.trim();
    const message = document.getElementById('notify-message').value.trim();
    const btn = document.getElementById('send-notify-btn');
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
        const json = await res.json();
        if (json.success) {
            alert('Emails successfully sent to all registrants!');
            notifyModal.classList.remove('active');
        }
        else {
            alert(`Failed to send emails: ${json.error || 'Unknown error'}`);
        }
    }
    catch (error) {
        console.error('Notify error:', error);
        alert('Network error while sending emails.');
    }
    finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-top:-2px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Send to All Registrants';
    }
});
// ── Revenue Modal Logic ───────────────────────────────────────────────────────
const revenueModal = document.getElementById('revenue-modal');
function openRevenueModal(eventId, eventTitle) {
    const labelEl = document.getElementById('revenue-event-label');
    if (labelEl)
        labelEl.textContent = eventTitle;
    const loadingEl = document.getElementById('revenue-loading');
    const dataEl = document.getElementById('revenue-data');
    if (loadingEl)
        loadingEl.style.display = 'block';
    if (dataEl)
        dataEl.style.display = 'none';
    revenueModal.classList.add('active');
    // Fetch revenue from API
    fetch(`/api/admin/events/${eventId}/revenue`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(json => {
        if (!json.success)
            throw new Error(json.error || 'Failed');
        const d = json.data;
        document.getElementById('rev-total').textContent = `₹${Number(d.revenue).toLocaleString('en-IN')}`;
        document.getElementById('rev-price').textContent = `₹${Number(d.price).toLocaleString('en-IN')}`;
        document.getElementById('rev-regs').textContent = String(d.successRegs);
        document.getElementById('rev-teams').textContent = String(d.successTeams);
        document.getElementById('rev-paid').textContent = String(d.successRegs + d.successTeams);
        if (loadingEl)
            loadingEl.style.display = 'none';
        if (dataEl)
            dataEl.style.display = 'block';
    })
        .catch(err => {
        console.error('Revenue fetch error:', err);
        if (loadingEl)
            loadingEl.textContent = 'Failed to load revenue data.';
    });
}
document.getElementById('close-revenue-modal')?.addEventListener('click', () => {
    revenueModal.classList.remove('active');
});
// ── Bootstrap ─────────────────────────────────────────────────────────────────
function init() {
    loadEvents();
    const evDate = document.getElementById('ev-date');
    const evDeadline = document.getElementById('ev-reg-deadline');
    if (evDate && evDeadline) {
        evDate.addEventListener('change', () => {
            // Update max deadline dynamically
            if (evDate.value)
                evDeadline.max = evDate.value;
            else
                evDeadline.removeAttribute('max');
            // If deadline is now after event date, clear it
            if (evDeadline.value && evDate.value && new Date(evDeadline.value) >= new Date(evDate.value)) {
                evDeadline.value = '';
                showValidationHint('reg-deadline-hint', '⚠️ Deadline cleared — it must be before the new event date.');
                document.getElementById('reg-deadline-hint').style.display = 'block';
            }
        });
        evDeadline.addEventListener('change', () => {
            if (evDate.value && evDeadline.value) {
                if (new Date(evDeadline.value) >= new Date(evDate.value)) {
                    evDeadline.value = '';
                    showValidationHint('reg-deadline-hint', '❌ Deadline must be before the event date.');
                    document.getElementById('reg-deadline-hint').style.display = 'block';
                }
                else {
                    showValidationHint('reg-deadline-hint', '✅ Valid registration deadline set.');
                    document.getElementById('reg-deadline-hint').style.display = 'block';
                }
            }
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
function showValidationHint(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.style.color = msg.startsWith('❌') ? '#dc2626'
            : msg.startsWith('⚠️') ? '#d97706'
                : msg.startsWith('✅') ? '#059669' : '#6b7280';
    }
}
function clearValidationHint(id) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}
