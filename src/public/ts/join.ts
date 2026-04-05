// ================================================================
// YUVAVERSE — JOIN.TS  (Recruitment application form)
// ================================================================

(function () {
  function getVal(id: string): string {
    return (document.getElementById(id) as HTMLInputElement)?.value.trim() ?? '';
  }
  function setError(id: string, msg: string): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.classList.add('error');
    el.parentElement?.querySelector('.form-error')?.setAttribute('data-msg', msg);
    const errEl = el.parentElement?.querySelector('.form-error');
    if (errEl) errEl.textContent = msg;
  }
  function clearErrors(): void {
    document.querySelectorAll('.form-input.error, .form-textarea.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  }

  function validate(data: Record<string, string>): boolean {
    clearErrors();
    let ok = true;
    if (data['name'].length < 2)           { setError('name', 'Full name must be at least 2 characters.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['email'])) { setError('email', 'Enter a valid email address.'); ok = false; }
    if (!/^[6-9]\d{9}$/.test(data['phone']))  { setError('phone', 'Enter a valid 10-digit Indian mobile number.'); ok = false; }
    if (!data['roleAppliedFor'])               { setError('roleAppliedFor', 'Please select a role.'); ok = false; }
    if (data['resumeLink'] && !/^https?:\/\//.test(data['resumeLink'])) { setError('resumeLink', 'Resume link must be a valid URL.'); ok = false; }
    return ok;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('joinForm') as HTMLFormElement | null;
    const btn  = document.getElementById('submitBtn') as HTMLButtonElement | null;
    const success = document.getElementById('successState');
    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name:           getVal('name'),
        email:          getVal('email'),
        phone:          getVal('phone'),
        roleAppliedFor: getVal('roleAppliedFor'),
        message:        getVal('message'),
        resumeLink:     getVal('resumeLink'),
      };

      if (!validate(data)) return;

      btn.classList.add('btn--loading');
      btn.disabled = true;

      const res = await ApiClient.post('/applications', data);

      btn.classList.remove('btn--loading');
      btn.disabled = false;

      if (res.success) {
        form.style.display = 'none';
        if (success) success.style.display = 'block';
        ToastSystem.show('Application submitted! Check your inbox for confirmation.', 'success', 6000);
      } else {
        ToastSystem.show(res.message ?? 'Submission failed. Please try again.', 'error');
      }
    });
  });
})();
