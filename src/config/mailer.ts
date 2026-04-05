import nodemailer, { Transporter } from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

interface TransporterSingleton {
  instance: Transporter | null;
}

const transporterSingleton: TransporterSingleton = { instance: null };

function getTransporter(): Transporter {
  if (!transporterSingleton.instance) {
    transporterSingleton.instance = nodemailer.createTransport({
      host: process.env.SMTP_HOST as string,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
      },
    });
  }
  return transporterSingleton.instance;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'Yuvaverse'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
