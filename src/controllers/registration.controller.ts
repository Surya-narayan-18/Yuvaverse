import { Request, Response } from 'express';
import crypto from 'crypto';
import { RegistrationStatus } from '@prisma/client';
import prisma from '../config/prisma';
import razorpay from '../config/razorpay';
import { sendSuccess, sendError } from '../utils/response';
import { sendRegistrationConfirmationEmail } from '../mailers/registration.mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateOrderBody {
  studentName: string;
  studentEmail: string;
  eventId: string;
  collegeId: string;
}

interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface ListRegistrationsQuery {
  page?: number;
  limit?: number;
  status?: RegistrationStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/registrations/order
// Creates a Razorpay order and a PENDING registration record.
// For free events (price === 0), skips Razorpay and marks SUCCESS directly.
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrder(req: Request, res: Response): Promise<void> {
  const { studentName, studentEmail, eventId, collegeId } = req.body as CreateOrderBody;

  // 1. Fetch the event
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  // 2. Check for duplicate email registration for this event
  const alreadyRegistered = await prisma.registration.findFirst({
    where: {
      eventId,
      studentEmail,
      status: RegistrationStatus.SUCCESS,
    },
  });
  if (alreadyRegistered) {
    sendError(res, 'This email is already registered for this event.', 409);
    return;
  }

  // 3. Check for duplicate college ID for this event
  const collegeIdTaken = await prisma.registration.findFirst({
    where: {
      eventId,
      collegeId,
      status: RegistrationStatus.SUCCESS,
    },
  });
  if (collegeIdTaken) {
    sendError(res, 'This college ID is already registered for this event.', 409);
    return;
  }

  // ── FREE EVENT ─────────────────────────────────────────────────────────────
  if (event.price === 0) {
    const registration = await prisma.registration.create({
      data: {
        studentName,
        studentEmail,
        collegeId,
        eventId,
        status: RegistrationStatus.SUCCESS,
      },
    });

    // Send confirmation email asynchronously (don't await to keep response fast)
    sendRegistrationConfirmationEmail({
      studentName,
      studentEmail,
      collegeId,
      eventTitle: event.title,
      eventDate: event.date,
      eventVenue: event.venue,
      eventPrice: 0,
      razorpayPaymentId: null,
      registrationId: registration.id,
    }).catch((err: unknown) =>
      console.error('[Mailer] Failed to send free-event confirmation:', err),
    );

    sendSuccess(
      res,
      { registration, isFreeEvent: true },
      'Registered successfully for this free event.',
      201,
    );
    return;
  }

  // ── PAID EVENT ─────────────────────────────────────────────────────────────
  // 3. Create Razorpay order (amount in paise)
  const amountInPaise = Math.round(event.price * 100);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      eventId,
      studentEmail,
      eventTitle: event.title,
    },
  });

  // 4. Persist a PENDING registration tied to this order
  const registration = await prisma.registration.create({
    data: {
      studentName,
      studentEmail,
      collegeId,
      eventId,
      razorpayOrderId: razorpayOrder.id,
      status: RegistrationStatus.PENDING,
    },
  });

  sendSuccess(
    res,
    {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      registrationId: registration.id,
      eventTitle: event.title,
      studentName,
      studentEmail,
    },
    'Order created. Proceed to payment.',
    201,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/registrations/verify
// Verifies Razorpay HMAC signature, marks registration SUCCESS, sends email.
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body as VerifyPaymentBody;

  // 1. Verify HMAC-SHA256 signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    sendError(res, 'Payment verification failed. Invalid signature.', 400);
    return;
  }

  // 2. Find the pending registration for this order
  const registration = await prisma.registration.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    include: { event: true },
  });

  if (!registration) {
    sendError(res, 'Registration record not found for this order.', 404);
    return;
  }

  if (registration.status === RegistrationStatus.SUCCESS) {
    sendSuccess(res, { registration }, 'Payment already verified.');
    return;
  }

  // 3. Update registration to SUCCESS
  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: {
      razorpayPaymentId: razorpay_payment_id,
      status: RegistrationStatus.SUCCESS,
    },
    include: { event: true },
  });

  // 4. Send confirmation email asynchronously
  sendRegistrationConfirmationEmail({
    studentName: updated.studentName,
    studentEmail: updated.studentEmail,
    collegeId: updated.collegeId,
    eventTitle: updated.event.title,
    eventDate: updated.event.date,
    eventVenue: updated.event.venue,
    eventPrice: updated.event.price,
    razorpayPaymentId: razorpay_payment_id,
    registrationId: updated.id,
  }).catch((err: unknown) =>
    console.error('[Mailer] Failed to send payment confirmation:', err),
  );

  sendSuccess(res, { registration: updated }, 'Payment verified successfully. Confirmation email sent.');
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/registrations  (ADMIN only)
// Lists all registrations with event + pagination + optional status filter.
// ─────────────────────────────────────────────────────────────────────────────

export async function listRegistrations(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, status } = req.query as unknown as ListRegistrationsQuery;
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        event: {
          select: { id: true, title: true, date: true, venue: true, price: true },
        },
      },
    }),
    prisma.registration.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    registrations,
    pagination: { total, totalPages, currentPage: page, limit },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/registrations/event/:eventId  (ADMIN only)
// Lists all registrations for a specific event.
// ─────────────────────────────────────────────────────────────────────────────

export async function listRegistrationsByEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const eventId = String(req.params['eventId']);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, {
    event: { id: event.id, title: event.title, date: event.date },
    registrations,
    total: registrations.length,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/registrations/:id  (ADMIN only)
// Returns a single registration with event details.
// ─────────────────────────────────────────────────────────────────────────────

export async function getRegistrationById(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!registration) {
    sendError(res, 'Registration not found.', 404);
    return;
  }

  sendSuccess(res, registration);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/registrations/:id/status  (ADMIN only)
// Manually override a registration status (e.g., mark FAILED as SUCCESS).
// ─────────────────────────────────────────────────────────────────────────────

export async function updateRegistrationStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params['id']);
  const { status } = req.body as { status: RegistrationStatus };

  if (!Object.values(RegistrationStatus).includes(status)) {
    sendError(res, `Invalid status. Must be one of: ${Object.values(RegistrationStatus).join(', ')}.`, 400);
    return;
  }

  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'Registration not found.', 404);
    return;
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: { status },
    include: { event: true },
  });

  sendSuccess(res, updated, `Registration status updated to ${status}.`);
}
