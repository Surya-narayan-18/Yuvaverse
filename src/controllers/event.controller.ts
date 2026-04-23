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
  const { page = 1, limit = 9, search, sort, eventType } = req.query as unknown as ListEventsQuery & { sort?: string; eventType?: string };

  const skip = (page - 1) * limit;
  const now = new Date();

  // Build search filter
  const searchWhere = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { venue: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const eventTypeWhere = eventType ? { eventType } : {};

  // Use raw SQL to get IDs of events that are full (field-to-field comparison not supported in Prisma ORM)
  const fullEventIds: { id: string }[] = await prisma.$queryRaw`
    SELECT id FROM events
    WHERE "maxRegistrations" IS NOT NULL
      AND "currentRegistrations" >= "maxRegistrations"
  `;
  const fullIds = fullEventIds.map((r) => r.id);

  const where = {
    date: { gte: now },                                         // hide past events
    ...(fullIds.length > 0 ? { id: { notIn: fullIds } } : {}), // hide full events
    ...searchWhere,
    ...eventTypeWhere,
  };

  // Sort order
  let orderBy: { date: 'asc' | 'desc' } | { title: 'asc' } = { date: 'asc' }; // soonest first (default = "newest upcoming")
  if (sort === 'oldest') orderBy = { date: 'asc' };
  else if (sort === 'newest') orderBy = { date: 'desc' };
  else if (sort === 'name') orderBy = { title: 'asc' };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy,
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
        eventType: true,
        maxTeamSize: true,
        maxRegistrations: true,
        currentRegistrations: true,
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
