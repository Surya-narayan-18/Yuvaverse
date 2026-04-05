import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Typed API response helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>[];
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// Standardised response senders
// ─────────────────────────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string>[],
): void {
  const body: ApiError = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Global 404 handler
// ─────────────────────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler (must have 4 params for Express to treat it as one)
// ─────────────────────────────────────────────────────────────────────────────

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[GlobalErrorHandler]', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  sendError(res, err.message ?? 'Internal Server Error', statusCode);
}
