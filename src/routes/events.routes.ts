import { Router } from 'express';
import {
  listEvents,
  getEventById,
} from '../controllers/event.controller';
import {
  listEventsValidators,
  eventIdParamValidator,
} from '../validators/event.validators';
import { validate } from '../middlewares/validate.middleware';

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

export default router;
