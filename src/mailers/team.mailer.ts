import { sendMail } from '../config/mailer';

interface TeamMemberInfo {
  name: string;
  email: string;
}

interface TeamRegistrationEmailOptions {
  leaderName: string;
  leaderEmail: string;
  teamName: string;
  eventTitle: string;
  eventDate: Date;
  eventVenue: string;
  eventPrice: number;
  razorpayPaymentId: string | null;
  teamId: string;
  members: TeamMemberInfo[];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

export async function sendTeamRegistrationEmail(
  options: TeamRegistrationEmailOptions,
): Promise<void> {
  const {
    leaderName,
    leaderEmail,
    teamName,
    eventTitle,
    eventDate,
    eventVenue,
    eventPrice,
    razorpayPaymentId,
    teamId,
    members,
  } = options;

  const isFree = eventPrice === 0;
  const paymentLabel = isFree ? 'Free Event 🎁' : `Paid — ${formatPrice(eventPrice)}`;
  const paymentColor = isFree ? '#34d399' : '#60a5fa';

  const memberRows = members
    .map(
      (m, i) => `
      <tr>
        <td style="padding:6px 0;color:#8888aa;font-size:14px;">${i === 0 ? '👑 Leader' : `Member ${i}`}</td>
        <td style="padding:6px 0;color:#ffffff;font-size:14px;font-weight:500;">${m.name}</td>
        <td style="padding:6px 0;color:#a78bfa;font-size:13px;">${m.email}</td>
      </tr>`,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Team Registration Confirmed — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c3fc5,#3b82f6);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">🏆</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Team Registered!
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">
                <strong>${teamName}</strong> is all set for <strong>${eventTitle}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;">

              <p style="margin:0 0 24px;color:#c0c0d0;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#ffffff;">${leaderName}</strong>, 👋<br/>
                Your team has been successfully registered! You're the point of contact for this team.
                Here are your booking details:
              </p>

              <!-- Team Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(108,63,197,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 20px;color:#a78bfa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">
                      Event Details
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;width:35%;">📅 Date &amp; Time</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:500;">${formatDate(eventDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">📍 Venue</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:500;">${eventVenue}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🏷️ Team Name</td>
                        <td style="padding:8px 0;color:#fbbf24;font-size:14px;font-weight:600;">${teamName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">💰 Payment</td>
                        <td style="padding:8px 0;font-size:14px;font-weight:600;color:${paymentColor};">${paymentLabel}</td>
                      </tr>
                      ${
                        razorpayPaymentId
                          ? `<tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🔑 Payment ID</td>
                        <td style="padding:8px 0;color:#60a5fa;font-size:13px;font-family:monospace;">${razorpayPaymentId}</td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🎫 Team ID</td>
                        <td style="padding:8px 0;color:#60a5fa;font-size:13px;font-family:monospace;">${teamId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Team Members Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(108,63,197,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 20px;color:#a78bfa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">
                      Team Members (${members.length})
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <th style="text-align:left;padding:6px 0;color:#555577;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;width:15%;">Role</th>
                        <th style="text-align:left;padding:6px 0;color:#555577;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;width:40%;">Name</th>
                        <th style="text-align:left;padding:6px 0;color:#555577;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Email</th>
                      </tr>
                      ${memberRows}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(52,211,153,0.08);border-left:3px solid #34d399;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#6ee7b7;font-size:13px;line-height:1.6;">
                      <strong>📌 Note:</strong> Please save this email as your team's proof of registration.
                      All team members must be present at the event. The team leader (you) is the primary contact.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#8888aa;font-size:13px;line-height:1.6;">
                See you there! 🚀<br/>
                <strong style="color:#a78bfa;">— The Yuvaverse Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;color:#555577;font-size:12px;">
                This is an automated confirmation email from Yuvaverse Events.<br/>
                Please do not reply to this email.
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
    to: leaderEmail,
    subject: `✅ Team Registered: "${teamName}" for "${eventTitle}" — Yuvaverse`,
    html,
  });
}
