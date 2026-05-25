import { body } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
  body('fullName').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Full name is required'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ min: 7, max: 20 }),
  body('preferredLanguage').optional().isIn(['SI', 'EN']).withMessage('Language must be SI or EN'),
  body('role').optional().isIn(['CUSTOMER', 'SHOP']).withMessage('Role must be CUSTOMER or SHOP'),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
];

export const refreshValidator = [body('refreshToken').isString().notEmpty()];
