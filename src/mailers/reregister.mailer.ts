import { sendMail } from '../config/mailer';

interface ReRegisterEmailOptions {
  toEmail: string;
  studentName: string;
  eventTitle: string;
  eventDate: Date;
  eventVenue: string;
  registrationStatus: 'PENDING' | 'FAILED';
  eventUrl: string;
  adminMessage?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export async function sendReRegisterEmail(options: ReRegisterEmailOptions): Promise<void> {
  const { toEmail, studentName, eventTitle, eventDate, eventVenue, registrationStatus, eventUrl, adminMessage } = options;

  const isPending = registrationStatus === 'PENDING';
  const statusColor = isPending ? '#f59e0b' : '#ef4444';
  const statusLabel = isPending ? 'Payment Incomplete' : 'Registration Failed';
  const statusIcon = isPending ? '⏳' : '❌';
  const statusDesc = isPending
    ? 'Your payment for this event was not completed. Your slot has been held temporarily, but it will be released soon.'
    : 'Your previous registration attempt for this event did not go through successfully.';

  const messageHtml = adminMessage
    ? adminMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete Your Registration — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#dc2626);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">${statusIcon}</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                Action Required
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                Complete your registration for <strong>${eventTitle}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;">

              <p style="margin:0 0 20px;color:#c0c0d0;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#ffffff;">${studentName}</strong>, 👋<br/>
                We noticed an issue with your registration attempt.
              </p>

              <!-- Status Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.1);border:1px solid ${statusColor};border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:${statusColor};font-size:14px;font-weight:600;">${statusIcon} Status: ${statusLabel}</p>
                    <p style="margin:8px 0 0;color:#c0c0d0;font-size:13px;line-height:1.6;">${statusDesc}</p>
                  </td>
                </tr>
              </table>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(108,63,197,0.3);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <h2 style="margin:0 0 16px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">Event Details</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:7px 0;color:#8888aa;font-size:14px;width:40%;">📅 Date &amp; Time</td>
                        <td style="padding:7px 0;color:#ffffff;font-size:14px;font-weight:500;">${formatDate(eventDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#8888aa;font-size:14px;">📍 Venue</td>
                        <td style="padding:7px 0;color:#ffffff;font-size:14px;font-weight:500;">${eventVenue}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${adminMessage ? `
              <!-- Admin Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.1);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Message from Yuvaverse</p>
                    <p style="margin:0;color:#d0d0e0;font-size:14px;line-height:1.7;">${messageHtml}</p>
                  </td>
                </tr>
              </table>` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${eventUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                      Re-Register Now →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Urgency note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(251,191,36,0.08);border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#fde68a;font-size:13px;line-height:1.6;">
                      <strong>⚠️ Act fast!</strong> Slots are limited. Click the button above to complete your registration before the event fills up.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#8888aa;font-size:13px;line-height:1.6;">
                See you there! 🚀<br/>
                <strong style="color:#a78bfa;">— The Yuvaverse Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111120;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#555577;font-size:12px;">
                You are receiving this because you attempted to register for <strong>${eventTitle}</strong>.<br/>
                This is an automated email from Yuvaverse Events. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await sendMail({
    to: toEmail,
    subject: `${statusIcon} Complete your registration for "${eventTitle}" — Yuvaverse`,
    html,
  });
}
