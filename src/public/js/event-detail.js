"use strict";
// ================================================================
// YUVAVERSE — EVENT-DETAIL.JS
// Event detail page: loads event data + conditional Razorpay
// checkout flow (individual OR team based on maxTeamSize).
// ================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    // ── Load Event Details ──────────────────────────────────────────
    async function loadEvent() {
        if (!eventId)
            return null;
        const res = await ApiClient.get(`/events/${eventId}`);
        return res.success ? res.data : null;
    }

    function renderEventDetail(event) {
        const gradient = CARD_GRADIENTS[0];
        const date = new Date(event.date);
        // Image — prefer Cloudinary bannerUrl, fall back to legacy imageUrl
        const imgEl = document.getElementById('eventImage');
        if (imgEl) {
            imgEl.style.cssText += `background:${gradient}`;
            const bannerSrc = event.bannerUrl ?? event.imageUrl;
            if (bannerSrc)
                imgEl.innerHTML = `<img src="${bannerSrc}" alt="${event.title}" style="width:100%;height:100%;object-fit:cover;"/>`;
        }
        // Text fields
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('eventTitle', event.title);
        set('eventDesc', event.description);
        set('eventVenue', event.venue);
        set('eventDate', date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        set('eventTime', date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        set('eventPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
        set('registerPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
        set('teamRegisterPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
        set('regCount', `${event._count?.registrations ?? 0} registered`);
        document.title = `${event.title} — Yuvaverse`;

        // ── Show correct form based on event type ─────────────────
        const isTeamEvent = event.maxTeamSize > 1;
        const individualForm = document.getElementById('individualForm');
        const teamFormEl     = document.getElementById('teamForm');

        if (isTeamEvent) {
            if (individualForm) individualForm.style.display = 'none';
            if (teamFormEl)     teamFormEl.style.display    = '';
            set('teamSizeHint', `👥 Team size: 1 – ${event.maxTeamSize} members (including leader)`);
        } else {
            if (individualForm) individualForm.style.display = '';
            if (teamFormEl)     teamFormEl.style.display    = 'none';
        }
    }

    // ── Form Validation ─────────────────────────────────────────────
    function getField(id) {
        return document.getElementById(id);
    }
    function showError(field, msg) {
        if (!field) return;
        field.classList.add('error');
        const err = field.parentElement?.querySelector('.form-error');
        if (err) err.textContent = msg;
    }
    function clearErrors() {
        document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    }
    function validateForm(name, email, collegeId) {
        clearErrors();
        let valid = true;
        if (name.trim().length < 2) {
            showError(getField('studentName'), 'Please enter your full name.');
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError(getField('studentEmail'), 'Please enter a valid email.');
            valid = false;
        }
        if (collegeId.trim().length < 2) {
            showError(getField('collegeId'), 'Please enter your College ID.');
            valid = false;
        }
        return valid;
    }

    // ── Individual Razorpay Checkout ─────────────────────────────────
    async function startCheckout(event) {
        const nameEl    = getField('studentName');
        const emailEl   = getField('studentEmail');
        const collegeEl = getField('collegeId');
        const name      = nameEl.value.trim();
        const email     = emailEl.value.trim();
        const collegeId = collegeEl.value.trim();
        if (!validateForm(name, email, collegeId))
            return;
        const btn = document.getElementById('registerBtn');
        btn.classList.add('btn--loading');
        btn.textContent = '';
        const orderRes = await ApiClient.post('/registrations/order', {
            studentName: name, studentEmail: email, eventId, collegeId,
        });
        btn.classList.remove('btn--loading');
        btn.textContent = event.price === 0 ? 'Register Free' : 'Register Now →';
        if (!orderRes.success) {
            ToastSystem.show(orderRes.message ?? 'Registration failed. Please try again.', 'error');
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
        const rzp = new Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Yuvaverse',
            description: `Registration: ${event.title}`,
            order_id: order.orderId,
            prefill: { name, email },
            theme: { color: '#3498DB' },
            modal: { ondismiss: () => ToastSystem.show('Payment cancelled.', 'info') },
            handler: async (response) => {
                const verifyRes = await ApiClient.post('/registrations/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                });
                if (verifyRes.success) {
                    ToastSystem.show('Payment successful! Confirmation email sent. 🎉', 'success', 6000);
                    setTimeout(() => { window.location.href = '/events.html'; }, 3500);
                } else {
                    ToastSystem.show('Payment received but verification failed. Contact support.', 'error', 8000);
                }
            },
        });
        rzp.open();
    }

    // ── Team Registration ────────────────────────────────────────────
    // Keeps a live list of extra member rows (leader is separate above)
    let memberCount = 0;
    let maxMembers  = 1; // set after event loads

    function addMemberRow() {
        const container = document.getElementById('teamMembersContainer');
        if (!container) return;

        const currentRows = container.querySelectorAll('.team-member-row').length;
        // leader counts as 1, so max additional = maxMembers - 1
        if (currentRows >= maxMembers - 1) {
            ToastSystem.show(`Max ${maxMembers} members allowed (including leader).`, 'info');
            return;
        }

        memberCount++;
        const idx = memberCount;
        const row = document.createElement('div');
        row.className = 'team-member-row';
        row.style.cssText = 'display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.75rem;';
        row.dataset.idx = String(idx);
        row.innerHTML = `
          <div style="flex:1">
            <input class="form-input" type="text" id="memberName_${idx}" placeholder="Member ${idx} name" style="margin-bottom:.35rem;"/>
            <input class="form-input" type="email" id="memberEmail_${idx}" placeholder="Member ${idx} email"/>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" style="padding:.35rem .6rem;margin-top:.2rem;flex-shrink:0;" data-remove="${idx}">✕</button>
        `;
        row.querySelector(`[data-remove="${idx}"]`)?.addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    function collectTeamMembers(leaderName, leaderEmail) {
        // leader is always member[0]
        const members = [{ name: leaderName, email: leaderEmail }];
        document.querySelectorAll('.team-member-row').forEach(row => {
            const idx   = row.dataset.idx;
            const name  = (document.getElementById(`memberName_${idx}`)?.value ?? '').trim();
            const email = (document.getElementById(`memberEmail_${idx}`)?.value ?? '').trim();
            if (name && email) members.push({ name, email });
        });
        return members;
    }

    function validateTeamForm(teamName, leaderName, leaderEmail, leaderPhone) {
        clearErrors();
        let valid = true;
        if (teamName.trim().length < 2) {
            showError(getField('teamName'), 'Please enter a team name.');
            valid = false;
        }
        if (leaderName.trim().length < 2) {
            showError(getField('leaderName'), 'Please enter your full name.');
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leaderEmail)) {
            showError(getField('leaderEmail'), 'Please enter a valid email.');
            valid = false;
        }
        if (!/^\d{10}$/.test(leaderPhone.replace(/\s/g, ''))) {
            showError(getField('leaderPhone'), 'Please enter a valid 10-digit phone number.');
            valid = false;
        }
        return valid;
    }

    async function startTeamCheckout(event) {
        const teamName    = (getField('teamName')?.value   ?? '').trim();
        const leaderName  = (getField('leaderName')?.value ?? '').trim();
        const leaderEmail = (getField('leaderEmail')?.value?? '').trim();
        const leaderPhone = (getField('leaderPhone')?.value?? '').trim();

        if (!validateTeamForm(teamName, leaderName, leaderEmail, leaderPhone)) return;

        const members = collectTeamMembers(leaderName, leaderEmail);

        const btn = document.getElementById('teamRegisterBtn');
        if (btn.disabled) return; // prevent double-submit
        btn.disabled = true;
        btn.textContent = 'Processing…';

        const orderRes = await ApiClient.post('/teams/order', {
            eventId,
            teamName,
            leaderName,
            leaderEmail,
            leaderPhone,
            members,
        });

        if (!orderRes.success) {
            btn.disabled = false;
            btn.textContent = 'Register Team →';
            ToastSystem.show(orderRes.message ?? 'Team registration failed. Please try again.', 'error');
            return;
        }

        const order = orderRes.data;

        // Free team event
        if (order.isFreeEvent) {
            ToastSystem.show('Team registered! Confirmation email sent to leader. 🎉', 'success', 6000);
            setTimeout(() => { window.location.href = '/events.html'; }, 3000);
            return;
        }

        // Paid — open Razorpay
        btn.disabled = false;
        btn.textContent = 'Register Team →';

        const rzp = new Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Yuvaverse',
            description: `Team Registration: ${event.title} (${teamName})`,
            order_id: order.orderId,
            prefill: { name: leaderName, email: leaderEmail, contact: leaderPhone },
            theme: { color: '#6C63FF' },
            modal: { ondismiss: () => ToastSystem.show('Payment cancelled.', 'info') },
            handler: async (response) => {
                const verifyRes = await ApiClient.post('/teams/verify', {
                    razorpay_order_id:   response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature:  response.razorpay_signature,
                });
                if (verifyRes.success) {
                    ToastSystem.show('Team payment successful! Confirmation email sent to leader. 🎉', 'success', 7000);
                    setTimeout(() => { window.location.href = '/events.html'; }, 4000);
                } else {
                    ToastSystem.show('Payment received but verification failed. Contact support.', 'error', 8000);
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
            document.getElementById('eventContent')?.insertAdjacentHTML('beforebegin', `<p class="text-muted" style="text-align:center;padding:4rem">Event not found.</p>`);
            return;
        }
        renderEventDetail(event);
        maxMembers = event.maxTeamSize ?? 1;

        const isTeamEvent = event.maxTeamSize > 1;

        if (!isTeamEvent) {
            // Individual registration
            document.getElementById('registerBtn')?.addEventListener('click', () => {
                startCheckout(event).catch(() => ToastSystem.show('Something went wrong. Please try again.', 'error'));
            });
        } else {
            // Team registration — add/remove members
            document.getElementById('addMemberBtn')?.addEventListener('click', addMemberRow);
            document.getElementById('teamRegisterBtn')?.addEventListener('click', () => {
                startTeamCheckout(event).catch(() => ToastSystem.show('Something went wrong. Please try again.', 'error'));
            });
        }
    });
})();
