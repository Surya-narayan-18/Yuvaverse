import { checkAuth } from './authGuard.js';

const token = checkAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();

  const modal = document.getElementById('create-modal');
  document.getElementById('open-create-modal')?.addEventListener('click', () => modal?.classList.add('active'));
  document.getElementById('close-create-modal')?.addEventListener('click', () => modal?.classList.remove('active'));

  // Dynamic Fields Builder
  const fieldsWrapper = document.getElementById('dynamic-fields-wrapper') as HTMLDivElement;
  document.getElementById('add-field-btn')?.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    row.innerHTML = `
      <input type="text" placeholder="Question Label (e.g. Branch)" class="field-label" required>
      <select class="field-type"><option value="text">Text</option><option value="number">Number</option></select>
      <button type="button" class="remove-field">X</button>
    `;
    row.querySelector('.remove-field')?.addEventListener('click', () => row.remove());
    fieldsWrapper.appendChild(row);
  });

  // Submit
  document.getElementById('create-event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Parse dynamic fields list into JSON array
    const customFields: any[] = [];
    document.querySelectorAll('.custom-field-row').forEach(row => {
      const label = (row.querySelector('.field-label') as HTMLInputElement).value;
      const type = (row.querySelector('.field-type') as HTMLSelectElement).value;
      customFields.push({ label, type, required: true });
    });

    const payload = {
      title: (document.getElementById('ev-title') as HTMLInputElement).value,
      description: (document.getElementById('ev-desc') as HTMLTextAreaElement).value,
      date: (document.getElementById('ev-date') as HTMLInputElement).value,
      venue: (document.getElementById('ev-venue') as HTMLInputElement).value,
      price: (document.getElementById('ev-price') as HTMLInputElement).value,
      customFields 
    };

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        modal?.classList.remove('active');
        (e.target as HTMLFormElement).reset();
        fieldsWrapper.innerHTML = '';
        loadEvents();
      } else {
        alert('Failed to save event');
      }
    } catch (e) {
      console.error(e);
    }
  });
});

async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/events', { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    
    tbody.innerHTML = '';
    json.data.forEach((ev: any) => {
      const date = new Date(ev.date).toLocaleDateString();
      const fieldsCount = ev.customFields ? ev.customFields.length : 0;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${date}</td>
        <td><strong>${ev.title}</strong></td>
        <td>${ev.venue}</td>
        <td>₹${ev.price}</td>
        <td><span style="background:#e5e7eb; padding:2px 8px; border-radius:12px; font-size:0.8rem;">${fieldsCount} Questions</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading events:', error);
  }
}
