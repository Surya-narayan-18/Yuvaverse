import { body, query, param } from 'express-validator';

export const createEventValidators = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters.'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),

  body('date')
    .notEmpty().withMessage('Date is required.')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date-time string (e.g. 2026-05-15T18:00:00Z)')
    .toDate(),

  body('venue')
    .trim()
    .notEmpty().withMessage('Venue is required.')
    .isLength({ min: 3, max: 300 }).withMessage('Venue must be between 3 and 300 characters.'),

  body('price')
    .notEmpty().withMessage('Price is required.')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number.')
    .toFloat(),

  body('imageUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('imageUrl must be a valid URL.'),
];

export const updateEventValidators = [
  param('id')
    .notEmpty().withMessage('Event ID is required.'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date-time string.')
    .toDate(),

  body('venue')
    .optional()
    .trim()
    .isLength({ min: 3, max: 300 }).withMessage('Venue must be between 3 and 300 characters.'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number.')
    .toFloat(),

  body('imageUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('imageUrl must be a valid URL.'),
];

export const listEventsValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search term too long.'),
];

export const eventIdParamValidator = [
  param('id')
    .notEmpty().withMessage('Event ID is required.'),
];
