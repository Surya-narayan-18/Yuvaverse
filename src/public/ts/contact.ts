// ================================================================
// YUVAVERSE — CONTACT.TS  (Contact form submission)
// ================================================================

(function () {
  function getVal(id: string): string {
    return (document.getElementById(id) as HTMLInputElement)?.value.trim() ?? '';
  }
  function setError(id: string, msg: string): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.classList.add('error');
    const errEl = el.parentElement?.querySelector('.form-error');
    if (errEl) errEl.textContent = msg;
  }
  function clearErrors(): void {
    document.querySelectorAll('.form-input.error, .form-textarea.error').forEach(e => e.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form    = document.getElementById('contactForm') as HTMLFormElement | null;
    const btn     = document.getElementById('submitBtn') as HTMLButtonElement | null;
    const success = document.getElementById('successState');
    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const data = {
        senderName:  getVal('senderName'),
        senderEmail: getVal('senderEmail'),
        message:     getVal('message'),
      };

      let ok = true;
      if (data.senderName.length < 2)                          { setError('senderName', 'Name must be at least 2 characters.'); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.senderEmail)) { setError('senderEmail', 'Enter a valid email address.'); ok = false; }
      if (data.message.length < 10)                            { setError('message', 'Message must be at least 10 characters.'); ok = false; }
      if (!ok) return;

      btn.classList.add('btn--loading');
      btn.disabled = true;

      const res = await ApiClient.post('/contact', data);

      btn.classList.remove('btn--loading');
      btn.disabled = false;

      if (res.success) {
        form.style.display = 'none';
        if (success) success.style.display = 'block';
        ToastSystem.show("Message sent! We'll reply within 1-2 business days.", 'success', 6000);
      } else {
        ToastSystem.show(res.message ?? 'Could not send message. Please try again.', 'error');
      }
    });
  });
})();
