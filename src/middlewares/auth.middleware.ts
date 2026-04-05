import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Extend Express Request to carry the decoded JWT payload
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify JWT and attach user to request
// ─────────────────────────────────────────────────────────────────────────────

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Unauthorized: No token provided.', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload & AuthenticatedUser;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    sendError(res, 'Unauthorized: Invalid or expired token.', 401);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — restrict access to specific roles
// ─────────────────────────────────────────────────────────────────────────────

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized.', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: Insufficient permissions.', 403);
      return;
    }

    next();
  };
}
