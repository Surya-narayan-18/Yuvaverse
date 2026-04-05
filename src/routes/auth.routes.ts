import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { registerValidators, loginValidators } from '../validators/auth.validators';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Body: { name, email, password, adminSecret? }
 */
router.post('/register', registerValidators, validate, register);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post('/login', loginValidators, validate, login);

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Returns the currently authenticated user's profile.
 */
router.get('/me', authenticate, getMe);

export default router;
