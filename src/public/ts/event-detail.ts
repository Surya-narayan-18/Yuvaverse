// ================================================================
// YUVAVERSE — EVENT-DETAIL.TS
// Event detail page: loads event data + full Razorpay checkout flow
// Supports both individual and team registration flows.
// ================================================================

declare const Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill: { name: string; email: string; contact?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
}
interface RazorpayInstance { open(): void; }
interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface OrderResponseData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  registrationId: string;
  eventTitle: string;
  studentName: string;
  studentEmail: string;
  isFreeEvent?: boolean;
  registration?: { id: string };
}
interface TeamOrderResponseData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  teamId: string;
  eventTitle: string;
  leaderName: string;
  leaderEmail: string;
  isFreeEvent?: boolean;
}

interface StatusDialogOptions {
  icon: string;
  title: string;
  body: string;
  btnText?: string;
}

(function () {
  const params  = new URLSearchParams(window.location.search);
  const eventId = params.get('id');

  // Holds the loaded event — shared across individual and team flows
  let _currentEvent: EventData | null = null;

  // ── Status Dialog ────────────────────────────────────────────────
  function showStatusDialog({ icon, title, body, btnText = 'OK' }: StatusDialogOptions): void {
    document.getElementById('reg-status-dialog')?.remove();

    if (!document.getElementById('reg-dialog-style')) {
      const s = document.createElement('style');
      s.id = 'reg-dialog-style';
      s.textContent =
        '@keyframes rsd-fadein{from{opacity:0}to{opacity:1}}' +
        '@keyframes rsd-slideup{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
      document.head.appendChild(s);
    }

    const overlay = document.createElement('div');
    overlay.id = 'reg-status-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.7);backdrop-filter:blur(7px);padding:1rem;animation:rsd-fadein .2s ease;';

    const box = document.createElement('div');
    box.style.cssText =
      'background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:18px;' +
      'padding:2.25rem 2rem 2rem;max-width:410px;width:100%;text-align:center;' +
      'box-shadow:0 32px 90px rgba(0,0,0,.7);animation:rsd-slideup .25s ease;';

    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:3rem;margin-bottom:0.75rem;line-height:1;';
    iconEl.textContent = icon;

    const titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin:0 0 0.55rem;color:#fff;font-size:1.15rem;font-weight:700;';
    titleEl.textContent = title;

    const bodyEl = document.createElement('p');
    bodyEl.style.cssText = 'margin:0 0 1.5rem;color:#a0a0b8;font-size:0.88rem;line-height:1.65;';
    bodyEl.innerHTML = body;

    const btn = document.createElement('button');
    btn.style.cssText =
      'background:linear-gradient(135deg,#6c3fc5,#3b82f6);color:#fff;border:none;' +
      'padding:0.65rem 2.2rem;border-radius:50px;font-size:0.9rem;font-weight:700;' +
      'cursor:pointer;transition:opacity .15s;';
    btn.textContent = btnText;
    btn.addEventListener('click', () => overlay.remove());

    box.appendChild(iconEl);
    box.appendChild(titleEl);
    box.appendChild(bodyEl);
    box.appendChild(btn);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    btn.focus();
  }

  // ── Load Event Details ──────────────────────────────────────────
  async function loadEvent(): Promise<EventData | null> {
    if (!eventId) return null;
    const res = await ApiClient.get<EventData>(`/events/${eventId}`);
    return res.success ? res.data : null;
  }

  function renderEventDetail(event: EventData): void {
    const gradient = CARD_GRADIENTS[0];
    const date = new Date(event.date);

    // Image — prefer Cloudinary bannerUrl, fall back to legacy imageUrl
    const imgEl = document.getElementById('eventImage') as HTMLElement;
    if (imgEl) {
      imgEl.style.cssText += `background:${gradient}`;
      const bannerSrc = event.bannerUrl ?? event.imageUrl;
      if (bannerSrc) imgEl.innerHTML = `<img src="${bannerSrc}" alt="${event.title}"/>`;
    }

    // Text fields
    const set = (id: string, val: string): void => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('eventTitle',        event.title);
    set('eventDesc',         event.description);
    set('eventVenue',        event.venue);
    set('eventDate',         date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    set('eventTime',         date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    set('eventPrice',        event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
    set('registerPrice',     event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
    set('teamRegisterPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
    set('regCount',          `${(event as unknown as { currentRegistrations?: number }).currentRegistrations ?? 0} registered`);

    // ── Team vs Individual form toggle ──────────────────────────────
    const maxTeamSize   = (event as unknown as { maxTeamSize?: number }).maxTeamSize ?? 1;
    const isTeamEvent   = maxTeamSize > 1;
    const individualForm = document.getElementById('individualForm');
    const teamForm       = document.getElementById('teamForm');
    const teamSizeHint   = document.getElementById('teamSizeHint');
    if (isTeamEvent) {
      if (individualForm) individualForm.style.display = 'none';
      if (teamForm)       teamForm.style.display = '';
      if (teamSizeHint) {
        teamSizeHint.textContent =
          `You can register solo or with up to ${maxTeamSize} members (including yourself). Adding extra members is optional.`;
      }
    } else {
      if (individualForm) individualForm.style.display = '';
      if (teamForm)       teamForm.style.display = 'none';
    }

    // Registration deadline pill
    const deadlinePill = document.getElementById('metaDeadline');
    const deadlineSpan = document.getElementById('eventDeadline');
    if (deadlinePill && deadlineSpan && (event as unknown as { registrationDeadline?: string }).registrationDeadline) {
      const dl = new Date((event as unknown as { registrationDeadline: string }).registrationDeadline);
      const isClosed = dl < new Date();
      const dlStr = dl.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      deadlineSpan.textContent = isClosed ? 'Registration Closed' : dlStr;
      if (isClosed) deadlinePill.style.color = 'var(--clr-error, #dc2626)';
      deadlinePill.style.display = '';
    }

    document.title = `${event.title} — Yuvaverse`;
  }

  // ── Individual Form Validation ──────────────────────────────────
  function getField(id: string): HTMLInputElement { return document.getElementById(id) as HTMLInputElement; }
  function showError(field: HTMLInputElement, msg: string): void {
    field.classList.add('error');
    const err = field.parentElement?.querySelector('.form-error');
    if (err) err.textContent = msg;
  }
  function clearErrors(): void {
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => (el as HTMLElement).textContent = '');
  }
  function validateForm(name: string, email: string, phone: string, collegeId: string): boolean {
    clearErrors();
    let valid = true;
    if (name.trim().length < 2)                              { showError(getField('studentName'),  'Please enter your full name.');  valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))          { showError(getField('studentEmail'), 'Please enter a valid email.');   valid = false; }
    if (!/^\d{10}$/.test(phone))                             { showError(getField('studentPhone'), 'Enter a valid 10-digit phone number.'); valid = false; }
    if (collegeId.trim().length < 2)                         { showError(getField('collegeId'),    'Please enter your College ID.'); valid = false; }
    return valid;
  }

  // ── Individual Razorpay Checkout ─────────────────────────────────
  async function startCheckout(event: EventData): Promise<void> {
    const nameEl    = getField('studentName');
    const emailEl   = getField('studentEmail');
    const phoneEl   = getField('studentPhone');
    const collegeEl = getField('collegeId');
    const name      = nameEl.value.trim();
    const email     = emailEl.value.trim();
    const phone     = (phoneEl.value.trim() || '').replace(/\s/g, '');
    const collegeId = collegeEl.value.trim();

    if (!validateForm(name, email, phone, collegeId)) return;

    const btn = document.getElementById('registerBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.classList.add('btn--loading');
    btn.textContent = '';

    const orderRes = await ApiClient.post<OrderResponseData>('/registrations/order', {
      studentName: name, studentEmail: email, studentPhone: phone, eventId, collegeId,
    });

    btn.disabled = false;
    btn.classList.remove('btn--loading');
    btn.textContent = event.price === 0 ? 'Register Free' : 'Register Now →';

    if (!orderRes.success) {
      const isAlreadyReg = (orderRes as { status?: number }).status === 409
        || (orderRes.message || '').toLowerCase().includes('already registered');
      if (isAlreadyReg) {
        const byEmail = (orderRes.message || '').toLowerCase().includes('email');
        showStatusDialog({
          icon: '✅',
          title: 'Already Registered!',
          body: byEmail
            ? `The email <strong>${email}</strong> is already confirmed for this event.<br/>Check your inbox for the confirmation email.`
            : `Your College ID <strong>${collegeId}</strong> is already registered for this event.`,
          btnText: 'Got it',
        });
      } else {
        ToastSystem.show(orderRes.message ?? 'Registration failed. Please try again.', 'error');
      }
      return;
    }

    const order = orderRes.data;

    // Free event — no Razorpay needed
    if (order.isFreeEvent) {
      ToastSystem.show('Registered successfully! Check your email for confirmation.', 'success', 6000);
      setTimeout(() => { window.location.href = '/events.html'; }, 3000);
      return;
    }

    // Paid event — open Razorpay modal
    let paymentCompleted = false;
    const registrationId = order.registrationId;

    const rzp = new Razorpay({
      key:         order.keyId,
      amount:      order.amount,
      currency:    order.currency,
      name:        'Yuvaverse',
      description: `Registration: ${event.title}`,
      order_id:    order.orderId,
      prefill:     { name, email, contact: phone },
      theme:       { color: '#6C63FF' },
      modal: {
        ondismiss: () => {
          if (paymentCompleted) return;
          ApiClient.post('/registrations/cancel', { registrationId }).catch(() => {});
          showStatusDialog({
            icon: '❌',
            title: 'Payment Not Completed',
            body: 'You closed the payment window before completing payment.<br/><br/>Your registration is <strong>not confirmed</strong>. You can try again at any time — just fill in the form below.',
            btnText: 'Try Again',
          });
        },
      },
      handler: async (response) => {
        paymentCompleted = true;
        const verifyRes = await ApiClient.post('/registrations/verify', {
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        });
        if (verifyRes.success) {
          ToastSystem.show('Payment successful! Confirmation email sent. 🎉', 'success', 6000);
          setTimeout(() => { window.location.href = '/events.html'; }, 3500);
        } else {
          ApiClient.post('/registrations/cancel', { registrationId }).catch(() => {});
          showStatusDialog({
            icon: '⚠️',
            title: 'Payment Verification Failed',
            body: 'Your payment may have been deducted but our system could not verify it.<br/><br/>Please <strong>contact the Yuvaverse team</strong> immediately with your Razorpay payment ID for manual resolution.',
            btnText: 'I Understand',
          });
        }
      },
    });
    rzp.open();
  }

  // ── Member Row Management (Team) ─────────────────────────────────
  function getMemberRows(): NodeListOf<HTMLElement> {
    return document.querySelectorAll<HTMLElement>('.team-member-row');
  }

  function createMemberRow(index: number): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'team-member-row';
    div.dataset.index = String(index);
    div.style.cssText = 'border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.85rem;margin-bottom:0.65rem;position:relative;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <span style="font-size:0.8rem;font-weight:600;color:#a0a0b8;">Member ${index + 1}</span>
        <button type="button" class="remove-member-btn" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.85rem;padding:0.2rem 0.4rem;border-radius:4px;" aria-label="Remove member">✕</button>
      </div>
      <div class="form-group" style="margin-bottom:0.5rem;">
        <input class="form-input member-name" type="text" placeholder="Member ${index + 1} full name" required style="margin-bottom:0;"/>
        <span class="form-error" role="alert"></span>
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <input class="form-input member-email" type="email" placeholder="Member ${index + 1} email" required style="margin-bottom:0;"/>
        <span class="form-error" role="alert"></span>
      </div>
    `;
    (div.querySelector('.remove-member-btn') as HTMLButtonElement).addEventListener('click', () => {
      div.remove();
      reIndexMemberRows();
      updateAddBtnState();
    });
    return div;
  }

  function reIndexMemberRows(): void {
    getMemberRows().forEach((row, i) => {
      row.dataset.index = String(i);
      const label = row.querySelector('span');
      if (label) label.textContent = `Member ${i + 1}`;
      const nameInput  = row.querySelector<HTMLInputElement>('.member-name');
      const emailInput = row.querySelector<HTMLInputElement>('.member-email');
      if (nameInput)  nameInput.placeholder  = `Member ${i + 1} full name`;
      if (emailInput) emailInput.placeholder = `Member ${i + 1} email`;
    });
  }

  function updateAddBtnState(): void {
    const ev = _currentEvent as unknown as { maxTeamSize?: number } | null;
    if (!ev) return;
    const maxTeamSize     = ev.maxTeamSize ?? 1;
    const maxAdditional   = maxTeamSize - 1; // leader is 1
    const currentAdditional = getMemberRows().length;
    const addBtn = document.getElementById('addMemberBtn') as HTMLButtonElement | null;
    if (addBtn) {
      const atMax   = currentAdditional >= maxAdditional;
      addBtn.disabled     = atMax;
      addBtn.style.opacity = atMax ? '0.4' : '1';
      addBtn.title = atMax
        ? `Maximum ${maxTeamSize} members (including leader) reached`
        : 'Add another member';
    }
  }

  // ── Team Form Validation ─────────────────────────────────────────
  function validateTeamForm(maxTeamSize: number): boolean {
    let valid = true;

    const clearField = (input: HTMLInputElement | null) => {
      if (!input) return;
      input.classList.remove('error');
      const err = input.parentElement?.querySelector('.form-error');
      if (err) (err as HTMLElement).textContent = '';
    };
    const markError = (input: HTMLInputElement | null, msg: string) => {
      if (!input) { valid = false; return; }
      input.classList.add('error');
      const err = input.parentElement?.querySelector('.form-error');
      if (err) (err as HTMLElement).textContent = msg;
      valid = false;
    };

    // Clear all errors first
    document.querySelectorAll<HTMLInputElement>('#teamForm .form-input').forEach(clearField);

    const teamNameEl    = document.getElementById('teamName')    as HTMLInputElement | null;
    const leaderNameEl  = document.getElementById('leaderName')  as HTMLInputElement | null;
    const leaderEmailEl = document.getElementById('leaderEmail') as HTMLInputElement | null;
    const leaderPhoneEl = document.getElementById('leaderPhone') as HTMLInputElement | null;

    if (!teamNameEl?.value.trim())                                   { markError(teamNameEl,   'Team name is required.'); }
    if (!leaderNameEl?.value.trim() || (leaderNameEl?.value.trim().length ?? 0) < 2)
                                                                     { markError(leaderNameEl, 'Leader name is required.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leaderEmailEl?.value.trim() ?? ''))
                                                                     { markError(leaderEmailEl, 'Valid leader email is required.'); }
    if (!/^\d{10}$/.test((leaderPhoneEl?.value.trim() ?? '').replace(/\s/g, '')))
                                                                     { markError(leaderPhoneEl, 'Enter a valid 10-digit phone number.'); }

    // Validate additional member rows
    getMemberRows().forEach((row, i) => {
      const nameInput  = row.querySelector<HTMLInputElement>('.member-name');
      const emailInput = row.querySelector<HTMLInputElement>('.member-email');
      if (!nameInput?.value.trim() || (nameInput?.value.trim().length ?? 0) < 2) {
        markError(nameInput, `Member ${i + 1} name is required.`);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput?.value.trim() ?? '')) {
        markError(emailInput, `Member ${i + 1} email is invalid.`);
      }
    });

    // Team size check: leader + additional members
    const total = 1 + getMemberRows().length;
    if (total > maxTeamSize) {
      ToastSystem.show(`Team size exceeds max (${maxTeamSize} members including leader).`, 'error');
      valid = false;
    }

    return valid;
  }

  // ── Build members array from form ────────────────────────────────
  function buildMembersArray(): { name: string; email: string }[] {
    const leaderName  = (document.getElementById('leaderName')  as HTMLInputElement | null)?.value.trim() ?? '';
    const leaderEmail = (document.getElementById('leaderEmail') as HTMLInputElement | null)?.value.trim() ?? '';

    // Leader is always first member
    const members: { name: string; email: string }[] = [{ name: leaderName, email: leaderEmail }];

    getMemberRows().forEach(row => {
      const name  = (row.querySelector<HTMLInputElement>('.member-name')?.value.trim())  ?? '';
      const email = (row.querySelector<HTMLInputElement>('.member-email')?.value.trim()) ?? '';
      members.push({ name, email });
    });

    return members;
  }

  // ── Team Razorpay Checkout ───────────────────────────────────────
  async function startTeamCheckout(event: EventData): Promise<void> {
    const maxTeamSize = (event as unknown as { maxTeamSize?: number }).maxTeamSize ?? 1;
    if (!validateTeamForm(maxTeamSize)) return;

    const teamName    = (document.getElementById('teamName')    as HTMLInputElement | null)?.value.trim() ?? '';
    const leaderName  = (document.getElementById('leaderName')  as HTMLInputElement | null)?.value.trim() ?? '';
    const leaderEmail = (document.getElementById('leaderEmail') as HTMLInputElement | null)?.value.trim() ?? '';
    const leaderPhone = ((document.getElementById('leaderPhone') as HTMLInputElement | null)?.value.trim() ?? '').replace(/\s/g, '');
    const members     = buildMembersArray();

    const btn = document.getElementById('teamRegisterBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.classList.add('btn--loading');
    btn.textContent = '';

    const orderRes = await ApiClient.post<TeamOrderResponseData>('/teams/order', {
      eventId, teamName, leaderName, leaderEmail, leaderPhone, members,
    });

    btn.disabled = false;
    btn.classList.remove('btn--loading');
    btn.textContent = event.price === 0 ? 'Register Free' : 'Register →';

    if (!orderRes.success) {
      const isAlreadyReg = (orderRes as { status?: number }).status === 409
        || (orderRes.message || '').toLowerCase().includes('already registered');
      if (isAlreadyReg) {
        showStatusDialog({
          icon: '✅',
          title: 'Already Registered!',
          body: `A team led by <strong>${leaderEmail}</strong> is already confirmed for this event.<br/>Check your inbox for the confirmation email.`,
          btnText: 'Got it',
        });
      } else {
        ToastSystem.show(orderRes.message ?? 'Team registration failed. Please try again.', 'error');
      }
      return;
    }

    const order = orderRes.data;

    // Free event — no Razorpay needed
    if (order.isFreeEvent) {
      ToastSystem.show('Team registered successfully! Confirmation email sent to team leader.', 'success', 6000);
      setTimeout(() => { window.location.href = '/events.html'; }, 3000);
      return;
    }

    // Paid team event — open Razorpay modal
    let paymentCompleted = false;
    const teamId = order.teamId;

    const rzp = new Razorpay({
      key:         order.keyId,
      amount:      order.amount,
      currency:    order.currency,
      name:        'Yuvaverse',
      description: `Team Registration: ${event.title}`,
      order_id:    order.orderId,
      prefill:     { name: leaderName, email: leaderEmail, contact: leaderPhone },
      theme:       { color: '#6C63FF' },
      modal: {
        ondismiss: () => {
          if (paymentCompleted) return;
          ApiClient.post('/teams/cancel', { teamId }).catch(() => {});
          showStatusDialog({
            icon: '❌',
            title: 'Payment Not Completed',
            body: 'You closed the payment window before completing payment.<br/><br/>Your team registration is <strong>not confirmed</strong>. You can try again at any time.',
            btnText: 'Try Again',
          });
        },
      },
      handler: async (response) => {
        paymentCompleted = true;
        const verifyRes = await ApiClient.post('/teams/verify', {
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        });
        if (verifyRes.success) {
          ToastSystem.show('Team payment successful! Confirmation sent to leader. 🎉', 'success', 6000);
          setTimeout(() => { window.location.href = '/events.html'; }, 3500);
        } else {
          ApiClient.post('/teams/cancel', { teamId }).catch(() => {});
          showStatusDialog({
            icon: '⚠️',
            title: 'Payment Verification Failed',
            body: 'Your payment may have been deducted but our system could not verify it.<br/><br/>Please <strong>contact the Yuvaverse team</strong> immediately with your Razorpay payment ID.',
            btnText: 'I Understand',
          });
        }
      },
    });
    rzp.open();
  }

  // ── Init ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (!eventId) {
      ToastSystem.show('No event specified.', 'error');
      return;
    }

    const event = await loadEvent().catch(() => null);
    if (!event) {
      document.getElementById('eventContent')?.insertAdjacentHTML('beforebegin',
        `<p class="text-muted" style="text-align:center;padding:4rem">Event not found.</p>`);
      return;
    }

    _currentEvent = event;
    renderEventDetail(event);

    const maxTeamSize = (event as unknown as { maxTeamSize?: number }).maxTeamSize ?? 1;
    const isTeamEvent = maxTeamSize > 1;

    if (!isTeamEvent) {
      // ── Individual registration ────────────────────────────────
      document.getElementById('registerBtn')?.addEventListener('click', () => {
        startCheckout(event).catch(() => ToastSystem.show('Something went wrong. Please try again.', 'error'));
      });
    } else {
      // ── Team registration ──────────────────────────────────────

      // "Add Member" button
      document.getElementById('addMemberBtn')?.addEventListener('click', () => {
        const maxAdditional     = maxTeamSize - 1; // leader counts as 1
        const currentAdditional = getMemberRows().length;
        if (currentAdditional >= maxAdditional) {
          ToastSystem.show(`Maximum team size is ${maxTeamSize} (including leader).`, 'error');
          return;
        }
        const container = document.getElementById('teamMembersContainer');
        if (container) {
          const row = createMemberRow(currentAdditional);
          container.appendChild(row);
          updateAddBtnState();
        }
      });

      // "Register Team" button
      document.getElementById('teamRegisterBtn')?.addEventListener('click', () => {
        startTeamCheckout(event).catch((err: unknown) => {
          console.error('[TeamReg] Unexpected error:', err);
          ToastSystem.show('Something went wrong. Please try again.', 'error');
        });
      });

      // Initialise button state
      updateAddBtnState();
    }
  });
})();
