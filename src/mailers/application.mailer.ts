import { sendMail } from '../config/mailer';

interface ApplicationEmailOptions {
  name: string;
  email: string;
  phone: string;
  roleAppliedFor: string;
  message?: string | null;
  resumeLink?: string | null;
  applicationId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Applicant Acknowledgment Email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendApplicationAcknowledgmentEmail(
  opts: ApplicationEmailOptions,
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Received — Yuvaverse</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9,#6c3fc5);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:10px;">🚀</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Application Received!</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">
                We'll review your application and get back to you soon.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;">
              <p style="margin:0 0 24px;color:#c0c0d0;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#ffffff;">${opts.name}</strong>, 👋<br/>
                Thank you for your interest in joining <strong style="color:#a78bfa;">Yuvaverse</strong>!
                We've received your application and our team will review it shortly.
              </p>

              <!-- Application Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(14,165,233,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 20px;color:#38bdf8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">
                      Your Application Summary
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;width:40%;">👤 Name</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:500;">${opts.name}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">📧 Email</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;">${opts.email}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">📱 Phone</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;">${opts.phone}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🎯 Role Applied</td>
                        <td style="padding:8px 0;color:#34d399;font-size:14px;font-weight:600;">${opts.roleAppliedFor}</td>
                      </tr>
                      ${opts.resumeLink ? `<tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🔗 Resume</td>
                        <td style="padding:8px 0;"><a href="${opts.resumeLink}" style="color:#60a5fa;font-size:13px;">View Resume</a></td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🎫 Application ID</td>
                        <td style="padding:8px 0;color:#60a5fa;font-size:12px;font-family:monospace;">${opts.applicationId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's Next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(14,165,233,0.08);border-left:3px solid #0ea5e9;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#7dd3fc;font-size:14px;font-weight:600;">⏳ What happens next?</p>
                    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;">
                      Our team typically reviews applications within <strong style="color:#e2e8f0;">3-5 working days</strong>.
                      You'll receive a follow-up email with the next steps if shortlisted.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#8888aa;font-size:13px;line-height:1.6;">
                Best of luck! 💫<br/>
                <strong style="color:#a78bfa;">— The Yuvaverse Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#555577;font-size:12px;">
                This is an automated confirmation from Yuvaverse. Please do not reply to this email.
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
    to: opts.email,
    subject: `✅ Application Received — ${opts.roleAppliedFor} @ Yuvaverse`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Notification Email
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNewApplicationNotificationEmail(
  opts: ApplicationEmailOptions,
): Promise<void> {
  const adminEmail = process.env.SMTP_USER as string;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Application — Yuvaverse Admin</title></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;">🔔 New Recruitment Application</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Submitted via Yuvaverse Join Us page</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1a1a2e;padding:36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(245,158,11,0.3);border-radius:12px;">
              <tr><td style="padding:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;width:40%;">Name</td><td style="padding:8px 0;color:#fff;font-weight:600;">${opts.name}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Email</td><td style="padding:8px 0;color:#60a5fa;">${opts.email}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Phone</td><td style="padding:8px 0;color:#fff;">${opts.phone}</td></tr>
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Role Applied</td><td style="padding:8px 0;color:#34d399;font-weight:600;">${opts.roleAppliedFor}</td></tr>
                  ${opts.resumeLink ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Resume</td><td style="padding:8px 0;"><a href="${opts.resumeLink}" style="color:#60a5fa;">View Link</a></td></tr>` : ''}
                  ${opts.message ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;vertical-align:top;">Message</td><td style="padding:8px 0;color:#e2e8f0;font-size:13px;line-height:1.6;">${opts.message}</td></tr>` : ''}
                  <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Application ID</td><td style="padding:8px 0;color:#a78bfa;font-size:12px;font-family:monospace;">${opts.applicationId}</td></tr>
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
    subject: `🔔 New Application: ${opts.name} — ${opts.roleAppliedFor}`,
    html,
  });
}
