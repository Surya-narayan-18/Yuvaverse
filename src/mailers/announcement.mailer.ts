import { sendMail } from '../config/mailer';

interface AnnouncementEmailOptions {
  toEmail: string;
  studentName: string;
  eventTitle: string;
  subject: string;
  message: string;
}

export async function sendAnnouncementEmail(
  options: AnnouncementEmailOptions,
): Promise<void> {
  const { toEmail, studentName, eventTitle, subject, message } = options;

  // Convert newlines to <br> for HTML rendering
  const messageHtml = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c3fc5,#3b82f6);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">📢</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Event Update
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">
                Regarding <strong>${eventTitle}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;">

              <p style="margin:0 0 24px;color:#c0c0d0;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#ffffff;">${studentName}</strong>, 👋
              </p>

              <!-- Message Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(108,63,197,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 16px;color:#a78bfa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">
                      Message from Yuvaverse
                    </h2>
                    <p style="margin:0;color:#d0d0e0;font-size:15px;line-height:1.8;">
                      ${messageHtml}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(251,191,36,0.08);border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#fde68a;font-size:13px;line-height:1.6;">
                      <strong>📌 Note:</strong> This is an official update for <strong>${eventTitle}</strong>.
                      If you have any questions, please reach out to the Yuvaverse team.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#8888aa;font-size:13px;line-height:1.6;">
                Thanks for being part of the community! 🚀<br/>
                <strong style="color:#a78bfa;">— The Yuvaverse Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#555577;font-size:12px;">
                You are receiving this email because you registered for <strong>${eventTitle}</strong>.<br/>
                This is an official communication from Yuvaverse Events. Please do not reply to this email.
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
    subject,
    html,
  });
}
