import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  adminSecret?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface JwtTokenPayload {
  id: string;
  email: string;
  role: Role;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function signToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '7d',
  });
}

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, adminSecret } = req.body as RegisterBody;

  // Check for existing user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'An account with this email already exists.', 409);
    return;
  }

  // Determine role — only grant ADMIN if the correct secret is provided
  const grantedRole: Role =
    adminSecret && adminSecret === process.env.ADMIN_REGISTRATION_SECRET
      ? Role.ADMIN
      : Role.STUDENT;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: grantedRole },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  sendSuccess(
    res,
    { user: sanitizeUser(user), token },
    'Account created successfully.',
    201,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Generic message to prevent user enumeration
    sendError(res, 'Invalid email or password.', 401);
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    sendError(res, 'Invalid email or password.', 401);
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  sendSuccess(res, { user: sanitizeUser(user), token }, 'Logged in successfully.');
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    sendError(res, 'User not found.', 404);
    return;
  }

  sendSuccess(res, user);
}
