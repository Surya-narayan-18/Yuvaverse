import { checkAuth } from './authGuard.js';
const token = checkAuth();
let allRegistrations = [];
document.addEventListener('DOMContentLoaded', () => {
    loadRegistrations();
    // Client-side search
    document.getElementById('search-filter')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allRegistrations.filter(r => r.studentName.toLowerCase().includes(term) || r.studentEmail.toLowerCase().includes(term));
        renderTable(filtered);
    });
    // Client-side CSV export
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
        if (!allRegistrations.length)
            return alert('No data to export');
        const headers = ['Date', 'Student Name', 'Student Email', 'Event', 'Status', 'Payment ID', 'Custom Answers'];
        const csvRows = [headers.join(',')];
        allRegistrations.forEach(r => {
            const date = new Date(r.createdAt).toLocaleDateString();
            const customStr = r.customAnswers ? JSON.stringify(r.customAnswers).replace(/"/g, '""') : '';
            const row = [
                date,
                `"${r.studentName}"`,
                `"${r.studentEmail}"`,
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
        a.download = `registrations_${new Date().getTime()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    });
});
async function loadRegistrations() {
    try {
        const res = await fetch('/api/admin/registrations', { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        allRegistrations = json.data || [];
        renderTable(allRegistrations);
    }
    catch (error) {
        console.error('Error loading registrations:', error);
    }
}
function renderTable(data) {
    const tbody = document.getElementById('regs-tbody');
    if (!tbody)
        return;
    tbody.innerHTML = '';
    data.forEach((r) => {
        const date = new Date(r.createdAt).toLocaleDateString();
        // Formatting JSON Custom Answers
        let answersHtml = '<span style="color:#9ca3af; font-size:0.8em;">None</span>';
        if (r.customAnswers && Object.keys(r.customAnswers).length > 0) {
            answersHtml = Object.entries(r.customAnswers).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
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
async function triggerRefund(id) {
    try {
        const res = await fetch(`/api/admin/registrations/${id}/refund`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
            alert('Refund successful!');
            loadRegistrations(); // Refresh data
        }
        else {
            alert('Refund failed: ' + json.error);
        }
    }
    catch (error) {
        alert('Error connecting to refund endpoint');
    }
}
