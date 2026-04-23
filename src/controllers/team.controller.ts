import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import razorpay from '../config/razorpay';
import { sendSuccess, sendError } from '../utils/response';
import { sendTeamRegistrationEmail } from '../mailers/team.mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TeamMemberInput {
  name: string;
  email: string;
}

interface CreateTeamOrderBody {
  eventId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  members: TeamMemberInput[]; // includes the leader as first member
}

interface VerifyTeamPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teams/order
// Validates team data, checks capacity, creates Razorpay order + PENDING team.
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeamOrder(req: Request, res: Response): Promise<void> {
  const { eventId, teamName, leaderName, leaderEmail, leaderPhone, members } =
    req.body as CreateTeamOrderBody;

  // 1. Fetch event
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    sendError(res, 'Event not found.', 404);
    return;
  }

  // 2. Ensure it is a team event
  if (event.maxTeamSize <= 1) {
    sendError(res, 'This event does not support team registration.', 400);
    return;
  }

  // 3. Deadline check — event date must be in the future
  if (new Date(event.date) < new Date()) {
    sendError(res, 'This event has already passed.', 400);
    return;
  }

  // 4. Capacity check
  if (event.maxRegistrations !== null && event.currentRegistrations >= event.maxRegistrations) {
    sendError(res, 'This event is fully booked.', 409);
    return;
  }

  // 5. Team size check
  const totalMembers = Array.isArray(members) ? members.length : 0;
  if (totalMembers < 1) {
    sendError(res, 'At least one team member is required.', 400);
    return;
  }
  if (totalMembers > event.maxTeamSize) {
    sendError(
      res,
      `Team size exceeds the maximum of ${event.maxTeamSize} members.`,
      400,
    );
    return;
  }

  // 6. Duplicate team leader check (one registration per email per event)
  const duplicateTeam = await prisma.team.findFirst({
    where: { eventId, leaderEmail, status: 'SUCCESS' },
  });
  if (duplicateTeam) {
    sendError(res, 'A team with this leader email is already registered for this event.', 409);
    return;
  }

  // ── FREE EVENT ─────────────────────────────────────────────────────────────
  if (event.price === 0) {
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          eventId,
          teamName,
          leaderName,
          leaderEmail,
          leaderPhone,
          memberCount: totalMembers,
          status: 'SUCCESS',
          members: {
            create: members.map((m) => ({ name: m.name, email: m.email })),
          },
        },
        include: { members: true },
      });

      // Increment team registration count by 1 (teams, not members)
      await tx.event.update({
        where: { id: eventId },
        data: { currentRegistrations: { increment: 1 } },
      });

      return newTeam;
    });

    // Fire confirmation email asynchronously
    sendTeamRegistrationEmail({
      leaderName,
      leaderEmail,
      teamName,
      eventTitle: event.title,
      eventDate: event.date,
      eventVenue: event.venue,
      eventPrice: 0,
      razorpayPaymentId: null,
      teamId: team.id,
      members: team.members,
    }).catch((err: unknown) =>
      console.error('[TeamMailer] Failed to send free-event team confirmation:', err),
    );

    sendSuccess(res, { team, isFreeEvent: true }, 'Team registered successfully!', 201);
    return;
  }

  // ── PAID EVENT ─────────────────────────────────────────────────────────────
  const amountInPaise = Math.round(event.price * 100);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `team_rcpt_${Date.now()}`,
    notes: {
      eventId,
      leaderEmail,
      eventTitle: event.title,
      teamName,
    },
  });

  // Create PENDING team record with all members stored
  const team = await prisma.team.create({
    data: {
      eventId,
      teamName,
      leaderName,
      leaderEmail,
      leaderPhone,
      memberCount: totalMembers,
      status: 'PENDING',
      razorpayOrderId: razorpayOrder.id,
      members: {
        create: members.map((m) => ({ name: m.name, email: m.email })),
      },
    },
    include: { members: true },
  });

  sendSuccess(
    res,
    {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      teamId: team.id,
      eventTitle: event.title,
      leaderName,
      leaderEmail,
    },
    'Order created. Proceed to payment.',
    201,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teams/verify
// Verifies Razorpay signature, marks team SUCCESS, increments event counter,
// sends confirmation email to team leader.
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyTeamPayment(req: Request, res: Response): Promise<void> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body as VerifyTeamPaymentBody;

  // 1. Verify HMAC-SHA256 signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    sendError(res, 'Payment verification failed. Invalid signature.', 400);
    return;
  }

  // 2. Find the pending team
  const team = await prisma.team.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    include: { event: true, members: true },
  });

  if (!team) {
    sendError(res, 'Team registration record not found for this order.', 404);
    return;
  }

  // Idempotency guard
  if (team.status === 'SUCCESS') {
    sendSuccess(res, { team }, 'Payment already verified.');
    return;
  }

  // 3. Mark SUCCESS + increment event counter atomically
  const updated = await prisma.$transaction(async (tx) => {
    const updatedTeam = await tx.team.update({
      where: { id: team.id },
      data: { razorpayPaymentId: razorpay_payment_id, status: 'SUCCESS' },
      include: { members: true },
    });

    await tx.event.update({
      where: { id: team.eventId },
      data: { currentRegistrations: { increment: 1 } },
    });

    return updatedTeam;
  });

  // 4. Send confirmation email asynchronously
  sendTeamRegistrationEmail({
    leaderName: updated.leaderName,
    leaderEmail: updated.leaderEmail,
    teamName: updated.teamName,
    eventTitle: team.event.title,
    eventDate: team.event.date,
    eventVenue: team.event.venue,
    eventPrice: team.event.price,
    razorpayPaymentId: razorpay_payment_id,
    teamId: updated.id,
    members: updated.members,
  }).catch((err: unknown) =>
    console.error('[TeamMailer] Failed to send team payment confirmation:', err),
  );

  sendSuccess(res, { team: updated }, 'Payment verified successfully. Confirmation email sent to team leader.');
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/teams  (admin only)
// Returns all team registrations with event and member details.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminTeams(_req: Request, res: Response): Promise<void> {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, date: true, venue: true, price: true } },
      members: true,
    },
  });

  sendSuccess(res, teams);
}
