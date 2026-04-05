import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import {
  sendContactAcknowledgmentEmail,
  sendContactNotificationToAdmin,
} from '../mailers/contact.mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitContactBody {
  senderName: string;
  senderEmail: string;
  message: string;
}

interface ListContactQuery {
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contact  (public)
// Submit a contact form message.
// ─────────────────────────────────────────────────────────────────────────────

export async function submitContactMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const { senderName, senderEmail, message } = req.body as SubmitContactBody;

  const contact = await prisma.contactMessage.create({
    data: { senderName, senderEmail, message },
  });

  const emailOpts = {
    senderName,
    senderEmail,
    message,
    messageId: contact.id,
  };

  // Fire both emails concurrently, non-blocking
  Promise.all([
    sendContactAcknowledgmentEmail(emailOpts),
    sendContactNotificationToAdmin(emailOpts),
  ]).catch((err: unknown) =>
    console.error('[Mailer] Contact email failed:', err),
  );

  sendSuccess(
    res,
    { id: contact.id },
    "Message received! We'll get back to you within 1-2 business days.",
    201,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/contact  (ADMIN only)
// Paginated list of all contact messages.
// ─────────────────────────────────────────────────────────────────────────────

export async function listContactMessages(
  req: Request,
  res: Response,
): Promise<void> {
  const { page = 1, limit = 20 } = req.query as unknown as ListContactQuery;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contactMessage.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    messages,
    pagination: { total, totalPages, currentPage: page, limit },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/contact/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getContactMessageById(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);

  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) {
    sendError(res, 'Contact message not found.', 404);
    return;
  }

  sendSuccess(res, message);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/contact/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteContactMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'Contact message not found.', 404);
    return;
  }

  await prisma.contactMessage.delete({ where: { id } });
  sendSuccess(res, null, 'Contact message deleted successfully.');
}
