import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
        bannerUrl: true,
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
