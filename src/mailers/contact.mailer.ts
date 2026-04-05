import { sendMail } from '../config/mailer';

interface ContactEmailOptions {
  senderName: string;
  senderEmail: string;
  message: string;
  messageId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sender Acknowledgment Email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendContactAcknowledgmentEmail(
  opts: ContactEmailOptions,
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Message Received — Yuvaverse</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#3b82f6);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:10px;">💬</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Message Received!</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                We'll get back to you as soon as possible.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a2e;padding:40px;">
              <p style="margin:0 0 24px;color:#c0c0d0;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#ffffff;">${opts.senderName}</strong>, 👋<br/>
                Thank you for reaching out to <strong style="color:#34d399;">Yuvaverse</strong>.
                We've received your message and will respond within <strong style="color:#e2e8f0;">1-2 business days</strong>.
              </p>

              <!-- Message Preview -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(16,185,129,0.25);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px;color:#6ee7b7;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Message</p>
                    <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.8;font-style:italic;">
                      "${opts.message.length > 300 ? opts.message.substring(0, 300) + '…' : opts.message}"
                    </p>
                    <p style="margin:16px 0 0;color:#475569;font-size:12px;font-family:monospace;">
                      Ref: ${opts.messageId}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#8888aa;font-size:13px;line-height:1.6;">
                Talk soon! ✨<br/>
                <strong style="color:#34d399;">— The Yuvaverse Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#111120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#555577;font-size:12px;">
                This is an automated acknowledgment from Yuvaverse. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  await sendMail({
    to: opts.senderEmail,
    subject: `✅ We received your message — Yuvaverse`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Notification Email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendContactNotificationToAdmin(
  opts: ContactEmailOptions,
): Promise<void> {
  const adminEmail = process.env.SMTP_USER as string;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Contact Message — Yuvaverse Admin</title></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#0ea5e9);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;">📨 New Contact Message</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Via Yuvaverse Contact Us page</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1a1a2e;padding:36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(16,185,129,0.3);border-radius:12px;">
              <tr><td style="padding:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;width:35%;">From</td><td style="padding:8px 0;color:#fff;font-weight:600;">${opts.senderName}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Email</td><td style="padding:8px 0;"><a href="mailto:${opts.senderEmail}" style="color:#60a5fa;">${opts.senderEmail}</a></td></tr>
                  <tr>
                    <td style="padding:12px 0 8px;color:#94a3b8;font-size:14px;vertical-align:top;">Message</td>
                    <td style="padding:12px 0 8px;color:#e2e8f0;font-size:14px;line-height:1.7;">${opts.message}</td>
                  </tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">Message ID</td><td style="padding:8px 0;color:#a78bfa;font-size:12px;font-family:monospace;">${opts.messageId}</td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#111120;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:#555577;font-size:12px;">Yuvaverse Admin Notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  await sendMail({
    to: adminEmail,
    subject: `📨 New Contact: ${opts.senderName} <${opts.senderEmail}>`,
    html,
  });
}
