"use strict";
// authGuard.ts ensures protected page cannot be loaded without valid state
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuth = checkAuth;
exports.logout = logout;
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const role = localStorage.getItem('adminRole');
    if (!token || !role || role !== 'ADMIN') {
        // Basic redirect, if they are not an ADMIN
        window.location.href = '/admin-login.html';
        throw new Error('Unauthorized access. Redirecting...');
    }
    return token;
}
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    window.location.href = '/admin-login.html';
}
// Use event delegation to ensure the logout button works on all dashboard pages
document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.id === 'logout-btn') {
        logout();
    }
});
