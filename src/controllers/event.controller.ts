import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateEventBody {
  title: string;
  description: string;
  date: Date;
  venue: string;
  price: number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
}

interface UpdateEventBody {
  title?: string;
  description?: string;
  date?: Date;
  venue?: string;
  price?: number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
}

interface ListEventsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events  (public)
// ─────────────────────────────────────────────────────────────────────────────

export async function listEvents(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 9, search } = req.query as unknown as ListEventsQuery;

  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { venue: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        venue: true,
        price: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { registrations: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    events,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/:id  (public)
// ─────────────────────────────────────────────────────────────────────────────

export async function getEventById(req: Request, res: Response): Promise<void> {
  const id = String(req.params['id']);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true } },
    },
  });

  if (!event) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  sendSuccess(res, event);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function createEvent(req: Request, res: Response): Promise<void> {
  const { title, description, date, venue, price, imageUrl } =
    req.body as CreateEventBody;

  // If a banner file was uploaded via multer-storage-cloudinary,
  // req.file.path contains the full Cloudinary HTTPS URL.
  const bannerUrl = (req.file as Express.Multer.File & { path: string })?.path ?? null;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      venue,
      price,
      imageUrl: imageUrl ?? null,
      bannerUrl,
    },
  });

  sendSuccess(res, event, 'Event created successfully.', 201);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/events/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const id = String(req.params['id']);
  const body = req.body as UpdateEventBody;

  // Confirm event exists before updating
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  // Build partial update — only include fields that were explicitly sent
  const data: UpdateEventBody = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.venue !== undefined) data.venue = body.venue;
  if (body.price !== undefined) data.price = body.price;
  if ('imageUrl' in body) data.imageUrl = body.imageUrl ?? null;

  // If a new banner was uploaded, overwrite bannerUrl
  const uploadedBanner = (req.file as (Express.Multer.File & { path: string }) | undefined);
  if (uploadedBanner) data.bannerUrl = uploadedBanner.path;

  const updated = await prisma.event.update({ where: { id }, data });

  sendSuccess(res, updated, 'Event updated successfully.');
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/events/:id  (ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const id = String(req.params['id']);

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  // Cascade delete is handled by Prisma schema (onDelete: Cascade on Registration)
  await prisma.event.delete({ where: { id } });

  sendSuccess(res, null, 'Event deleted successfully.');
}
