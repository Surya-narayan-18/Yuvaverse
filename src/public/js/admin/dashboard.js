// Analytics Dashboard Logic
import { checkAuth } from './authGuard.js';
const token = checkAuth();
// --- Main initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await fetchAnalyticsData();
        if (data) {
            renderKPIs(data);
            renderChart(data.monthlyRevenue);
        }
    }
    catch (error) {
        console.error('Failed to load analytics:', error);
        if (error instanceof Error && error.message.includes('401')) {
            // Token might be expired
            window.location.href = '/admin-login.html';
        }
    }
});
async function fetchAnalyticsData() {
    const response = await fetch('/api/admin/analytics', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${result.error || result.message}`);
    }
    return result.data;
}
function renderKPIs(data) {
    const revEl = document.getElementById('kpi-revenue');
    const regEl = document.getElementById('kpi-registrations');
    const actEl = document.getElementById('kpi-active-events');
    if (revEl)
        revEl.textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
    if (regEl)
        regEl.textContent = (data.totalRegistrations || 0).toString();
    if (actEl)
        actEl.textContent = (data.activeEvents || 0).toString();
}
function renderChart(monthlyData) {
    if (!monthlyData)
        return;
    const canvas = document.getElementById('revenueChart');
    if (!canvas)
        return;
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: monthlyData.map(d => d.month),
            datasets: [{
                    label: 'Revenue (₹)',
                    data: monthlyData.map(d => d.revenue),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e5e7eb' },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    border: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
