import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller';
import {
  createEventValidators,
  updateEventValidators,
  listEventsValidators,
  eventIdParamValidator,
} from '../validators/event.validators';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * GET /api/events?page=1&limit=9&search=keyword
 * Returns paginated list of all events.
 */
router.get('/', listEventsValidators, validate, listEvents);

/**
 * GET /api/events/:id
 * Returns a single event with its registration count.
 */
router.get('/:id', eventIdParamValidator, validate, getEventById);

// ─── Admin-Protected Routes ───────────────────────────────────────────────────

/**
 * POST /api/events
 * Creates a new event. Requires ADMIN role.
 */
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  createEventValidators,
  validate,
  createEvent,
);

/**
 * PATCH /api/events/:id
 * Partially updates an event. Requires ADMIN role.
 */
router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  updateEventValidators,
  validate,
  updateEvent,
);

/**
 * DELETE /api/events/:id
 * Deletes an event and all its registrations (cascade). Requires ADMIN role.
 */
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  eventIdParamValidator,
  validate,
  deleteEvent,
);

export default router;
