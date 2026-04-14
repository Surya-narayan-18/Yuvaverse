import { query, param } from 'express-validator';



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
