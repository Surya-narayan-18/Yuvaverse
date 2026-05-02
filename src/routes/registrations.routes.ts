import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createOrder,
  verifyPayment,
  cancelRegistration,
  listRegistrations,
  listRegistrationsByEvent,
  getRegistrationById,
  updateRegistrationStatus,
} from '../controllers/registration.controller';
import {
  createOrderValidators,
  verifyPaymentValidators,
  listRegistrationsValidators,
  eventIdParamValidator,
} from '../validators/registration.validators';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/registrations/order
 * Body: { studentName, studentEmail, eventId }
 * Creates a Razorpay order + PENDING registration. Returns order details for
 * the Razorpay checkout SDK on the frontend.
 */
router.post('/order', createOrderValidators, validate, createOrder);

/**
 * POST /api/registrations/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies payment signature, marks registration SUCCESS, sends email.
 */
router.post('/verify', verifyPaymentValidators, validate, verifyPayment);

/**
 * POST /api/registrations/cancel
 * Body: { registrationId }
 * Called by the frontend when Razorpay modal is dismissed — marks PENDING → FAILED.
 */
router.post('/cancel', cancelRegistration);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/registrations?page=1&limit=20&status=SUCCESS
 * Returns paginated list of all registrations with event details.
 */
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  listRegistrationsValidators,
  validate,
  listRegistrations,
);

/**
 * GET /api/registrations/event/:eventId
 * Returns all registrations for a specific event.
 */
router.get(
  '/event/:eventId',
  authenticate,
  authorize(Role.ADMIN),
  eventIdParamValidator,
  validate,
  listRegistrationsByEvent,
);

/**
 * GET /api/registrations/:id
 * Returns a single registration by ID.
 */
router.get('/:id', authenticate, authorize(Role.ADMIN), getRegistrationById);

/**
 * PATCH /api/registrations/:id/status
 * Body: { status: 'PENDING' | 'SUCCESS' | 'FAILED' }
 * Manually override a registration's status (admin override).
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.ADMIN),
  updateRegistrationStatus,
);

export default router;
