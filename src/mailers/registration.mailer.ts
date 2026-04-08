import { sendMail } from '../config/mailer';

interface RegistrationEmailOptions {
  studentName: string;
  studentEmail: string;
  collegeId: string;
  eventTitle: string;
  eventDate: Date;
  eventVenue: string;
  eventPrice: number;
  razorpayPaymentId: string | null;
  registrationId: string;
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

export async function sendRegistrationConfirmationEmail(
  options: RegistrationEmailOptions,
): Promise<void> {
  const {
    studentName,
    studentEmail,
    collegeId,
    eventTitle,
    eventDate,
    eventVenue,
    eventPrice,
    razorpayPaymentId,
    registrationId,
  } = options;

  const isFree = eventPrice === 0;
  const paymentLabel = isFree ? 'Free Event 🎁' : `Paid — ${formatPrice(eventPrice)}`;
  const paymentColor = isFree ? '#34d399' : '#60a5fa';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration Confirmed — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c3fc5,#3b82f6);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">🎉</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Registration Confirmed!
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">
                You're all set for <strong>${eventTitle}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;">

              <p style="margin:0 0 24px;color:#c0c0d0;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#ffffff;">${studentName}</strong>, 👋<br/>
                Your spot has been successfully secured. Here are your booking details:
              </p>

              <!-- Event Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border:1px solid rgba(108,63,197,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 20px;color:#a78bfa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">
                      Event Details
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;width:40%;">📅 Date &amp; Time</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:500;">${formatDate(eventDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">📍 Venue</td>
                        <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:500;">${eventVenue}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🎓 College ID</td>
                        <td style="padding:8px 0;color:#fbbf24;font-size:14px;font-weight:600;">${collegeId}</td>
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
                        <td style="padding:8px 0;color:#8888aa;font-size:14px;">🎫 Booking ID</td>
                        <td style="padding:8px 0;color:#60a5fa;font-size:13px;font-family:monospace;">${registrationId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(52,211,153,0.08);border-left:3px solid #34d399;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#6ee7b7;font-size:13px;line-height:1.6;">
                      <strong>📌 Note:</strong> Please save this email as your proof of registration.
                      You may be asked to show your College ID at the event venue.
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
    to: studentEmail,
    subject: `✅ Confirmed: Your spot at "${eventTitle}" — Yuvaverse`,
    html,
  });
}
