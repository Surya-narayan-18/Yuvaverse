import { body, param, query } from 'express-validator';

export const createOrderValidators = [
  body('studentName')
    .trim()
    .notEmpty().withMessage('Student name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('studentEmail')
    .trim()
    .notEmpty().withMessage('Student email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),

  body('eventId')
    .trim()
    .notEmpty().withMessage('Event ID is required.'),
];

export const verifyPaymentValidators = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('razorpay_order_id is required.'),

  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('razorpay_payment_id is required.'),

  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('razorpay_signature is required.'),
];

export const listRegistrationsValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.')
    .toInt(),

  query('status')
    .optional()
    .isIn(['PENDING', 'SUCCESS', 'FAILED']).withMessage('Status must be PENDING, SUCCESS, or FAILED.'),
];

export const eventIdParamValidator = [
  param('eventId')
    .trim()
    .notEmpty().withMessage('Event ID param is required.'),
];
