import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Run after express-validator check() chains.
 * Collects all validation errors and returns a 422 if any exist.
 */
export function validate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg as string,
    }));

    sendError(res, 'Validation failed.', 422, formatted);
    return;
  }

  next();
}
