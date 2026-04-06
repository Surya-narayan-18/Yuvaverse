// authGuard.ts ensures protected page cannot be loaded without valid state

export function checkAuth() {
  const token = localStorage.getItem('adminToken');
  const role = localStorage.getItem('adminRole');

  if (!token || !role || role !== 'ADMIN') {
    // Basic redirect, if they are not an ADMIN
    window.location.href = '/admin-login.html';
    throw new Error('Unauthorized access. Redirecting...');
  }
  return token;
}

export function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRole');
  window.location.href = '/admin-login.html';
}

// Use event delegation to ensure the logout button works on all dashboard pages
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.id === 'logout-btn') {
    logout();
  }
});

