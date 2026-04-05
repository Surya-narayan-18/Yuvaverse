import { body, query, param } from 'express-validator';

export const submitApplicationValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^[6-9]\d{9}$/).withMessage('Must be a valid 10-digit Indian mobile number.'),

  body('roleAppliedFor')
    .trim()
    .notEmpty().withMessage('Role applied for is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Role must be between 2 and 100 characters.'),

  body('message')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Message must not exceed 2000 characters.'),

  body('resumeLink')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('Resume link must be a valid URL (Google Drive, LinkedIn, etc.).'),
];

export const listApplicationsValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.')
    .toInt(),

  query('roleAppliedFor')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Role filter too long.'),
];

export const applicationIdParamValidator = [
  param('id').notEmpty().withMessage('Application ID is required.'),
];
