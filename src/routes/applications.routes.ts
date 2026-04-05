import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  submitApplication,
  listApplications,
  getApplicationById,
  deleteApplication,
} from '../controllers/application.controller';
import {
  submitApplicationValidators,
  listApplicationsValidators,
  applicationIdParamValidator,
} from '../validators/application.validators';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Body: { name, email, phone, roleAppliedFor, message?, resumeLink? }
 * Submits a recruitment application and triggers two confirmation emails.
 */
router.post('/', submitApplicationValidators, validate, submitApplication);

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/applications?page=1&limit=20&roleAppliedFor=Designer
 * Paginated list of all applications with optional role filter.
 */
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  listApplicationsValidators,
  validate,
  listApplications,
);

/**
 * GET /api/applications/:id
 * Get a single application by ID.
 */
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  applicationIdParamValidator,
  validate,
  getApplicationById,
);

/**
 * DELETE /api/applications/:id
 * Permanently delete an application record.
 */
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  applicationIdParamValidator,
  validate,
  deleteApplication,
);

export default router;
