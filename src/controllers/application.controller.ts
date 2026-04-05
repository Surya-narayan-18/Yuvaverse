import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import {
  sendApplicationAcknowledgmentEmail,
  sendNewApplicationNotificationEmail,
} from '../mailers/application.mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitApplicationBody {
  name: string;
  email: string;
  phone: string;
  roleAppliedFor: string;
  message?: string | null;
  resumeLink?: string | null;
}

interface ListApplicationsQuery {
  page?: number;
  limit?: number;
  roleAppliedFor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/applications  (public)
// Submit a recruitment application.
// ─────────────────────────────────────────────────────────────────────────────

export async function submitApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, email, phone, roleAppliedFor, message, resumeLink } =
    req.body as SubmitApplicationBody;

  const application = await prisma.application.create({
    data: {
      name,
      email,
      phone,
      roleAppliedFor,
      message: message ?? null,
      resumeLink: resumeLink ?? null,
    },
  });

  const emailOpts = {
    name,
    email,
    phone,
    roleAppliedFor,
    message: message ?? null,
    resumeLink: resumeLink ?? null,
    applicationId: application.id,
  };

  // Fire both emails asynchronously — never block the HTTP response
  Promise.all([
    sendApplicationAcknowledgmentEmail(emailOpts),
    sendNewApplicationNotificationEmail(emailOpts),
  ]).catch((err: unknown) =>
    console.error('[Mailer] Application email failed:', err),
  );

  sendSuccess(
    res,
    { id: application.id, roleAppliedFor: application.roleAppliedFor },
    'Application submitted successfully. You will receive a confirmation email shortly.',
    201,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications  (ADMIN only)
// Paginated list with optional role filter.
// ─────────────────────────────────────────────────────────────────────────────

export async function listApplications(
  req: Request,
  res: Response,
): Promise<void> {
  const { page = 1, limit = 20, roleAppliedFor } =
    req.query as unknown as ListApplicationsQuery;

  const skip = (page - 1) * limit;

  const where = roleAppliedFor
    ? { roleAppliedFor: { contains: roleAppliedFor, mode: 'insensitive' as const } }
    : {};

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    applications,
    pagination: { total, totalPages, currentPage: page, limit },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getApplicationById(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    sendError(res, 'Application not found.', 404);
    return;
  }

  sendSuccess(res, application);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/applications/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteApplication(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'Application not found.', 404);
    return;
  }

  await prisma.application.delete({ where: { id } });
  sendSuccess(res, null, 'Application deleted successfully.');
}
