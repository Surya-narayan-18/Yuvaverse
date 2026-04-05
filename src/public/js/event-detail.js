"use strict";
// ================================================================
// YUVAVERSE — EVENT-DETAIL.TS
// Event detail page: loads event data + full Razorpay checkout flow
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
        // Image
        const imgEl = document.getElementById('eventImage');
        if (imgEl) {
            imgEl.style.cssText += `background:${gradient}`;
            if (event.imageUrl)
                imgEl.innerHTML = `<img src="${event.imageUrl}" alt="${event.title}"/>`;
        }
        // Text fields
        const set = (id, val) => { const el = document.getElementById(id); if (el)
            el.textContent = val; };
        set('eventTitle', event.title);
        set('eventDesc', event.description);
        set('eventVenue', event.venue);
        set('eventDate', date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        set('eventTime', date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        set('eventPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
        set('registerPrice', event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`);
        set('regCount', `${event._count?.registrations ?? 0} registered`);
        document.title = `${event.title} — Yuvaverse`;
    }
    // ── Form Validation ─────────────────────────────────────────────
    function getField(id) {
        return document.getElementById(id);
    }
    function showError(field, msg) {
        field.classList.add('error');
        const err = field.parentElement?.querySelector('.form-error');
        if (err)
            err.textContent = msg;
    }
    function clearErrors() {
        document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    }
    function validateForm(name, email) {
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
        return valid;
    }
    // ── Razorpay Checkout ───────────────────────────────────────────
    async function startCheckout(event) {
        const nameEl = getField('studentName');
        const emailEl = getField('studentEmail');
        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        if (!validateForm(name, email))
            return;
        const btn = document.getElementById('registerBtn');
        btn.classList.add('btn--loading');
        btn.textContent = '';
        const orderRes = await ApiClient.post('/registrations/order', {
            studentName: name, studentEmail: email, eventId,
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
                }
                else {
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
        document.getElementById('registerBtn')?.addEventListener('click', () => {
            startCheckout(event).catch(() => ToastSystem.show('Something went wrong. Please try again.', 'error'));
        });
    });
})();
