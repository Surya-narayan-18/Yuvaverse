// Very simple login logic, ideally posts to /api/auth/login and stores JWT

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form') as HTMLFormElement;
  const errorMsg = document.getElementById('error-message') as HTMLDivElement;

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success && result.data.token && result.data.user.role === 'ADMIN') {
          // Store token
          localStorage.setItem('adminToken', result.data.token);
          localStorage.setItem('adminRole', result.data.user.role);

          // Redirect to dashboard
          window.location.href = '/admin-dashboard.html';
        } else {
          errorMsg.style.display = 'block';
          errorMsg.textContent = result.message || 'Access denied. Administrator privileges required.';
        }
      } catch (error) {
        console.error('Login error:', error);
        errorMsg.style.display = 'block';
        errorMsg.textContent = 'Server error. Please try again.';
      }
    });
  }
});
