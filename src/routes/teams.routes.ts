import { Router } from 'express';
import { createTeamOrder, verifyTeamPayment, cancelTeam } from '../controllers/team.controller';

const router = Router();

/**
 * POST /api/teams/order
 * Body: { eventId, teamName, leaderName, leaderEmail, leaderPhone, members[] }
 * Creates a Razorpay order for the team + PENDING team record.
 * For free events, immediately marks SUCCESS and returns.
 */
router.post('/order', createTeamOrder);

/**
 * POST /api/teams/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies payment, marks team SUCCESS, increments event counter, sends email.
 */
router.post('/verify', verifyTeamPayment);

/**
 * POST /api/teams/cancel
 * Body: { teamId }
 * Called when Razorpay modal is dismissed — marks PENDING team → FAILED.
 */
router.post('/cancel', cancelTeam);

export default router;
