import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  submitContactMessage,
  listContactMessages,
  getContactMessageById,
  deleteContactMessage,
} from '../controllers/contact.controller';
import {
  submitContactValidators,
  listContactMessagesValidators,
  contactIdParamValidator,
} from '../validators/contact.validators';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────

/**
 * POST /api/contact
 * Body: { senderName, senderEmail, message }
 * Saves the message and sends acknowledgment + admin notification emails.
 */
router.post('/', submitContactValidators, validate, submitContactMessage);

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/contact?page=1&limit=20
 * Paginated list of all contact messages, newest first.
 */
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  listContactMessagesValidators,
  validate,
  listContactMessages,
);

/**
 * GET /api/contact/:id
 * Get a single contact message by ID.
 */
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  contactIdParamValidator,
  validate,
  getContactMessageById,
);

/**
 * DELETE /api/contact/:id
 * Permanently delete a contact message record.
 */
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  contactIdParamValidator,
  validate,
  deleteContactMessage,
);

export default router;
